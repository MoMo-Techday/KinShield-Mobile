import { describe, expect, it } from 'vitest';
import { parseMobileVietQr } from '@/features/xray/utils/vietqr';

describe('parseMobileVietQr', () => {
    it('decodes bank name, account number, amount, and valid CRC-16', () => {
        const sample =
            'Chuyển cọc qua mã: 00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA5303704540750000005802VN62150811COC PHONG 163043188';
        const decoded = parseMobileVietQr(sample);

        expect(decoded).not.toBeNull();
        expect(decoded?.bankName).toBe('Vietcombank');
        expect(decoded?.accountNumber).toBe('0123456789');
        expect(decoded?.amountVnd).toBe(5000000);
        expect(decoded?.purpose).toBe('COC PHONG 1');
    });

    it('flags invalid CRC when QR payload has been tampered with', () => {
        const tampered =
            '00020101021238540010A00000072701240006970436011001234567890208QRIBFTTA5303704540750000005802VN62150811COC PHONG 16304FFFF';
        const decoded = parseMobileVietQr(tampered);

        expect(decoded).not.toBeNull();
        expect(decoded?.crcValid).toBe(false);
    });

    it('returns null for normal text without VietQR payload', () => {
        expect(parseMobileVietQr('Chiều nay con về ăn cơm nhé mẹ')).toBeNull();
    });
});
