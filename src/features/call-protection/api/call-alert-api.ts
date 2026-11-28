import { apiClient } from '@/lib/api/client';
import type { CallAlertPage } from '@/features/call-protection/types/call-protection';

export const callAlertApi = {
    async list(
        familyId: string,
        cursor?: string | null,
        signal?: AbortSignal,
    ): Promise<CallAlertPage> {
        const { data } = await apiClient.get<CallAlertPage>(
            `/families/${familyId}/call-alerts`,
            {
                params: {
                    ...(cursor ? { cursor } : {}),
                    limit: 20,
                },
                signal,
            },
        );
        return data;
    },
};
