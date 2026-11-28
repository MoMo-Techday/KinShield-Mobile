import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCallAlerts } from '@/features/call-protection/hooks/use-call-alerts';
import { callAlertKeys } from '@/features/call-protection/utils/call-protection-queries';
import type { CallAlertPage } from '@/features/call-protection/types/call-protection';

const harness = vi.hoisted(() => ({
    useInfiniteQuery: vi.fn(),
    list: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
    useInfiniteQuery: harness.useInfiniteQuery,
}));
vi.mock('@/features/call-protection/api/call-alert-api', () => ({
    callAlertApi: { list: harness.list },
}));

const firstPage: CallAlertPage = {
    items: [],
    nextCursor: 'next-page',
};
const finalPage: CallAlertPage = { items: [], nextCursor: null };

beforeEach(() => {
    harness.useInfiniteQuery.mockReset().mockReturnValue({});
    harness.list.mockReset().mockResolvedValue(firstPage);
});

describe('useCallAlerts', () => {
    it('uses the family-scoped key and fetches the first page without a cursor', async () => {
        useCallAlerts('user-a', 'family-a');
        const options = harness.useInfiniteQuery.mock.calls[0][0];
        const signal = new AbortController().signal;

        expect(options.queryKey).toEqual(
            callAlertKeys.list('user-a', 'family-a'),
        );
        expect(options.initialPageParam).toBeNull();
        await options.queryFn({ pageParam: null, signal });
        expect(harness.list).toHaveBeenCalledWith(
            'family-a',
            null,
            signal,
        );
    });

    it('forwards nextCursor and stops when the page cursor is null', async () => {
        useCallAlerts('user-a', 'family-a');
        const options = harness.useInfiniteQuery.mock.calls[0][0];
        const signal = new AbortController().signal;

        await options.queryFn({ pageParam: 'next-page', signal });
        expect(harness.list).toHaveBeenCalledWith(
            'family-a',
            'next-page',
            signal,
        );
        expect(options.getNextPageParam(firstPage)).toBe('next-page');
        expect(options.getNextPageParam(finalPage)).toBeUndefined();
    });

    it('can disable fetching outside the Guardian role', () => {
        useCallAlerts('user-a', 'family-a', false);
        expect(harness.useInfiniteQuery.mock.calls[0][0].enabled).toBe(false);
    });
});
