// Lưu bền vững hồ sơ phụ & ảnh đại diện theo từng tài khoản (FileSystem trên Android/iOS, localStorage trên Web).
import { Platform } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { createDefaultUserProfileExtras } from '@/features/profile/utils/profile-extras';
import type { UserProfileExtras } from '@/features/profile/types/profile-extras';

function safeUserFileName(userId: string): string {
    const clean = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `kinshield-profile-extras-v1-${clean}.json`;
}

function webStorageKey(userId: string): string {
    return `kinshield:profile-extras:v1:${userId}`;
}

function mergeWithDefaults(
    parsed: Partial<UserProfileExtras>,
    defaults: UserProfileExtras,
): UserProfileExtras {
    return {
        ...defaults,
        ...parsed,
        preferences: {
            ...defaults.preferences,
            ...(parsed.preferences ?? {}),
        },
        emergencyContacts: Array.isArray(parsed.emergencyContacts)
            ? parsed.emergencyContacts
            : defaults.emergencyContacts,
        trustedAccounts: Array.isArray(parsed.trustedAccounts)
            ? parsed.trustedAccounts
            : defaults.trustedAccounts,
        acknowledgedRuleIds: Array.isArray(parsed.acknowledgedRuleIds)
            ? parsed.acknowledgedRuleIds
            : defaults.acknowledgedRuleIds,
        activityLog: Array.isArray(parsed.activityLog)
            ? parsed.activityLog
            : defaults.activityLog,
    };
}

export async function loadMobileProfileExtras(
    userId: string,
    displayName: string,
): Promise<UserProfileExtras> {
    const defaults = createDefaultUserProfileExtras(displayName);
    try {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return defaults;
            const raw = window.localStorage.getItem(webStorageKey(userId));
            if (!raw) return defaults;
            return mergeWithDefaults(
                JSON.parse(raw) as Partial<UserProfileExtras>,
                defaults,
            );
        }

        const file = new File(Paths.document, safeUserFileName(userId));
        if (!file.exists) return defaults;
        const raw = await file.text();
        if (!raw) return defaults;
        return mergeWithDefaults(
            JSON.parse(raw) as Partial<UserProfileExtras>,
            defaults,
        );
    } catch {
        return defaults;
    }
}

export async function saveMobileProfileExtras(
    userId: string,
    extras: UserProfileExtras,
): Promise<void> {
    const serialized = JSON.stringify(extras);
    try {
        if (Platform.OS === 'web') {
            if (typeof window === 'undefined') return;
            window.localStorage.setItem(webStorageKey(userId), serialized);
            return;
        }

        const file = new File(Paths.document, safeUserFileName(userId));
        if (!file.exists) {
            file.create({ overwrite: true });
        }
        file.writeSync(serialized);
    } catch {
        // Bỏ qua nếu thiết bị không đủ dung lượng ghi
    }
}
