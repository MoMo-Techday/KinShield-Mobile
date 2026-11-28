import { describe, expect, it } from 'vitest';
import {
    canMonitorCall,
    canViewCallAlerts,
    redactTranscript,
} from '@/features/call-protection/utils/call-protection-access';

describe('call protection role access', () => {
    it('allows only Parents to monitor calls', () => {
        expect(canMonitorCall('PARENT')).toBe(true);
        expect(canMonitorCall('GUARDIAN')).toBe(false);
    });

    describe('best-effort transcript redaction', () => {
        it.each([
            ['OTP 123456 gửi cho tôi', 'OTP [REDACTED] gửi cho tôi'],
            ['PIN: 1234 đã nhập', 'PIN: [REDACTED] đã nhập'],
            ['Gọi +84 912 345 678 ngay', 'Gọi [REDACTED] ngay'],
            ['Số điện thoại 0912345678 nhé', 'Số điện thoại [REDACTED] nhé'],
            [
                'Thẻ 4111 1111 1111 1111 đã dùng',
                'Thẻ [REDACTED] đã dùng',
            ],
            ['STK: 1234567890 của tôi', 'STK: [REDACTED] của tôi'],
            ['CCCD: 012345678901 của tôi', 'CCCD: [REDACTED] của tôi'],
        ])('redacts sensitive values in "%s"', (input, expected) => {
            expect(redactTranscript(input)).toBe(expected);
        });

        it('leaves unrelated short numbers unchanged', () => {
            expect(redactTranscript('Mã đơn 123, có 2 giao dịch')).toBe(
                'Mã đơn 123, có 2 giao dịch',
            );
        });
    });

    it('allows only Guardians to view call alerts', () => {
        expect(canViewCallAlerts('GUARDIAN')).toBe(true);
        expect(canViewCallAlerts('PARENT')).toBe(false);
    });

    it.each([undefined, null, '', 'UNKNOWN'])(
        'denies unknown roles: %s',
        (role) => {
            expect(canMonitorCall(role)).toBe(false);
            expect(canViewCallAlerts(role)).toBe(false);
        },
    );
});
