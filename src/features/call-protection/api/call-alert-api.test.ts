import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAlertApi } from '@/features/call-protection/api/call-alert-api';
import type { CallAlertPage } from '@/features/call-protection/types/call-protection';

const harness = vi.hoisted(() => ({
    get: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
    apiClient: { get: harness.get },
}));

const familyId = 'c444f6a0-d4e8-496e-8ca1-6f7f7293790c';
const page: CallAlertPage = {
    items: [
        {
            alertId: 'opaque-alert-id',
            riskScore: 97,
            stage: 4,
            createdAt: '2026-11-27T04:30:00.000Z',
        },
    ],
    nextCursor: 'opaque-next-cursor',
};

beforeEach(() => {
    harness.get.mockReset().mockResolvedValue({ data: page });
});

describe('call alert API', () => {
    it('requests the family alert page with limit 20 and the supplied cursor', async () => {
        const controller = new AbortController();
        await expect(
            callAlertApi.list(familyId, 'opaque-cursor', controller.signal),
        ).resolves.toEqual(page);
        expect(harness.get).toHaveBeenCalledWith(
            `/families/${familyId}/call-alerts`,
            {
                params: { cursor: 'opaque-cursor', limit: 20 },
                signal: controller.signal,
            },
        );
    });

    it('omits the cursor for the first page', async () => {
        await callAlertApi.list(familyId);
        expect(harness.get).toHaveBeenCalledWith(
            `/families/${familyId}/call-alerts`,
            { params: { limit: 20 } },
        );
    });
});
