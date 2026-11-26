// React Query phục vụ các snapshot Core; version chống UI lùi khi HTTP và socket bất đồng bộ.
import {
    useInfiniteQuery,
    useQuery,
    type InfiniteData,
} from '@tanstack/react-query';
import { coSignApi } from '@/features/co-sign/api/co-sign-api';
import { coSignKeys } from '@/features/co-sign/utils/co-sign-queries';
import { newerDetail, newerPage } from '@/features/co-sign/utils/co-sign-state';
import { retryFamilyQuery } from '@/features/family/utils/family-queries';
import type {
    CoSignDetail,
    CoSignPage,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';

// Dùng cursor Core, tránh dữ liệu cũ ghi đè item đã được cập nhật trong cùng trang.
export function useCoSignList(userId: string, familyId: string) {
    return useInfiniteQuery({
        queryKey: coSignKeys.list(userId, familyId),
        queryFn: ({ pageParam, signal }) =>
            coSignApi.list(familyId, pageParam, signal),
        initialPageParam: null as string | null,
        getNextPageParam: ({ snapshot }) => snapshot.nextCursor ?? undefined,
        retry: retryFamilyQuery,
        refetchInterval: 12_000,
        structuralSharing(oldData, newData) {
            const old = oldData as
                | InfiniteData<TimedCoSign<CoSignPage>, string | null>
                | undefined;
            const next = newData as InfiniteData<
                TimedCoSign<CoSignPage>,
                string | null
            >;
            return old
                ? {
                      ...next,
                      pages: next.pages.map((page, index) =>
                          newerPage(
                              old.pages[
                                  old.pageParams.indexOf(next.pageParams[index])
                              ],
                              page,
                          ),
                      ),
                  }
                : next;
        },
    });
}

// Nếu socket không thể kết nối, GET theo nhịp vẫn xác nhận trạng thái và tự phục hồi khi có mạng.
export function useCoSignDetail(
    userId: string,
    familyId: string,
    requestId: string,
) {
    return useQuery({
        queryKey: coSignKeys.detail(userId, familyId, requestId),
        queryFn: ({ signal }) => coSignApi.detail(familyId, requestId, signal),
        retry: retryFamilyQuery,
        refetchInterval: 12_000,
        structuralSharing(oldData, newData) {
            return newerDetail(
                oldData as TimedCoSign<CoSignDetail> | undefined,
                newData as TimedCoSign<CoSignDetail>,
            );
        },
    });
}
