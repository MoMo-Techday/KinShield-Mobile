// Đổi mốc server thành đồng hồ theo performance.now và gọi GET một lần khi UI chạm 0.
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { remainingMs } from '@/features/co-sign/utils/co-sign-state';
import type {
    CoSignDetail,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';

// UTC thiết bị không ảnh hưởng đếm ngược. Mỗi lần foreground đọc lại để bù thời gian ngủ của hệ điều hành.
export function useDeadline(
    reading: TimedCoSign<CoSignDetail> | undefined,
    refresh: () => unknown,
): number {
    const [tick, setTick] = useState(() => performance.now());
    const attempted = useRef<string | null>(null);
    const pending = reading?.snapshot.status === 'PENDING_REVIEW';
    const id = reading?.snapshot.id;
    const expiry = reading?.snapshot.expiresAt;
    const remaining = reading ? remainingMs(reading, tick) : 0;

    useEffect(() => {
        if (!pending) return;
        const timer = setInterval(() => setTick(performance.now()), 250);
        const listener = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                setTick(performance.now());
                void refresh();
            }
        });
        return () => {
            clearInterval(timer);
            listener.remove();
        };
    }, [pending, refresh]);

    useEffect(() => {
        if (!pending || remaining > 0 || !id || !expiry) return;
        const key = `${id}:${expiry}`;
        // Đã khóa nút tại 0; GET độc lập xác nhận kết quả cuối mà không tạo vòng lặp.
        if (attempted.current !== key) {
            attempted.current = key;
            void refresh();
        }
    }, [expiry, id, pending, refresh, remaining]);
    return remaining;
}
