import { describe, expect, it } from 'vitest';
import {
    fromProfileExtrasResponse,
    toUpdateProfileExtrasPayload,
    type ProfileExtrasApiResponse,
} from '@/features/profile/api/profile-extras-mapper';
import { createDefaultUserProfileExtras } from '@/features/profile/utils/profile-extras';

describe('mobile profile-extras-api mapping', () => {
    it('maps Mobile UserProfileExtras to strictly whitelisted Core DTO payload', () => {
        const extras = {
            ...createDefaultUserProfileExtras('Ông Hải'),
            avatarCustomUri: 'data:image/jpeg;base64,ABC12345',
            preferences: {
                largeTextMode: true,
                voiceAlertsEnabled: true,
                blockOtpInCalls: true,
                coSignAlertEnabled: true,
                coSignThresholdVnd: 999_999_999,
            },
        };

        const payload = toUpdateProfileExtrasPayload(extras);

        expect(Object.keys(payload).sort()).toEqual([
            'acknowledgedRuleIds',
            'activityLog',
            'avatarDataUrl',
            'avatarFrame',
            'avatarPresetId',
            'emergencyContacts',
            'familyRole',
            'nickname',
            'phone',
            'preferences',
            'safetyNote',
            'trustedAccounts',
        ]);
        expect(payload.avatarDataUrl).toBe('data:image/jpeg;base64,ABC12345');
        expect(payload.preferences.coSignThresholdVnd).toBe(500_000_000);
    });

    it('omits local file:// URIs when syncing to Core backend', () => {
        const extras = {
            ...createDefaultUserProfileExtras('Bà Mai'),
            avatarCustomUri: 'file:///data/user/0/avatar.jpg',
        };

        const payload = toUpdateProfileExtrasPayload(extras);
        expect(payload.avatarDataUrl).toBeNull();
    });

    it('maps Core response DTO back into Mobile UserProfileExtras', () => {
        const dto: ProfileExtrasApiResponse = {
            userId: 'user-9',
            nickname: 'Bà Mai',
            familyRole: 'Bà',
            phone: '0987654321',
            safetyNote: 'Chỉ nghe máy người nhà',
            avatarDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
            avatarPresetId: null,
            avatarFrame: 'butter',
            preferences: {
                largeTextMode: true,
                voiceAlertsEnabled: true,
                blockOtpInCalls: true,
                coSignAlertEnabled: true,
                coSignThresholdVnd: 3_000_000,
            },
            emergencyContacts: [],
            trustedAccounts: [],
            acknowledgedRuleIds: ['otp-never'],
            activityLog: [],
            updatedAt: '2026-11-28T00:00:00.000Z',
        };

        const mapped = fromProfileExtrasResponse(dto, 'Mai');
        expect(mapped.avatarCustomUri).toBe(
            'data:image/png;base64,iVBORw0KGgo=',
        );
        expect(mapped.avatarFrame).toBe('butter');
        expect(mapped.familyRole).toBe('Bà');
    });
});
