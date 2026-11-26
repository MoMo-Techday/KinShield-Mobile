// Kiểm tra cache của gia đình chỉ theo phiên sở hữu và bị xóa khi logout/đổi user.
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { familyKeys } from '@/features/family/utils/family-queries';
import { coSignKeys } from '@/features/co-sign/utils/co-sign-queries';
import { clearSessionQueries } from '@/lib/api/session-query';

describe('family session cache', () => {
    // Hai tài khoản có cùng family vẫn có khóa khác và toàn bộ dữ liệu phiên được dọn cùng nhau.
    it('isolates family snapshots and removes the private cache on account changes', async () => {
        const client = new QueryClient();
        client.setQueryData(familyKeys.list('a'), [{ id: 'family-a' }]);
        client.setQueryData(coSignKeys.detail('a', 'family-a', 'request'), {
            version: 2,
        });
        client.setQueryData(coSignKeys.detail('b', 'family-a', 'request'), {
            version: 1,
        });
        client.setQueryData(['public'], 'keep');
        expect(
            client.getQueryData(coSignKeys.detail('b', 'family-a', 'request')),
        ).toEqual({ version: 1 });
        await clearSessionQueries(client);
        expect(client.getQueryData(familyKeys.list('a'))).toBeUndefined();
        expect(
            client.getQueryData(coSignKeys.detail('b', 'family-a', 'request')),
        ).toBeUndefined();
        expect(client.getQueryData(['public'])).toBe('keep');
        client.clear();
    });
});
