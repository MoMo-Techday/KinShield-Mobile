export type FamilyRole =
    | 'Ba'
    | 'Mẹ'
    | 'Ông'
    | 'Bà'
    | 'Con cái'
    | 'Người thân';

export type AvatarFrameTone = 'rose' | 'butter' | 'sage' | 'sky';

export type AvatarPresetId =
    | 'grandpa'
    | 'grandma'
    | 'father'
    | 'mother'
    | 'son'
    | 'daughter'
    | 'grandchild'
    | 'shield';

export interface EmergencyContact {
    id: string;
    name: string;
    relation: string;
    phone: string;
}

export interface TrustedAccount {
    id: string;
    ownerName: string;
    bankName: string;
    accountNumber: string;
    note: string;
}

export interface SafetyPreferences {
    largeTextMode: boolean;
    voiceAlertsEnabled: boolean;
    blockOtpInCalls: boolean;
    coSignAlertEnabled: boolean;
    coSignThresholdVnd: number;
}

export interface SafetyActivityItem {
    id: string;
    message: string;
    timestamp: string;
}

export interface UserProfileExtras {
    nickname: string;
    familyRole: FamilyRole;
    phone: string;
    safetyNote: string;
    avatarCustomUri: string | null;
    avatarPresetId: AvatarPresetId | null;
    avatarFrame: AvatarFrameTone;
    preferences: SafetyPreferences;
    emergencyContacts: EmergencyContact[];
    trustedAccounts: TrustedAccount[];
    acknowledgedRuleIds: string[];
    activityLog: SafetyActivityItem[];
}

export interface SafetyScoreSummary {
    score: number;
    levelLabel: string;
    completedCount: number;
    totalCount: number;
    nextHint: string;
}
