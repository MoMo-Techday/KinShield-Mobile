// Tính hiển thị và quyền thao tác từ snapshot Core, với thời gian đơn điệu để tránh lệch giờ thiết bị.
import type { FamilyRole } from '@/features/family/types/family';
import type {
    CoSignAction,
    CoSignDetail,
    CoSignPage,
    CoSignStatus,
    SimulationAttempt,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';

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

// Key và ID được sinh đúng một lần khi bắt đầu giao dịch mô phỏng, giữ nguyên xuyên suốt retry.
export function makeSimulationAttempt(
    amountVnd: number,
    recipientLabel: string,
    newId: () => string,
): SimulationAttempt {
    return {
        key: newId(),
        transfer: {
            transactionId: newId(),
            recipientRef: newId(),
            amountVnd,
            recipientLabel: recipientLabel.trim(),
            recipientKnown: true,
        },
    };
}

// Dùng thời gian tại đầu lần đọc để ưu tiên khóa nút sớm nếu response tốn thời gian truyền.
export function remainingMs(
    reading: TimedCoSign<CoSignDetail>,
    now: number,
): number {
    const { expiresAt, serverNow } = reading.snapshot;
    if (!expiresAt) return 0;
    const duration =
        Date.parse(expiresAt) -
        Date.parse(serverNow) -
        Math.max(0, now - reading.requestedAt);
    return Number.isFinite(duration) ? Math.max(0, duration) : 0;
}

// Chỉ cho phép thao tác hợp role trên snapshot pending và vẫn còn thời gian khi bấm.
export function allowedActions(
    role: FamilyRole,
    status: CoSignStatus,
    remaining: number,
): CoSignAction[] {
    if (status !== 'PENDING_REVIEW' || remaining <= 0) return [];
    return role === 'PARENT' ? ['CANCEL'] : ['APPROVE', 'BLOCK'];
}

// Ưu tiên version, rồi giờ Core đã đọc trạng thái, rồi thứ tự bắt đầu request.
// Core có thể trả EXPIRED cùng version trước khi worker ghi kết quả. Lần GET bắt đầu trước
// vẫn được nhận nếu Core hoàn tất sau deadline và đã đọc snapshot mới hơn.
export function newerDetail(
    current: TimedCoSign<CoSignDetail> | undefined,
    incoming: TimedCoSign<CoSignDetail>,
): TimedCoSign<CoSignDetail> {
    if (!current || current.snapshot.id !== incoming.snapshot.id)
        return incoming;
    if (incoming.snapshot.version !== current.snapshot.version)
        return incoming.snapshot.version > current.snapshot.version
            ? incoming
            : current;
    // List có thể trộn item từ các mẫu giờ khác nhau. Khi cùng version, Core đã đọc
    // qua deadline thì một bản PENDING cũ không được đưa yêu cầu về trước deadline.
    if (
        current.snapshot.status === 'EXPIRED' &&
        incoming.snapshot.status === 'PENDING_REVIEW'
    )
        return current;
    if (
        incoming.snapshot.status === 'EXPIRED' &&
        current.snapshot.status === 'PENDING_REVIEW'
    )
        return incoming;

    const currentCoreTime = Date.parse(current.snapshot.serverNow);
    const incomingCoreTime = Date.parse(incoming.snapshot.serverNow);
    if (!Number.isFinite(incomingCoreTime)) return current;
    if (!Number.isFinite(currentCoreTime)) return incoming;
    if (incomingCoreTime !== currentCoreTime)
        return incomingCoreTime > currentCoreTime ? incoming : current;
    return incoming.requestedAt >= current.requestedAt ? incoming : current;
}

// List dùng cursor mới nhất nhưng giữ trạng thái mới hơn nếu request của chính hàng đó về muộn.
export function newerPage(
    current: TimedCoSign<CoSignPage> | undefined,
    incoming: TimedCoSign<CoSignPage>,
): TimedCoSign<CoSignPage> {
    if (!current) return incoming;
    const items = new Map(
        current.snapshot.items.map((item) => [
            item.id,
            { ...item, serverNow: current.snapshot.serverNow },
        ]),
    );
    return {
        ...incoming,
        snapshot: {
            ...incoming.snapshot,
            items: incoming.snapshot.items.map(
                (item) =>
                    newerDetail(
                        items.has(item.id)
                            ? {
                                  snapshot: items.get(item.id)!,
                                  requestedAt: current.requestedAt,
                              }
                            : undefined,
                        {
                            snapshot: {
                                ...item,
                                serverNow: incoming.snapshot.serverNow,
                            },
                            requestedAt: incoming.requestedAt,
                        },
                    ).snapshot,
            ),
        },
    };
}

// Router chỉ mở yêu cầu có ID hợp lệ để tránh dựng REST path từ dữ liệu tùy ý.
export function isUuid(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
            value,
        )
    );
}
