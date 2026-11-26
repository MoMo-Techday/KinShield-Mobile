// Kiểm tra mã lỗi Core và điều kiện giữ nguyên thao tác khi chưa biết đã commit hay chưa.
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';
import {
    classifyFamilyError,
    isUncertainError,
} from '@/features/co-sign/utils/co-sign-errors';

// Tạo đúng shape lỗi Axios để unit đi qua bước phân loại HTTP thực.
function failure(status: number, code?: string) {
    const config = { headers: new AxiosHeaders() };
    const response: AxiosResponse = {
        config,
        data: { code },
        headers: {},
        status,
        statusText: String(status),
    };
    return new AxiosError('fixture', undefined, config, undefined, response);
}

describe('Family and Co-Sign error states', () => {
    // Hai loại lỗi cùng 409 điều khiển nút và thông báo khác nhau.
    it.each([
        [409, 'CO_SIGN_EXPIRED', 'expired'],
        [409, 'CO_SIGN_ALREADY_RESOLVED', 'resolved'],
        [409, 'GUARDIAN_REQUIRED', 'guardian-required'],
        [410, 'FAMILY_INVITATION_EXPIRED', 'invite-ended'],
        [410, 'FAMILY_INVITATION_REVOKED', 'invite-ended'],
        [409, 'FAMILY_INVITATION_USED', 'invite-ended'],
        [404, 'FAMILY_INVITATION_NOT_FOUND', 'invalid-invite'],
        [404, 'FAMILY_NOT_FOUND', 'missing'],
        [401, undefined, 'unauthorized'],
        [403, undefined, 'forbidden'],
        [429, undefined, 'rate-limit'],
    ] as const)('maps %s %s', (status, code, kind) => {
        expect(classifyFamilyError(failure(status, code)).kind).toBe(kind);
    });
    // Mạng và 5xx là hai trường hợp cần đối chiếu snapshot hoặc retry đúng key cũ.
    it('treats only transport failures or unavailable Core as uncertain', () => {
        expect(classifyFamilyError(new AxiosError('fixture')).kind).toBe(
            'offline',
        );
        expect(isUncertainError(new AxiosError('fixture'))).toBe(true);
        expect(isUncertainError(failure(503))).toBe(true);
        expect(isUncertainError(failure(409, 'CO_SIGN_EXPIRED'))).toBe(false);
    });
});
