// Đọc lại quyền theo phiên hiện tại. Polling nhẹ phục hồi danh sách khi native mất mạng hoặc chưa có room.
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { familyApi } from '@/features/family/api/family-api';
import {
    familyKeys,
    retryFamilyQuery,
} from '@/features/family/utils/family-queries';

// Đồng bộ khi quay lại từ nền, kể cả nếu Android/iOS không gửi sự kiện online cho React Query.
function useForegroundRefresh(refresh: () => unknown) {
    useEffect(() => {
        const listener = AppState.addEventListener('change', (state) => {
            if (state === 'active') void refresh();
        });
        return () => listener.remove();
    }, [refresh]);
}

// Account và AbortSignal ngăn request danh sách cũ ghi vào phiên mới.
export function useFamilyList(userId: string) {
    const query = useQuery({
        queryKey: familyKeys.list(userId),
        queryFn: ({ signal }) => familyApi.list(signal),
        retry: retryFamilyQuery,
        refetchInterval: 15_000,
    });
    useForegroundRefresh(query.refetch);
    return query;
}

// Đọc lại membership dù không có event Co-Sign mới, ví dụ khi người thân vừa nhập mã.
export function useFamilyDetails(userId: string, familyId: string) {
    const query = useQuery({
        queryKey: familyKeys.membership(userId, familyId),
        queryFn: ({ signal }) => familyApi.get(familyId, signal),
        retry: retryFamilyQuery,
        refetchInterval: 10_000,
    });
    useForegroundRefresh(query.refetch);
    return query;
}
