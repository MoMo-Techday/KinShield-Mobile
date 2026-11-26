// Chuẩn hóa mã gia đình và số tiền VND lấy từ input.
const vnd = new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
});

// Hiển thị số tiền nguyên theo locale tiếng Việt trên danh sách và màn chi tiết.
export function formatVnd(amount: number): string {
    return vnd.format(amount);
}

// Dùng cho input tiền VND. Dấu chấm hoặc phẩy không được tự chuyển vì có thể là phần thập phân.
export function parseVnd(
    input: string,
    min: number,
    max: number,
): number | null {
    if (!/^\d+$/.test(input.trim())) return null;
    const amount = Number(input);
    return Number.isSafeInteger(amount) && amount >= min && amount <= max
        ? amount
        : null;
}

// Router chỉ mở gia đình có ID hợp lệ để tránh dựng REST path từ dữ liệu tùy ý.
export function isUuid(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
            value,
        )
    );
}
