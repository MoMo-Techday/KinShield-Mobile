package click.kinshield.mobile.chatguard

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class KinShieldChatGuardModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    init {
        KinShieldChatGuardStore.attachReactContext(reactContext)
    }

    override fun getName(): String = "KinShieldChatGuard"

    @ReactMethod
    fun getStatus(promise: Promise) {
        val map = Arguments.createMap().apply {
            putBoolean("supported", true)
            putBoolean("notificationAccessGranted", isNotificationListenerEnabled())
            putBoolean("overlayPermissionGranted", canDrawOverlay())
            putBoolean("postNotificationsGranted", hasPostNotificationsPermission())
            putBoolean("floatingActive", KinShieldChatGuardStore.isFloatingActive)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun openNotificationAccessSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("OPEN_NOTIFICATION_SETTINGS_FAILED", err)
        }
    }

    @ReactMethod
    fun openOverlaySettings(promise: Promise) {
        try {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${reactContext.packageName}"),
                )
            } else {
                Intent(Settings.ACTION_SETTINGS)
            }.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("OPEN_OVERLAY_SETTINGS_FAILED", err)
        }
    }

    @ReactMethod
    fun startFloatingShield(promise: Promise) {
        if (!canDrawOverlay()) {
            promise.resolve(false)
            return
        }
        try {
            val serviceIntent = Intent(reactContext, KinShieldFloatingShieldService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(serviceIntent)
            } else {
                reactContext.startService(serviceIntent)
            }
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("START_FLOATING_SHIELD_FAILED", err)
        }
    }

    @ReactMethod
    fun stopFloatingShield(promise: Promise) {
        try {
            val serviceIntent = Intent(reactContext, KinShieldFloatingShieldService::class.java)
            reactContext.stopService(serviceIntent)
            KinShieldChatGuardStore.isFloatingActive = false
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("STOP_FLOATING_SHIELD_FAILED", err)
        }
    }

    @ReactMethod
    fun triggerQuickScreenScan(promise: Promise) {
        try {
            val intent = Intent(reactContext, KinShieldScreenCaptureActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            }
            reactContext.startActivity(intent)
            promise.resolve(true)
        } catch (err: Exception) {
            promise.reject("TRIGGER_SCREEN_SCAN_FAILED", err)
        }
    }

    @ReactMethod
    fun getRecentAlerts(promise: Promise) {
        val arr = Arguments.createArray()
        KinShieldChatGuardStore.getRecentAlertsSnapshot().forEach { record ->
            val item = Arguments.createMap().apply {
                putString("id", record.id)
                putString("appName", record.appName)
                putString("sender", record.sender)
                putString("text", record.text)
                putDouble("detectedAtMs", record.detectedAtMs.toDouble())
                val reasonsArr = Arguments.createArray()
                record.reasons.forEach { reasonsArr.pushString(it) }
                putArray("reasons", reasonsArr)
            }
            arr.pushMap(item)
        }
        promise.resolve(arr)
    }

    @ReactMethod
    fun clearRecentAlerts(promise: Promise) {
        KinShieldChatGuardStore.clearRecentAlerts()
        promise.resolve(true)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for React Native NativeEventEmitter compatibility.
    }

    @ReactMethod
    fun removeListeners(count: Double) {
        // Required for React Native NativeEventEmitter compatibility.
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val flat = Settings.Secure.getString(
            reactContext.contentResolver,
            "enabled_notification_listeners",
        ) ?: return false
        val expected = ComponentName(
            reactContext,
            KinShieldNotificationListener::class.java,
        ).flattenToString()
        return flat.split(':').any { entry ->
            entry.equals(expected, ignoreCase = true) ||
                entry.contains("${reactContext.packageName}/")
        }
    }

    private fun canDrawOverlay(): Boolean {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M ||
            Settings.canDrawOverlays(reactContext)
    }

    private fun hasPostNotificationsPermission(): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }
}
