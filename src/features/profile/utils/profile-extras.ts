import type {
    AvatarFrameTone,
    AvatarPresetId,
    EmergencyContact,
    FamilyRole,
    SafetyActivityItem,
    SafetyScoreSummary,
    TrustedAccount,
    UserProfileExtras,
} from '@/features/profile/types/profile-extras';

export const FAMILY_ROLES: readonly FamilyRole[] = [
    'Ba',
    'Mẹ',
    'Ông',
    'Bà',
    'Con cái',
    'Người thân',
] as const;

export const AVATAR_FRAME_TONES: readonly {
    id: AvatarFrameTone;
    label: string;
    borderClass: string;
    dotClass: string;
}[] = [
    {
        id: 'rose',
        label: 'Hồng MoMo',
        borderClass: 'border-primary',
        dotClass: 'bg-primary',
    },
    {
        id: 'butter',
        label: 'Nắng ấm',
        borderClass: 'border-amber-400',
        dotClass: 'bg-amber-400',
    },
    {
        id: 'sage',
        label: 'Lá trà xanh',
        borderClass: 'border-emerald-500',
        dotClass: 'bg-emerald-500',
    },
    {
        id: 'sky',
        label: 'Trời dịu',
        borderClass: 'border-sky-500',
        dotClass: 'bg-sky-500',
    },
] as const;

export const AVATAR_PRESETS: readonly {
    id: AvatarPresetId;
    label: string;
    emoji: string;
    bgClass: string;
}[] = [
    { id: 'mother', label: 'Mẹ yêu', emoji: '👩🏻', bgClass: 'bg-primary/10' },
    { id: 'father', label: 'Ba hiền', emoji: '👨🏻', bgClass: 'bg-sky-500/10' },
    { id: 'grandma', label: 'Bà yêu', emoji: '👵🏻', bgClass: 'bg-amber-500/15' },
    { id: 'grandpa', label: 'Ông yêu', emoji: '👴🏻', bgClass: 'bg-emerald-500/10' },
    { id: 'daughter', label: 'Con gái', emoji: '👧🏻', bgClass: 'bg-primary/10' },
    { id: 'son', label: 'Con trai', emoji: '👦🏻', bgClass: 'bg-sky-500/10' },
    { id: 'grandchild', label: 'Cháu nhỏ', emoji: '🧒🏻', bgClass: 'bg-amber-500/15' },
    { id: 'shield', label: 'Khiên nhà', emoji: '🛡️', bgClass: 'bg-emerald-500/10' },
] as const;

export const THRESHOLD_OPTIONS_VND = [
    2_000_000,
    5_000_000,
    10_000_000,
    20_000_000,
] as const;

export const OFFICIAL_VN_HOTLINES = [
    {
        id: 'police-113',
        name: 'Cảnh sát 113',
        phone: '113',
        note: 'Khẩn cấp 24/7 toàn quốc',
    },
    {
        id: 'a05-hotline',
        name: 'Tố giác lừa đảo (Bộ Công An)',
        phone: '0692348560',
        note: 'Cục An ninh mạng A05',
    },
    {
        id: 'momo-support',
        name: 'Tổng đài hỗ trợ MoMo',
        phone: '1900545441',
        note: 'Khóa ví & tra soát giao dịch',
    },
] as const;

export const GOLDEN_SAFETY_RULES = [
    {
        id: 'rule-no-otp',
        title: 'Tuyệt đối không đọc 6 số OTP hay mật khẩu',
        detail: 'Ngân hàng, Ví MoMo và cơ quan nhà nước không bao giờ gọi hỏi mã OTP.',
    },
    {
        id: 'rule-no-apk',
        title: 'Không cài tệp .apk gửi qua Zalo hoặc đường link lạ',
        detail: 'Ứng dụng Dịch vụ công và VNeID chỉ tải từ CH Play hoặc App Store chính thức.',
    },
    {
        id: 'rule-no-police-zalo',
        title: 'Công an không làm việc hay yêu cầu chuyển tiền qua Zalo',
        detail: 'Nếu bị hù dọa “vụ án mật, không kể với con”, hãy cúp máy và gọi ngay cho con.',
    },
    {
        id: 'rule-check-balance',
        title: 'Chỉ tin biến động số dư thật, không tin ảnh chụp bill',
        detail: 'Ảnh biên lai chuyển khoản có thể bị sửa số tiền chỉ trong vài giây.',
    },
    {
        id: 'rule-video-verify',
        title: 'Gọi trực tiếp số thật của con khi nghe tin tai nạn gấp',
        detail: 'Giọng nói có thể bị giả bằng AI — luôn gọi xác minh qua số quen thuộc.',
    },
] as const;

export function createDefaultUserProfileExtras(
    displayName: string,
): UserProfileExtras {
    return {
        nickname: displayName.trim(),
        familyRole: 'Con cái',
        phone: '',
        safetyNote:
            'Luôn gọi xác minh với người thân trước khi chuyển khoản lớn.',
        avatarCustomUri: null,
        avatarPresetId: 'shield',
        avatarFrame: 'rose',
        preferences: {
            largeTextMode: false,
            voiceAlertsEnabled: true,
            blockOtpInCalls: true,
            coSignAlertEnabled: true,
            coSignThresholdVnd: 5_000_000,
        },
        emergencyContacts: [],
        trustedAccounts: [],
        acknowledgedRuleIds: [],
        activityLog: [],
    };
}

export function getUserInitials(name: string): string {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (words.length === 0) return 'KS';
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return `${words[0][0] ?? ''}${words[words.length - 1][0] ?? ''}`.toUpperCase();
}

export function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}₫`;
}

export function sanitizePhoneNumber(raw: string): string {
    return raw.replace(/[^\d+]/g, '').slice(0, 15);
}

export function validateEmergencyContact(input: {
    name: string;
    relation: string;
    phone: string;
}): string | null {
    if (input.name.trim().length < 2) {
        return 'Vui lòng nhập tên người thân (tối thiểu 2 ký tự).';
    }
    if (sanitizePhoneNumber(input.phone).length < 8) {
        return 'Số điện thoại cần tối thiểu 8 chữ số.';
    }
    if (input.relation.trim().length === 0) {
        return 'Vui lòng nhập mối quan hệ (VD: Con trai, Con gái).';
    }
    return null;
}

export function validateTrustedAccount(input: {
    ownerName: string;
    bankName: string;
    accountNumber: string;
}): string | null {
    if (input.ownerName.trim().length < 2) {
        return 'Vui lòng nhập tên chủ tài khoản.';
    }
    if (input.bankName.trim().length < 2) {
        return 'Vui lòng nhập tên ngân hàng hoặc ví.';
    }
    if (input.accountNumber.replace(/\s+/g, '').length < 6) {
        return 'Số tài khoản cần tối thiểu 6 ký tự.';
    }
    return null;
}

export function appendActivityLog(
    current: SafetyActivityItem[],
    message: string,
    nowIso = new Date().toISOString(),
): SafetyActivityItem[] {
    const next: SafetyActivityItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message,
        timestamp: nowIso,
    };
    return [next, ...current].slice(0, 12);
}

export function computeSafetyScore(
    extras: UserProfileExtras,
    emailVerified: boolean,
): SafetyScoreSummary {
    const checks: { done: boolean; points: number; hint: string }[] = [
        {
            done: emailVerified,
            points: 25,
            hint: 'Xác minh email để bảo vệ khôi phục tài khoản.',
        },
        {
            done:
                Boolean(extras.avatarCustomUri || extras.avatarPresetId) &&
                extras.nickname.trim().length >= 2,
            points: 15,
            hint: 'Đặt ảnh đại diện và tên gọi thân mật trong gia đình.',
        },
        {
            done: extras.emergencyContacts.length > 0,
            points: 20,
            hint: 'Thêm ít nhất 1 số điện thoại người thân khẩn cấp.',
        },
        {
            done:
                extras.preferences.coSignAlertEnabled &&
                extras.preferences.coSignThresholdVnd > 0,
            points: 15,
            hint: 'Bật ngưỡng hỏi ý con khi chuyển khoản lớn.',
        },
        {
            done: extras.trustedAccounts.length > 0,
            points: 15,
            hint: 'Lưu ít nhất 1 số tài khoản người thân tin cậy.',
        },
        {
            done:
                extras.acknowledgedRuleIds.length >= 3 ||
                extras.preferences.voiceAlertsEnabled,
            points: 10,
            hint: 'Bật cảnh báo giọng nói hoặc ghi nhớ 3 nguyên tắc vàng.',
        },
    ];

    const score = checks.reduce(
        (sum, item) => sum + (item.done ? item.points : 0),
        0,
    );
    const completedCount = checks.filter((item) => item.done).length;
    const firstPending = checks.find((item) => !item.done);

    const levelLabel =
        score >= 90
            ? 'Khiên Gia Đình vững chắc'
            : score >= 70
              ? 'Lá chắn an toàn tốt'
              : score >= 45
                ? 'Đang hoàn thiện bảo vệ'
                : 'Mới bắt đầu thiết lập';

    return {
        score,
        levelLabel,
        completedCount,
        totalCount: checks.length,
        nextHint:
            firstPending?.hint ??
            'Tuyệt vời! Hồ sơ gia đình của bạn đã được bảo vệ tối đa.',
    };
}

export function buildEmergencyContact(input: {
    name: string;
    relation: string;
    phone: string;
}): EmergencyContact {
    return {
        id: `ec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        relation: input.relation.trim(),
        phone: sanitizePhoneNumber(input.phone),
    };
}

export function buildTrustedAccount(input: {
    ownerName: string;
    bankName: string;
    accountNumber: string;
    note: string;
}): TrustedAccount {
    return {
        id: `ta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ownerName: input.ownerName.trim(),
        bankName: input.bankName.trim(),
        accountNumber: input.accountNumber.replace(/\s+/g, ''),
        note: input.note.trim(),
    };
}
