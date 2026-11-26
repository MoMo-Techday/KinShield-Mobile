// Gửi quyết định một lần, đối chiếu HTTP khi phản hồi không đến và khóa retry theo đúng action cũ.
import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { coSignApi } from '@/features/co-sign/api/co-sign-api';
import { coSignKeys } from '@/features/co-sign/utils/co-sign-queries';
import {
    allowedActions,
    newerDetail,
    remainingMs,
} from '@/features/co-sign/utils/co-sign-state';
import {
    classifyFamilyError,
    isUncertainError,
} from '@/features/co-sign/utils/co-sign-errors';
import type {
    CoSignAction,
    CoSignDetail,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';
import {
    useActiveFamily,
    useFamilyUser,
} from '@/features/family/hooks/family-context';
import { getSessionRevision } from '@/lib/api/client';

// Retry kiểm tra GET trước. Nếu request đã kết thúc thì hiển thị kết quả từ Core và không gửi PUT thứ hai.
export function useCoSignDecision(requestId: string) {
    const client = useQueryClient();
    const userId = useFamilyUser();
    const family = useActiveFamily();
    const key = coSignKeys.detail(userId, family.id, requestId);
    const lock = useRef(false);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const [uncertainAction, setUncertainAction] = useState<CoSignAction | null>(
        null,
    );

    // Chỉ hợp nhất snapshot mới hơn, rồi yêu cầu danh sách lấy lại trạng thái chuẩn.
    function save(reading: TimedCoSign<CoSignDetail>) {
        const remembered = client.setQueryData<TimedCoSign<CoSignDetail>>(
            key,
            (current) => newerDetail(current, reading),
        );
        void client.invalidateQueries({
            queryKey: coSignKeys.list(userId, family.id),
        });
        return remembered ?? reading;
    }

    // Kiểm tra lại trạng thái, role và mốc hết hạn tại lúc gửi. Mọi quyết định vẫn do Core xử lý.
    async function submit(action: CoSignAction) {
        if (lock.current || (uncertainAction && uncertainAction !== action))
            return;
        lock.current = true;
        setPending(true);
        setError(null);
        const revision = getSessionRevision();
        const startedAt = performance.now();
        let putStarted = false;
        try {
            const latest = uncertainAction
                ? await coSignApi.detail(family.id, requestId)
                : undefined;
            if (revision !== getSessionRevision()) return;
            const reading = latest
                ? save(latest)
                : client.getQueryData<TimedCoSign<CoSignDetail>>(key);
            if (
                !reading ||
                !allowedActions(
                    family.viewerRole,
                    reading.snapshot.status,
                    remainingMs(reading, performance.now()),
                ).includes(action)
            ) {
                if (reading?.snapshot.status !== 'PENDING_REVIEW')
                    setUncertainAction(null);
                await client.invalidateQueries({ queryKey: key });
                return;
            }
            putStarted = true;
            const result = await coSignApi.decide(family.id, requestId, action);
            if (revision !== getSessionRevision()) return;
            save(result);
            setUncertainAction(null);
        } catch (failure) {
            if (revision !== getSessionRevision()) return;
            const { kind, current } = classifyFamilyError(failure);
            if (current) save({ snapshot: current, requestedAt: startedAt });
            setError(failure);
            // Mất kết nối sau PUT có thể đã commit. Tự GET thử một lần rồi luôn giữ đúng action khi còn mơ hồ.
            if (isUncertainError(failure) && (putStarted || uncertainAction)) {
                setUncertainAction(action);
                try {
                    const result = await coSignApi.detail(family.id, requestId);
                    if (revision !== getSessionRevision()) return;
                    if (save(result).snapshot.status !== 'PENDING_REVIEW') {
                        setUncertainAction(null);
                        setError(null);
                    }
                } catch {
                    // Người dùng có thể đối chiếu lại khi mạng trở lại.
                }
            } else {
                setUncertainAction(null);
                if (
                    kind === 'expired' ||
                    kind === 'resolved' ||
                    kind === 'missing' ||
                    kind === 'forbidden'
                )
                    void client.invalidateQueries({ queryKey: key });
            }
        } finally {
            lock.current = false;
            setPending(false);
        }
    }

    return { pending, error, uncertainAction, submit };
}
