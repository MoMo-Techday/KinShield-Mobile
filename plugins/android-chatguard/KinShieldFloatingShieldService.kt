package click.kinshield.mobile.chatguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Toast
import androidx.core.app.NotificationCompat
import kotlin.math.abs

class KinShieldFloatingShieldService : Service() {
    companion object {
        private const val CHANNEL_ID = "kinshield_floating_shield"
        private const val CHANNEL_NAME = "Nút Khiên Soi Nhanh"
        private const val NOTIFICATION_ID = 41021
    }

    private var windowManager: WindowManager? = null
    private var bubbleView: View? = null
    private var layoutParams: WindowManager.LayoutParams? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private val restoreReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            if (intent?.action == KinShieldChatGuardStore.ACTION_RESTORE_BUBBLE) {
                bubbleView?.visibility = View.VISIBLE
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }

        startOverlayForeground()
        registerRestoreReceiver()
        attachFloatingBubble()
        KinShieldChatGuardStore.isFloatingActive = true
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        bubbleView?.visibility = View.VISIBLE
        return START_STICKY
    }

    override fun onDestroy() {
        KinShieldChatGuardStore.isFloatingActive = false
        mainHandler.removeCallbacksAndMessages(null)
        try {
            unregisterReceiver(restoreReceiver)
        } catch (_: Exception) {
        }
        try {
            bubbleView?.let { windowManager?.removeView(it) }
        } catch (_: Exception) {
        }
        bubbleView = null
        super.onDestroy()
    }

    private fun startOverlayForeground() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW,
            ).apply {
                description = "Giữ nút Khiên nổi để soi ảnh Zalo hoặc mã QR chỉ với 1 chạm"
            }
            manager.createNotificationChannel(channel)
        }

        val openAppIntent = Intent(Intent.ACTION_VIEW, Uri.parse("kinshield://xray")).apply {
            setPackage(packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        val pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT or
            (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0)
        val pendingIntent = PendingIntent.getActivity(this, NOTIFICATION_ID, openAppIntent, pendingFlags)

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle("KinShield • Nút Khiên Soi Nhanh đang bật")
            .setContentText("Chạm nút Khiên nổi bên mép màn hình để soi ảnh Zalo hoặc mã QR ngay.")
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun registerRestoreReceiver() {
        val filter = IntentFilter(KinShieldChatGuardStore.ACTION_RESTORE_BUBBLE)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(restoreReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            registerReceiver(restoreReceiver, filter)
        }
    }

    private fun attachFloatingBubble() {
        val wm = getSystemService(Context.WINDOW_SERVICE) as WindowManager
        windowManager = wm

        val density = resources.displayMetrics.density
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels

        val bubbleSize = (54 * density).toInt()
        val iconPad = (9 * density).toInt()

        val container = FrameLayout(this).apply {
            setPadding(iconPad, iconPad, iconPad, iconPad)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.WHITE)
                setStroke((2f * density).toInt(), Color.parseColor("#C82775"))
            }
            elevation = 10 * density
        }

        val logoResId = resources.getIdentifier("kinshield_floating_logo", "drawable", packageName)
        val iconView = ImageView(this).apply {
            if (logoResId != 0) {
                setImageResource(logoResId)
            } else {
                setImageDrawable(packageManager.getApplicationIcon(packageName))
            }
            scaleType = ImageView.ScaleType.FIT_CENTER
            contentDescription = "KinShield Soi nhanh AI"
        }
        container.addView(
            iconView,
            FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT,
                Gravity.CENTER,
            ),
        )

        val overlayType = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        }

        val params = WindowManager.LayoutParams(
            bubbleSize,
            bubbleSize,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = screenWidth - bubbleSize - (8 * density).toInt()
            y = (screenHeight * 0.42f).toInt()
        }
        layoutParams = params

        var initialX = 0
        var initialY = 0
        var initialTouchX = 0f
        var initialTouchY = 0f
        var moved = false
        var downTime = 0L

        container.setOnTouchListener { view, event ->
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    initialX = params.x
                    initialY = params.y
                    initialTouchX = event.rawX
                    initialTouchY = event.rawY
                    moved = false
                    downTime = System.currentTimeMillis()
                    true
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = (event.rawX - initialTouchX).toInt()
                    val dy = (event.rawY - initialTouchY).toInt()
                    if (abs(dx) > 10 || abs(dy) > 10) {
                        moved = true
                    }
                    params.x = (initialX + dx).coerceIn(0, screenWidth - view.width.coerceAtLeast(1))
                    params.y = (initialY + dy).coerceIn((36 * density).toInt(), screenHeight - (100 * density).toInt())
                    try {
                        wm.updateViewLayout(view, params)
                    } catch (_: Exception) {
                    }
                    true
                }
                MotionEvent.ACTION_UP -> {
                    val pressDuration = System.currentTimeMillis() - downTime
                    if (!moved) {
                        if (pressDuration >= 650) {
                            Toast.makeText(
                                this@KinShieldFloatingShieldService,
                                "Mở KinShield -> Bảo vệ để tắt Nút Khiên nổi",
                                Toast.LENGTH_SHORT,
                            ).show()
                        } else {
                            triggerCaptureFromBubble()
                        }
                    } else {
                        val snapRight = params.x + view.width / 2 >= screenWidth / 2
                        params.x = if (snapRight) {
                            (screenWidth - view.width - (8 * density).toInt()).coerceAtLeast(0)
                        } else {
                            (8 * density).toInt()
                        }
                        try {
                            wm.updateViewLayout(view, params)
                        } catch (_: Exception) {
                        }
                    }
                    true
                }
                else -> false
            }
        }

        bubbleView = container
        wm.addView(container, params)
    }

    private fun triggerCaptureFromBubble() {
        bubbleView?.visibility = View.GONE
        val captureIntent = Intent(this, KinShieldScreenCaptureActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        }
        startActivity(captureIntent)

        // An toàn: nếu người dùng bấm Hủy hoặc thoát giữa chừng, tự hiện lại nút Khiên sau 4 giây.
        mainHandler.postDelayed({
            bubbleView?.visibility = View.VISIBLE
        }, 4_000L)
    }
}
