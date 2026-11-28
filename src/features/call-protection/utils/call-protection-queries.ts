import { familyKeys } from '@/features/family/utils/family-queries';

export const callAlertKeys = {
    all: (userId: string, familyId: string) =>
        [...familyKeys.scope(userId, familyId), 'call-alerts'] as const,
    list: (userId: string, familyId: string) =>
        [...callAlertKeys.all(userId, familyId), 'list'] as const,
};
