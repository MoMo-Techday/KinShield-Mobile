package click.kinshield.mobile.chatguard

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle

class KinShieldScreenCaptureActivity : Activity() {
    companion object {
        private const val REQUEST_MEDIA_PROJECTION = 41099
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as? MediaProjectionManager
        if (manager == null) {
            restoreBubbleAndFinish()
            return
        }
        @Suppress("DEPRECATION")
        startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION)
    }

    @Suppress("DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_MEDIA_PROJECTION && resultCode == RESULT_OK && data != null) {
            val serviceIntent = Intent(this, KinShieldScreenCaptureService::class.java).apply {
                putExtra(KinShieldScreenCaptureService.EXTRA_RESULT_CODE, resultCode)
                putExtra(KinShieldScreenCaptureService.EXTRA_RESULT_DATA, data)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
            finish()
            overridePendingTransition(0, 0)
            return
        }

        restoreBubbleAndFinish()
    }

    private fun restoreBubbleAndFinish() {
        sendBroadcast(
            Intent(KinShieldChatGuardStore.ACTION_RESTORE_BUBBLE).apply {
                setPackage(packageName)
            }
        )
        finish()
        overridePendingTransition(0, 0)
    }
}
