package click.kinshield.mobile.chatguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat

class KinShieldNotificationListener : NotificationListenerService() {
    companion object {
        private const val ALERT_CHANNEL_ID = "kinshield_chat_scam_alerts"
        private const val ALERT_CHANNEL_NAME = "Cảnh báo tin nhắn lừa đảo"

        private val MONITORED_APPS = mapOf(
            "com.zing.zalo" to "Zalo",
            "com.facebook.orca" to "Messenger",
            "com.google.android.apps.messaging" to "Tin nhắn SMS",
            "com.samsung.android.messaging" to "Tin nhắn SMS",
            "com.android.mms" to "Tin nhắn SMS",
            "org.telegram.messenger" to "Telegram",
            "com.viber.voip" to "Viber",
            "com.whatsapp" to "WhatsApp",
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val pkg = sbn.packageName ?: return
        val appName = MONITORED_APPS[pkg] ?: return

        val notification = sbn.notification ?: return
        val extras = notification.extras ?: return

        val sender = extractSender(extras, appName)
        val body = extractMessageBody(extras)
        if (body.length < 4) return

        val combined = if (sender.isNotEmpty()) "$sender: $body" else body
        val nowMs = System.currentTimeMillis()
        if (KinShieldChatGuardStore.isDuplicate(pkg, sender, body, nowMs)) return

        // Tầng 1 chạy hoàn toàn offline trên máy (< 2ms): tin nhắn thường bị bỏ qua, không gửi đi đâu.
        val reasons = KinShieldChatGuardStore.inspectChatMessage(combined)
        if (reasons.isEmpty()) return

        val record = KinShieldChatGuardStore.recordAndEmitAlert(
            appName = appName,
            sender = sender.ifEmpty { appName },
            text = body,
            reasons = reasons,
            nowMs = nowMs,
        )

        showHeadsUpWarning(record)
    }

    private fun extractSender(extras: Bundle, fallback: String): String {
        val convTitle = extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()?.trim().orEmpty()
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim().orEmpty()
        if (title.isNotEmpty()) return title
        if (convTitle.isNotEmpty()) return convTitle
        return fallback
    }

    private fun extractMessageBody(extras: Bundle): String {
        val candidates = mutableListOf<String>()

        // 1. MessagingStyle (Zalo / Messenger / SMS đời mới Android 12-15 lưu tin nhắn ở EXTRA_MESSAGES)
        @Suppress("DEPRECATION")
        val rawMessages = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
        if (rawMessages != null && rawMessages.isNotEmpty()) {
            val messageTexts = rawMessages.mapNotNull { item ->
                (item as? Bundle)?.getCharSequence("text")?.toString()?.trim()
            }.filter { it.isNotEmpty() }
            if (messageTexts.isNotEmpty()) {
                candidates.add(messageTexts.takeLast(3).joinToString(" "))
            }
        }

        // 2. InboxStyle (nhiều tin nhắn gộp dòng trên Samsung/Zalo)
        val textLines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        if (textLines != null && textLines.isNotEmpty()) {
            val joined = textLines.mapNotNull { it?.toString()?.trim() }
                .filter { it.isNotEmpty() }
                .takeLast(3)
                .joinToString(" ")
            if (joined.isNotEmpty()) candidates.add(joined)
        }

        // 3. BigText / Standard Text
        extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim()
            ?.takeIf { it.isNotEmpty() }?.let { candidates.add(it) }
        extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim()
            ?.takeIf { it.isNotEmpty() }?.let { candidates.add(it) }

        return candidates.maxByOrNull { it.length }.orEmpty()
    }

    private fun showHeadsUpWarning(record: ChatAlertRecord) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                ALERT_CHANNEL_ID,
                ALERT_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Cảnh báo ngay khi phát hiện tin nhắn Zalo/SMS có dấu hiệu lừa đảo"
                enableVibration(true)
            }
            manager.createNotificationChannel(channel)
        }

        val deepLink = Uri.Builder()
            .scheme("kinshield")
            .authority("xray")
            .appendQueryParameter("autoScan", "1")
            .appendQueryParameter("source", record.appName)
            .appendQueryParameter("sender", record.sender)
            .appendQueryParameter("text", record.text.take(900))
            .build()

        val openIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
            setPackage(packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }

        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        val pendingIntent = PendingIntent.getActivity(
            this,
            record.id.hashCode(),
            openIntent,
            pendingFlags,
        )

        val reasonText = record.reasons.firstOrNull() ?: "Phát hiện dấu hiệu lừa đảo"
        val alertNotification = NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle("Cảnh báo lừa đảo trên ${record.appName}")
            .setContentText("$reasonText • Chạm để KinShield AI soi ngay")
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "$reasonText.\nNgười gửi: ${record.sender}\nChạm để mở Soi 1 chạm X-Ray kiểm tra bằng AI."
                )
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .build()

        manager.notify(record.id.hashCode(), alertNotification)
    }
}
