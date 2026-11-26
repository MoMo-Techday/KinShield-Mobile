// Kiểm tra đồng hồ, quyền, idempotency và thứ tự dữ liệu Co-Sign độc lập giao diện.
import { describe, expect, it, vi } from 'vitest';
import {
    allowedActions,
    isNewUpdate,
    makeSimulationAttempt,
    newerDetail,
    newerPage,
    parseVnd,
    remainingMs,
} from '@/features/co-sign/utils/co-sign-state';
import type {
    CoSignDetail,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';

const detail: TimedCoSign<CoSignDetail> = {
    requestedAt: 100,
    snapshot: {
        id: '2f16bea1-05d2-40ad-b721-a959c28850b0',
        familyId: '2f16bea1-05d2-40ad-b721-a959c28850b1',
        amountVnd: 5_000_000,
        status: 'PENDING_REVIEW',
        reasonCodes: ['AMOUNT_THRESHOLD'],
        createdAt: '2026-11-26T10:00:00.000Z',
        expiresAt: '2026-11-26T10:03:00.000Z',
        decidedAt: null,
        serverNow: '2026-11-26T10:02:55.000Z',
        version: 1,
    },
};

describe('Co-Sign mobile state', () => {
    // Đồng hồ điện thoại lệch giờ vẫn dùng mốc Core và tick đơn điệu.
    it('clamps the server deadline at zero even when device wall time drifts', () => {
        const wall = vi
            .spyOn(Date, 'now')
            .mockReturnValue(Date.parse('2035-01-01T00:00:00Z'));
        try {
            expect(remainingMs(detail, 100)).toBe(5_000);
            expect(remainingMs(detail, 5_099)).toBe(1);
            expect(remainingMs(detail, 5_100)).toBe(0);
            expect(remainingMs(detail, 100_000)).toBe(0);
        } finally {
            wall.mockRestore();
        }
    });
    // Thiếu deadline hoặc sai mẫu đồng hồ Core phải khóa cả hai nút của người xác minh.
    it.each([
        { expiresAt: null, serverNow: detail.snapshot.serverNow },
        { expiresAt: 'invalid-deadline', serverNow: detail.snapshot.serverNow },
        { expiresAt: detail.snapshot.expiresAt, serverNow: 'invalid-clock' },
    ])(
        'keeps decision actions disabled for incomplete clock data %j',
        (clock) => {
            const reading = {
                ...detail,
                snapshot: { ...detail.snapshot, ...clock },
            };
            const remaining = remainingMs(reading, reading.requestedAt);
            expect(remaining).toBe(0);
            expect(
                allowedActions('GUARDIAN', reading.snapshot.status, remaining),
            ).toEqual([]);
        },
    );

    // Quyết định bị khóa tại đúng điểm hết hạn và với mọi trạng thái sau quyết định.
    it('grants only the actions for the active role and pending deadline', () => {
        expect(allowedActions('PARENT', 'PENDING_REVIEW', 1)).toEqual([
            'CANCEL',
        ]);
        expect(allowedActions('GUARDIAN', 'PENDING_REVIEW', 1)).toEqual([
            'APPROVE',
            'BLOCK',
        ]);
        expect(allowedActions('GUARDIAN', 'PENDING_REVIEW', 0)).toEqual([]);
        for (const state of [
            'EXPIRED',
            'APPROVED',
            'BLOCKED',
            'CANCELLED',
            'NOT_REQUIRED',
        ] as const) {
            expect(allowedActions('PARENT', state, 100)).toEqual([]);
            expect(allowedActions('GUARDIAN', state, 100)).toEqual([]);
        }
    });
    // Response version thấp hơn không được ghi đè kết quả, dù tới muộn và timestamp mới hơn.
    it('keeps version 2 against a delayed detail or list response', () => {
        const final: TimedCoSign<CoSignDetail> = {
            ...detail,
            requestedAt: 200,
            snapshot: { ...detail.snapshot, status: 'APPROVED', version: 2 },
        };
        expect(newerDetail(final, { ...detail, requestedAt: 300 })).toBe(final);
        const page = newerPage(
            {
                ...final,
                snapshot: {
                    items: [final.snapshot],
                    nextCursor: null,
                    serverNow: final.snapshot.serverNow,
                },
            },
            {
                ...detail,
                requestedAt: 300,
                snapshot: {
                    items: [detail.snapshot],
                    nextCursor: 'cursor',
                    serverNow: detail.snapshot.serverNow,
                },
            },
        );
        expect(page.snapshot.items[0]).toMatchObject({
            status: 'APPROVED',
            version: 2,
        });
        expect(page.snapshot.nextCursor).toBe('cursor');
    });
    // Cùng version, đồng hồ từ request cũ không kéo lùi mốc đã đọc ở request mới.
    it('rejects older samples and still accepts a later server clock at the same version', () => {
        const fresh = {
            ...detail,
            requestedAt: 200,
            snapshot: { ...detail.snapshot, serverNow: '2026-11-26T10:02:56Z' },
        };
        expect(newerDetail(fresh, detail)).toBe(fresh);
        expect(newerDetail(detail, fresh)).toBe(fresh);
        expect(remainingMs(fresh, 200)).toBe(4_000);
    });
    // GET bị chờ có thể bắt đầu sớm hơn nhưng Core đọc nó qua hạn và vẫn trả cùng version.
    it('applies a newer server expiry even when its HTTP request started first', () => {
        const latePending = { ...detail, requestedAt: 220 };
        const expired: TimedCoSign<CoSignDetail> = {
            requestedAt: 200,
            snapshot: {
                ...detail.snapshot,
                status: 'EXPIRED',
                decidedAt: detail.snapshot.expiresAt,
                serverNow: '2026-11-26T10:03:00Z',
            },
        };
        expect(newerDetail(latePending, expired)).toBe(expired);
        expect(newerDetail(expired, latePending)).toBe(expired);
    });

    // Nhiều response list đang bay có mốc Core khác nhau và cùng version trước khi worker commit.
    it('keeps a known expiry when multiple pending list responses arrive out of order', () => {
        const expired = {
            requestedAt: 200,
            snapshot: {
                items: [{ ...detail.snapshot, status: 'EXPIRED' as const }],
                nextCursor: null,
                serverNow: '2026-11-26T10:03:00Z',
            },
        };
        const pending = (requestedAt: number, serverNow: string) => ({
            requestedAt,
            snapshot: { items: [detail.snapshot], nextCursor: null, serverNow },
        });
        const afterOldPage = newerPage(
            expired,
            pending(210, '2026-11-26T10:02:55Z'),
        );
        const afterNewerButPendingPage = newerPage(
            afterOldPage,
            pending(220, '2026-11-26T10:02:58Z'),
        );
        expect(afterNewerButPendingPage.snapshot.items[0]).toMatchObject({
            status: 'EXPIRED',
            version: 1,
        });
    });

    // Event lặp, sai schema hoặc có version cũ phải bị bỏ qua trước khi invalidate query.
    it('filters duplicate and invalid events', () => {
        const update = {
            requestId: detail.snapshot.id,
            version: 2,
            status: 'APPROVED',
        };
        expect(isNewUpdate(update, 1)).toBe(true);
        expect(isNewUpdate(update, 2)).toBe(false);
        expect(isNewUpdate({ ...update, requestId: 'unknown' }, 1)).toBe(false);
        expect(isNewUpdate({ ...update, status: 'other' }, 1)).toBe(false);
    });
    // Nhãn được chuẩn hóa và mỗi giao dịch giữ một bộ key/ID bất biến cho retry.
    it('creates stable attempt data and validates VND input boundaries', () => {
        const uuid = vi
            .fn()
            .mockReturnValueOnce('key')
            .mockReturnValueOnce('transaction')
            .mockReturnValueOnce('recipient');
        const attempt = makeSimulationAttempt(5_000_000, ' Demo ', uuid);
        expect(attempt).toEqual({
            key: 'key',
            transfer: {
                transactionId: 'transaction',
                recipientRef: 'recipient',
                recipientLabel: 'Demo',
                recipientKnown: true,
                amountVnd: 5_000_000,
            },
        });
        expect(uuid).toHaveBeenCalledTimes(3);
        expect(parseVnd('500000', 500_000, 500_000_000)).toBe(500_000);
        expect(parseVnd('500000000', 500_000, 500_000_000)).toBe(500_000_000);
        for (const invalid of [
            '499999',
            '500000001',
            '5.000.000',
            '5e6',
            '',
            '-1',
        ]) {
            expect(parseVnd(invalid, 500_000, 500_000_000)).toBeNull();
        }
    });
});
