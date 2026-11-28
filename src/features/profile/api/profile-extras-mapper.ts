// Bộ chuyển đổi thuần (pure mapper) giữa UserProfileExtras trên Mobile và DTO của KinShield-Core.
import {
    AVATAR_FRAME_TONES,
    AVATAR_PRESETS,
    createDefaultUserProfileExtras,
    FAMILY_ROLES,
} from '@/features/profile/utils/profile-extras';
import type {
    AvatarFrameTone,
    AvatarPresetId,
    EmergencyContact,
    FamilyRole,
    SafetyActivityItem,
    SafetyPreferences,
    TrustedAccount,
    UserProfileExtras,
} from '@/features/profile/types/profile-extras';

export interface ProfileExtrasApiResponse {
    userId: string;
    nickname: string;
    familyRole: string;
    phone: string;
    safetyNote: string;
    avatarDataUrl: string | null;
    avatarPresetId: string | null;
    avatarFrame: string;
    preferences: SafetyPreferences;
    emergencyContacts: EmergencyContact[];
    trustedAccounts: TrustedAccount[];
    acknowledgedRuleIds: string[];
    activityLog: SafetyActivityItem[];
    updatedAt: string;
}

interface UpdateProfileExtrasPayload {
    nickname: string;
    familyRole: FamilyRole;
    phone: string;
    safetyNote: string;
    avatarDataUrl: string | null;
    avatarPresetId: AvatarPresetId | null;
    avatarFrame: AvatarFrameTone;
    preferences: SafetyPreferences;
    emergencyContacts: EmergencyContact[];
    trustedAccounts: TrustedAccount[];
    acknowledgedRuleIds: string[];
    activityLog: SafetyActivityItem[];
}

const MAX_AVATAR_DATA_URL_LENGTH = 600_000;
const MIN_COSIGN_THRESHOLD_VND = 500_000;
const MAX_COSIGN_THRESHOLD_VND = 500_000_000;

function sanitizeAvatarForApi(value: string | null): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_AVATAR_DATA_URL_LENGTH) {
        return null;
    }
    const isValidScheme =
        /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(
            trimmed,
        ) || /^https:\/\/[^\s]+$/i.test(trimmed);
    return isValidScheme ? trimmed : null;
}

function clampThreshold(value: number): number {
    if (!Number.isFinite(value)) return 5_000_000;
    return Math.min(
        MAX_COSIGN_THRESHOLD_VND,
        Math.max(MIN_COSIGN_THRESHOLD_VND, Math.round(value)),
    );
}

function isFamilyRole(value: string): value is FamilyRole {
    return (FAMILY_ROLES as readonly string[]).includes(value);
}

function isAvatarFrame(value: string): value is AvatarFrameTone {
    return AVATAR_FRAME_TONES.some((frame) => frame.id === value);
}

function isAvatarPreset(value: string): value is AvatarPresetId {
    return AVATAR_PRESETS.some((preset) => preset.id === value);
}

export function toUpdateProfileExtrasPayload(
    extras: UserProfileExtras,
): UpdateProfileExtrasPayload {
    return {
        nickname: extras.nickname.slice(0, 120),
        familyRole: extras.familyRole,
        phone: extras.phone.slice(0, 32),
        safetyNote: extras.safetyNote.slice(0, 300),
        avatarDataUrl: sanitizeAvatarForApi(extras.avatarCustomUri),
        avatarPresetId: extras.avatarPresetId,
        avatarFrame: extras.avatarFrame,
        preferences: {
            largeTextMode: Boolean(extras.preferences.largeTextMode),
            voiceAlertsEnabled: Boolean(extras.preferences.voiceAlertsEnabled),
            blockOtpInCalls: Boolean(extras.preferences.blockOtpInCalls),
            coSignAlertEnabled: Boolean(extras.preferences.coSignAlertEnabled),
            coSignThresholdVnd: clampThreshold(
                extras.preferences.coSignThresholdVnd,
            ),
        },
        emergencyContacts: extras.emergencyContacts.slice(0, 20).map((c) => ({
            id: c.id.slice(0, 64),
            name: c.name.slice(0, 80),
            relation: c.relation.slice(0, 40),
            phone: c.phone.slice(0, 24),
        })),
        trustedAccounts: extras.trustedAccounts.slice(0, 30).map((a) => ({
            id: a.id.slice(0, 80),
            ownerName: a.ownerName.slice(0, 100),
            bankName: a.bankName.slice(0, 80),
            accountNumber: a.accountNumber.slice(0, 40),
            note: a.note.slice(0, 120),
        })),
        acknowledgedRuleIds: extras.acknowledgedRuleIds.slice(0, 20),
        activityLog: extras.activityLog.slice(0, 12).map((item) => ({
            id: item.id.slice(0, 64),
            message: item.message.slice(0, 180),
            timestamp: item.timestamp.slice(0, 40),
        })),
    };
}

export function fromProfileExtrasResponse(
    dto: ProfileExtrasApiResponse,
    displayName: string,
): UserProfileExtras {
    const defaults = createDefaultUserProfileExtras(displayName);
    return {
        nickname: dto.nickname?.trim() || defaults.nickname,
        familyRole: isFamilyRole(dto.familyRole)
            ? dto.familyRole
            : defaults.familyRole,
        phone: typeof dto.phone === 'string' ? dto.phone : defaults.phone,
        safetyNote:
            typeof dto.safetyNote === 'string'
                ? dto.safetyNote
                : defaults.safetyNote,
        avatarCustomUri:
            typeof dto.avatarDataUrl === 'string' &&
            dto.avatarDataUrl.length > 0
                ? dto.avatarDataUrl
                : null,
        avatarPresetId:
            typeof dto.avatarPresetId === 'string' &&
            isAvatarPreset(dto.avatarPresetId)
                ? dto.avatarPresetId
                : null,
        avatarFrame: isAvatarFrame(dto.avatarFrame)
            ? dto.avatarFrame
            : defaults.avatarFrame,
        preferences: {
            ...defaults.preferences,
            ...(dto.preferences ?? {}),
        },
        emergencyContacts: Array.isArray(dto.emergencyContacts)
            ? dto.emergencyContacts
            : defaults.emergencyContacts,
        trustedAccounts: Array.isArray(dto.trustedAccounts)
            ? dto.trustedAccounts
            : defaults.trustedAccounts,
        acknowledgedRuleIds: Array.isArray(dto.acknowledgedRuleIds)
            ? dto.acknowledgedRuleIds
            : defaults.acknowledgedRuleIds,
        activityLog: Array.isArray(dto.activityLog)
            ? dto.activityLog
            : defaults.activityLog,
    };
}
