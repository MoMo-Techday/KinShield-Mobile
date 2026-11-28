// Kiểm tra nhanh Tầng 1 ngay trên máy (< 50ms) và tính toán tiến độ Tầng 2 cho Mobile X-Ray.
export interface InstantTier1Preview {
    flags: string[];
    hasHotRisk: boolean;
    summary: string;
}

function normalizeVietnamese(raw: string): string {
    return raw
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');
}

export function runMobileTier1Preview(input: {
    text: string;
    url: string;
    hasImage: boolean;
}): InstantTier1Preview {
    const combined = normalizeVietnamese(`${input.text} ${input.url}`);
    const flags: string[] = [];

    if (/\.apk\b|dichvucong|vneid/.test(combined)) {
        flags.push('Nghi dấu hiệu tệp cài đặt .apk hoặc giả mạo VNeID');
    }
    if (/\botp\b|mat khau|6 so|ma pin|chia se man hinh/.test(combined)) {
        flags.push('Phát hiện từ khóa yêu cầu mã OTP hoặc mật khẩu');
    }
    if (/\.(xyz|top|tk|vip|buzz|icu)\b|m0mo|evn-|nhantien|hoantien/.test(combined)) {
        flags.push('Đường dẫn hoặc tên miền có dấu hiệu bất thường');
    }
    if (/000201\d{10,}/.test(combined)) {
        flags.push('Nhận diện chuỗi mã VietQR — đang kiểm tra toàn vẹn CRC-16');
    }

    const hasHotRisk = flags.some((flag) => !flag.startsWith('Nhận diện chuỗi mã'));
    if (flags.length > 0) {
        return {
            flags: flags.slice(0, 2),
            hasHotRisk,
            summary: hasHotRisk
                ? 'Phát hiện dấu hiệu đáng ngờ ngay ở tầng lọc nhanh'
                : flags[0],
        };
    }

    return {
        flags: [],
        hasHotRisk: false,
        summary: input.hasImage
            ? 'Đã tiếp nhận ảnh — chuyển sang Tầng 2 đọc chữ & soi chỉnh sửa'
            : 'Chưa thấy từ khóa nguy hiểm rõ rệt — đang soi sâu ở Tầng 2',
    };
}

export function computeTier2Progress(elapsedMs: number): {
    percent: number;
    activeStepIndex: number;
} {
    const safeMs = Math.max(0, elapsedMs);
    const percent = Math.min(
        94,
        Math.round(18 + 76 * (1 - Math.exp(-safeMs / 5000))),
    );
    const activeStepIndex = safeMs < 2400 ? 0 : safeMs < 5500 ? 1 : 2;
    return { percent, activeStepIndex };
}

export function getMobileTier2Steps(hasImage: boolean): readonly string[] {
    return hasImage
        ? [
              'Đọc chữ trên ảnh & soi dấu vết chỉnh sửa (ELA)',
              'Đối chiếu 22 kịch bản lừa đảo Việt Nam',
              'AI đang tổng hợp mức cảnh báo cho gia đình',
          ]
        : [
              'Kiểm tra đường dẫn & giải mã VietQR',
              'Đối chiếu 22 kịch bản lừa đảo Việt Nam',
              'AI đang tổng hợp mức cảnh báo cho gia đình',
          ];
}
