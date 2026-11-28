// Cầu nối native Android cho NotificationListener (Zalo/SMS) và Nút Khiên nổi 1 chạm.
import {
    NativeEventEmitter,
    NativeModules,
    PermissionsAndroid,
    Platform,
    type EmitterSubscription,
} from 'react-native';

export interface ChatGuardStatus {
    supported: boolean;
    notificationAccessGranted: boolean;
    overlayPermissionGranted: boolean;
    postNotificationsGranted: boolean;
    floatingActive: boolean;
}

export interface IncomingChatAlert {
    id: string;
    appName: string;
    sender: string;
    text: string;
    reasons: string[];
    detectedAtMs: number;
}

interface NativeChatGuardModule {
    getStatus: () => Promise<ChatGuardStatus>;
    openNotificationAccessSettings: () => Promise<boolean>;
    openOverlaySettings: () => Promise<boolean>;
    startFloatingShield: () => Promise<boolean>;
    stopFloatingShield: () => Promise<boolean>;
    triggerQuickScreenScan: () => Promise<boolean>;
    getRecentAlerts: () => Promise<IncomingChatAlert[]>;
    clearRecentAlerts: () => Promise<boolean>;
    addListener: (eventName: string) => void;
    removeListeners: (count: number) => void;
}

const UNSUPPORTED_STATUS: ChatGuardStatus = {
    supported: false,
    notificationAccessGranted: false,
    overlayPermissionGranted: false,
    postNotificationsGranted: false,
    floatingActive: false,
};

const EVENT_CHAT_ALERT = 'KinShieldChatAlert';

function getNativeModule(): NativeChatGuardModule | null {
    if (Platform.OS !== 'android') return null;
    const mod = (
        NativeModules as { KinShieldChatGuard?: NativeChatGuardModule }
    ).KinShieldChatGuard;
    return mod ?? null;
}

export async function getChatGuardStatus(): Promise<ChatGuardStatus> {
    const mod = getNativeModule();
    if (!mod) return UNSUPPORTED_STATUS;
    try {
        return await mod.getStatus();
    } catch {
        return UNSUPPORTED_STATUS;
    }
}

async function requestAndroidNotificationPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    if (typeof Platform.Version === 'number' && Platform.Version < 33) {
        return true;
    }
    try {
        const result = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch {
        return false;
    }
}

export async function openNotificationAccessSettings(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    await requestAndroidNotificationPermission();
    return mod.openNotificationAccessSettings();
}

export async function openOverlaySettings(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    return mod.openOverlaySettings();
}

export async function startFloatingShield(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    await requestAndroidNotificationPermission();
    return mod.startFloatingShield();
}

export async function stopFloatingShield(): Promise<boolean> {
    const mod = getNativeModule();
    if (!mod) return false;
    return mod.stopFloatingShield();
}

export async function getRecentChatAlerts(): Promise<IncomingChatAlert[]> {
    const mod = getNativeModule();
    if (!mod) return [];
    try {
        return await mod.getRecentAlerts();
    } catch {
        return [];
    }
}

export function subscribeChatGuardAlerts(
    listener: (alert: IncomingChatAlert) => void,
): () => void {
    const mod = getNativeModule();
    if (!mod) return () => undefined;

    const emitter = new NativeEventEmitter(mod);
    const subscription: EmitterSubscription = emitter.addListener(
        EVENT_CHAT_ALERT,
        (event: unknown) => {
            if (event && typeof event === 'object') {
                listener(event as IncomingChatAlert);
            }
        },
    );
    return () => {
        subscription.remove();
    };
}
