import { useInfiniteQuery } from '@tanstack/react-query';
import { callAlertApi } from '@/features/call-protection/api/call-alert-api';
import { callAlertKeys } from '@/features/call-protection/utils/call-protection-queries';
import { retryFamilyQuery } from '@/features/family/utils/family-queries';

export function useCallAlerts(
    userId: string,
    familyId: string,
    enabled = true,
) {
    return useInfiniteQuery({
        queryKey: callAlertKeys.list(userId, familyId),
        queryFn: ({ pageParam, signal }) =>
            callAlertApi.list(familyId, pageParam, signal),
        initialPageParam: null as string | null,
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        retry: retryFamilyQuery,
        enabled,
    });
}
