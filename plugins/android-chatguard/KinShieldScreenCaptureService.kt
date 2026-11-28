package click.kinshield.mobile.chatguard

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicBoolean

class KinShieldScreenCaptureService : Service() {
    companion object {
        const val EXTRA_RESULT_CODE = "result_code"
        const val EXTRA_RESULT_DATA = "result_data"
        private const val CHANNEL_ID = "kinshield_screen_capture"
        private const val CHANNEL_NAME = "Chụp nhanh màn hình soi X-Ray"
        private const val NOTIFICATION_ID = 41022
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var mediaProjection: MediaProjection? = null
    private var virtualDisplay: VirtualDisplay? = null
    private var imageReader: ImageReader? = null
    private val captured = AtomicBoolean(false)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startCaptureForeground()

        val resultCode = intent?.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
            ?: Activity.RESULT_CANCELED
        val resultData: Intent? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent?.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent?.getParcelableExtra(EXTRA_RESULT_DATA)
        }

        if (resultCode != Activity.RESULT_OK || resultData == null) {
            finishCapture(null)
            return START_NOT_STICKY
        }

        // Chờ 280ms để hộp thoại xác nhận Android ẩn hẳn trước khi chụp màn hình Zalo/bill.
        mainHandler.postDelayed({
            captureSingleFrame(resultCode, resultData)
        }, 280L)

        // Timeout dự phòng 4 giây để không bao giờ kẹt MediaProjection.
        mainHandler.postDelayed({
            if (captured.compareAndSet(false, true)) {
                finishCapture(null)
            }
        }, 4_000L)

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        releaseProjectionResources()
        mainHandler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    private fun startCaptureForeground() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW,
            )
            manager.createNotificationChannel(channel)
        }

        val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(applicationInfo.icon)
            .setContentTitle("KinShield đang chụp nhanh màn hình để soi AI...")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun captureSingleFrame(resultCode: Int, resultData: Intent) {
        try {
            val projectionManager =
                getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
            val projection = projectionManager.getMediaProjection(resultCode, resultData)
            if (projection == null) {
                finishCapture(null)
                return
            }
            mediaProjection = projection

            val metrics = resources.displayMetrics
            val rawWidth = metrics.widthPixels.coerceAtLeast(360)
            val rawHeight = metrics.heightPixels.coerceAtLeast(640)
            val scale = if (rawWidth > 1080) 1080f / rawWidth.toFloat() else 1f
            val targetWidth = (rawWidth * scale).toInt().coerceAtLeast(360)
            val targetHeight = (rawHeight * scale).toInt().coerceAtLeast(640)
            val densityDpi = metrics.densityDpi

            projection.registerCallback(
                object : MediaProjection.Callback() {
                    override fun onStop() {
                        releaseProjectionResources()
                    }
                },
                mainHandler,
            )

            val reader = ImageReader.newInstance(
                targetWidth,
                targetHeight,
                PixelFormat.RGBA_8888,
                2,
            )
            imageReader = reader

            reader.setOnImageAvailableListener(
                { currentReader ->
                    if (!captured.compareAndSet(false, true)) return@setOnImageAvailableListener
                    val image = currentReader.acquireLatestImage()
                    if (image == null) {
                        captured.set(false)
                        return@setOnImageAvailableListener
                    }

                    var outputPath: String? = null
                    try {
                        val plane = image.planes[0]
                        val buffer = plane.buffer
                        val pixelStride = plane.pixelStride
                        val rowStride = plane.rowStride
                        val rowPadding = rowStride - pixelStride * targetWidth

                        val paddedBitmap = Bitmap.createBitmap(
                            targetWidth + rowPadding / pixelStride,
                            targetHeight,
                            Bitmap.Config.ARGB_8888,
                        )
                        paddedBitmap.copyPixelsFromBuffer(buffer)
                        val croppedBitmap = Bitmap.createBitmap(
                            paddedBitmap,
                            0,
                            0,
                            targetWidth,
                            targetHeight,
                        )
                        if (croppedBitmap != paddedBitmap) {
                            paddedBitmap.recycle()
                        }

                        val outFile = File(
                            cacheDir,
                            "kinshield_capture_${System.currentTimeMillis()}.jpg",
                        )
                        FileOutputStream(outFile).use { stream ->
                            croppedBitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                        }
                        croppedBitmap.recycle()
                        outputPath = outFile.absolutePath
                    } catch (_: Exception) {
                        outputPath = null
                    } finally {
                        image.close()
                    }

                    finishCapture(outputPath)
                },
                mainHandler,
            )

            virtualDisplay = projection.createVirtualDisplay(
                "KinShieldXRayCapture",
                targetWidth,
                targetHeight,
                densityDpi,
                DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
                reader.surface,
                null,
                mainHandler,
            )
        } catch (_: Exception) {
            finishCapture(null)
        }
    }

    private fun releaseProjectionResources() {
        try {
            virtualDisplay?.release()
        } catch (_: Exception) {
        }
        virtualDisplay = null

        try {
            imageReader?.setOnImageAvailableListener(null, null)
            imageReader?.close()
        } catch (_: Exception) {
        }
        imageReader = null

        try {
            mediaProjection?.stop()
        } catch (_: Exception) {
        }
        mediaProjection = null
    }

    private fun finishCapture(imagePath: String?) {
        releaseProjectionResources()
        sendBroadcast(
            Intent(KinShieldChatGuardStore.ACTION_RESTORE_BUBBLE).apply {
                setPackage(packageName)
            }
        )

        if (!imagePath.isNullOrBlank()) {
            val deepLink = Uri.Builder()
                .scheme("kinshield")
                .authority("xray")
                .appendQueryParameter("autoScan", "1")
                .appendQueryParameter("source", "Màn hình vừa chụp")
                .appendQueryParameter("capturePath", imagePath)
                .build()

            val openIntent = Intent(Intent.ACTION_VIEW, deepLink).apply {
                setPackage(packageName)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            }
            startActivity(openIntent)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }
}
