// Bộ giải mã VietQR (EMVCo TLV) chạy offline ngay trên điện thoại.
import type { XRayVietQr } from '@/features/xray/types/xray';

const NAPAS_BANK_BINS: Record<string, string> = {
    '970436': 'Vietcombank',
    '970407': 'Techcombank',
    '970422': 'MBBank',
    '970418': 'BIDV',
    '970415': 'VietinBank',
    '970416': 'ACB',
    '970432': 'VPBank',
    '970423': 'TPBank',
    '970405': 'Agribank',
    '970403': 'Sacombank',
    '970441': 'VIB',
    '970443': 'SHB',
    '970437': 'HDBank',
    '970448': 'OCB',
    '970426': 'MSB',
    '970431': 'Eximbank',
    '970440': 'SeABank',
    '970428': 'Nam A Bank',
    '970449': 'LPBank',
    '970454': 'BVBank / Timo',
    '971005': 'Ví MoMo (NAPAS)',
};

function crc16CcittFalse(payload: string): string {
    let crc = 0xffff;
    for (let i = 0; i < payload.length; i += 1) {
        crc ^= (payload.charCodeAt(i) & 0xff) << 8;
        for (let bit = 0; bit < 8; bit += 1) {
            crc =
                (crc & 0x8000) !== 0
                    ? ((crc << 1) ^ 0x1021) & 0xffff
                    : (crc << 1) & 0xffff;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}

function parseTlv(payload: string): Record<string, string> {
    const tags: Record<string, string> = {};
    let idx = 0;
    while (idx + 4 <= payload.length) {
        const tag = payload.slice(idx, idx + 2);
        const lenStr = payload.slice(idx + 2, idx + 4);
        if (!/^\d{2}$/.test(lenStr)) break;
        const len = Number(lenStr);
        const end = idx + 4 + len;
        if (end > payload.length) break;
        tags[tag] = payload.slice(idx + 4, end);
        idx = end;
    }
    return tags;
}

export function parseMobileVietQr(raw: string): XRayVietQr | null {
    if (!raw.includes('000201')) return null;
    const match = raw.match(/000201[0-9A-Za-z\-_. /:@+?=&%]{24,512}/);
    if (!match) return null;

    const candidate = match[0].trim();
    const root = parseTlv(candidate);
    if (root['00'] !== '01') return null;

    const merchantRaw = root['38'] ?? root['39'];
    if (!merchantRaw) return null;

    const merchant = parseTlv(merchantRaw);
    const beneficiary = parseTlv(merchant['01'] ?? '');
    const bankBin = beneficiary['00'] ?? '';
    const accountNumber = beneficiary['01'] ?? '';
    if (!bankBin && !accountNumber) return null;

    const amountRaw = root['54'] ?? '';
    const digits = amountRaw.split('.')[0]?.replace(/[^0-9]/g, '') ?? '';
    const amountVnd = digits.length > 0 ? Number(digits) : null;

    const additional = parseTlv(root['62'] ?? '');
    const purpose = additional['08'] ?? additional['05'] ?? '';

    let crcValid: boolean | null = null;
    const crcTag = root['63'];
    if (crcTag && crcTag.length === 4) {
        const crcPos = candidate.lastIndexOf('6304');
        if (crcPos !== -1) {
            crcValid =
                crc16CcittFalse(candidate.slice(0, crcPos + 4)) ===
                crcTag.toUpperCase();
        }
    }

    return {
        aid: (merchant['00'] ?? '').toUpperCase(),
        bankBin,
        bankName:
            NAPAS_BANK_BINS[bankBin] ??
            (bankBin ? `Ngân hàng (BIN ${bankBin})` : 'Không rõ'),
        accountNumber,
        amountVnd,
        purpose,
        crcValid,
        isDynamic: root['01'] === '12',
    };
}
