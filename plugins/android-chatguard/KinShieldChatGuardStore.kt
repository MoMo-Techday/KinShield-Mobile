package click.kinshield.mobile.chatguard

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.lang.ref.WeakReference
import java.text.Normalizer

data class ChatAlertRecord(
    val id: String,
    val appName: String,
    val sender: String,
    val text: String,
    val reasons: List<String>,
    val detectedAtMs: Long,
)

object KinShieldChatGuardStore {
    const val EVENT_CHAT_ALERT = "KinShieldChatAlert"
    const val ACTION_RESTORE_BUBBLE = "click.kinshield.mobile.chatguard.RESTORE_BUBBLE"

    private const val MAX_ALERTS = 15
    private const val DEDUP_WINDOW_MS = 15_000L

    @Volatile
    var isFloatingActive: Boolean = false

    @Volatile
    private var reactContextRef: WeakReference<ReactApplicationContext>? = null

    private val lock = Any()
    private val recentAlerts = ArrayDeque<ChatAlertRecord>()
    private val lastFingerprints = LinkedHashMap<String, Long>()

    private val combiningMarksRegex = Regex("\\p{InCombiningDiacriticalMarks}+")
    private val apkOrVneidRegex = Regex("(\\.apk\\b|dichvucong|vneid|cap nhat dinh danh)")
    private val otpRegex = Regex("(\\botp\\b|ma xac thuc|mat khau|ma pin|6 so|chia se man hinh)")
    private val suspiciousDomainRegex = Regex("(\\.(xyz|top|tk|vip|buzz|icu)\\b|m0mo|evn-|vneid-|hoantien|nhantien|trungthuong)")
    private val vietQrRegex = Regex("000201\\d{10,}")
    private val authorityRegex = Regex("(cong an|canh sat|vien kiem sat|toa an|bo cong an|dien luc|\\bevn\\b|cat dien|shipper|khoa tai khoan)")
    private val pressureMoneyRegex = Regex("(chuyen khoan|chuyen tien|tam giu|no tien|2 gio|15 phut|30 phut|khan cap|http://|https://|bam link|nhan link|tai khoan ca nhan)")

    fun attachReactContext(context: ReactApplicationContext) {
        reactContextRef = WeakReference(context)
    }

    fun normalizeVietnamese(raw: String): String {
        val decomposed = Normalizer.normalize(raw.lowercase(), Normalizer.Form.NFD)
        return combiningMarksRegex.replace(decomposed, "").replace('đ', 'd')
    }

    fun inspectChatMessage(rawText: String): List<String> {
        val norm = normalizeVietnamese(rawText)
        val reasons = mutableListOf<String>()

        if (apkOrVneidRegex.containsMatchIn(norm)) {
            reasons.add("Nghi tệp cài đặt .apk hoặc giả mạo VNeID")
        }
        if (otpRegex.containsMatchIn(norm)) {
            reasons.add("Có dấu hiệu yêu cầu mã OTP hoặc mật khẩu")
        }
        if (suspiciousDomainRegex.containsMatchIn(norm)) {
            reasons.add("Đường dẫn hoặc tên miền lạ có dấu hiệu giả mạo")
        }
        if (vietQrRegex.containsMatchIn(norm)) {
            reasons.add("Phát hiện chuỗi mã thanh toán VietQR cần kiểm tra")
        }
        if (authorityRegex.containsMatchIn(norm) && pressureMoneyRegex.containsMatchIn(norm)) {
            reasons.add("Nghi giả danh cơ quan/dịch vụ gây áp lực chuyển tiền")
        }

        return reasons.distinct()
    }

    fun isDuplicate(packageName: String, sender: String, text: String, nowMs: Long): Boolean {
        val fingerprint = "$packageName|$sender|${text.take(160)}"
        synchronized(lock) {
            val iterator = lastFingerprints.entries.iterator()
            while (iterator.hasNext()) {
                val entry = iterator.next()
                if (nowMs - entry.value > DEDUP_WINDOW_MS) {
                    iterator.remove()
                }
            }
            val prev = lastFingerprints[fingerprint]
            if (prev != null && nowMs - prev <= DEDUP_WINDOW_MS) {
                return true
            }
            lastFingerprints[fingerprint] = nowMs
            return false
        }
    }

    fun recordAndEmitAlert(
        appName: String,
        sender: String,
        text: String,
        reasons: List<String>,
        nowMs: Long = System.currentTimeMillis(),
    ): ChatAlertRecord {
        val record = ChatAlertRecord(
            id = "chat_${nowMs}_${text.hashCode().toUInt()}",
            appName = appName,
            sender = sender,
            text = text.take(1200),
            reasons = reasons,
            detectedAtMs = nowMs,
        )

        synchronized(lock) {
            if (recentAlerts.size >= MAX_ALERTS) {
                recentAlerts.removeFirst()
            }
            recentAlerts.addLast(record)
        }

        val ctx = reactContextRef?.get()
        if (ctx != null && ctx.hasActiveReactInstance()) {
            try {
                val map = Arguments.createMap().apply {
                    putString("id", record.id)
                    putString("appName", record.appName)
                    putString("sender", record.sender)
                    putString("text", record.text)
                    putDouble("detectedAtMs", record.detectedAtMs.toDouble())
                    val arr = Arguments.createArray()
                    record.reasons.forEach { arr.pushString(it) }
                    putArray("reasons", arr)
                }
                ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_CHAT_ALERT, map)
            } catch (_: Exception) {
                // Ignore transient JS bridge detachment; alert remains buffered in recentAlerts.
            }
        }

        return record
    }

    fun getRecentAlertsSnapshot(): List<ChatAlertRecord> {
        synchronized(lock) {
            return recentAlerts.toList().reversed()
        }
    }

    fun clearRecentAlerts() {
        synchronized(lock) {
            recentAlerts.clear()
        }
    }
}
