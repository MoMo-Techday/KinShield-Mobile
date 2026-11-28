import { describe, expect, it } from 'vitest';
import {
    appendActivityLog,
    computeSafetyScore,
    createDefaultUserProfileExtras,
    getUserInitials,
    sanitizePhoneNumber,
    validateEmergencyContact,
    validateTrustedAccount,
} from '@/features/profile/utils/profile-extras';

describe('mobile profile-extras utils', () => {
    it('extracts initials cleanly for Vietnamese names', () => {
        expect(getUserInitials('Trần Thị Hoa')).toBe('TH');
        expect(getUserInitials('Lan')).toBe('LA');
        expect(getUserInitials('')).toBe('KS');
    });

    it('sanitizes phone numbers and validates contacts & accounts', () => {
        expect(sanitizePhoneNumber('0912-345 678')).toBe('0912345678');
        expect(
            validateEmergencyContact({
                name: 'Con Minh',
                relation: 'Con trai',
                phone: '0912345678',
            }),
        ).toBeNull();
        expect(
            validateEmergencyContact({
                name: 'A',
                relation: 'Con',
                phone: '0912345678',
            }),
        ).not.toBeNull();
        expect(
            validateTrustedAccount({
                ownerName: 'Con Minh',
                bankName: 'Vietcombank',
                accountNumber: '0123456789',
            }),
        ).toBeNull();
    });

    it('reaches 100 safety score when all protection items are set', () => {
        const base = createDefaultUserProfileExtras('Mẹ Lan');
        const full = {
            ...base,
            emergencyContacts: [
                {
                    id: '1',
                    name: 'Minh',
                    relation: 'Con trai',
                    phone: '0901234567',
                },
            ],
            trustedAccounts: [
                {
                    id: '2',
                    ownerName: 'Minh',
                    bankName: 'Vietcombank',
                    accountNumber: '0123456789',
                    note: '',
                },
            ],
        };
        const result = computeSafetyScore(full, true);
        expect(result.score).toBe(100);
        expect(result.completedCount).toBe(result.totalCount);
    });

    it('keeps only the 12 newest safety log items', () => {
        let log = createDefaultUserProfileExtras('Ba').activityLog;
        for (let i = 1; i <= 14; i += 1) {
            log = appendActivityLog(log, `Step ${i}`, '2026-11-28T04:10:00Z');
        }
        expect(log).toHaveLength(12);
        expect(log[0].message).toBe('Step 14');
    });
});
