// Phân loại lỗi HTTP để UI quyết định thử lại, đọc trạng thái hay quay về xác thực.
import { isAxiosError } from 'axios';
import type { CoSignDetail } from '@/features/co-sign/types/co-sign';

type ServiceError = { code?: string; current?: CoSignDetail };
export type FamilyErrorKind =
    | 'offline'
    | 'unavailable'
    | 'unauthorized'
    | 'forbidden'
    | 'missing'
    | 'expired'
    | 'resolved'
    | 'invalid-invite'
    | 'invite-ended'
    | 'guardian-required'
    | 'guardian-assigned'
    | 'rate-limit'
    | 'generic';

// Dùng code ổn định của Core trước HTTP status để phân biệt xung đột giống mã trạng thái.
export function classifyFamilyError(error: unknown): {
    kind: FamilyErrorKind;
    current?: CoSignDetail;
} {
    if (!isAxiosError<ServiceError>(error)) return { kind: 'generic' };
    const { response } = error;
    if (!response) return { kind: 'offline' };
    const current = response.data?.current;
    switch (response.data?.code) {
        case 'CO_SIGN_EXPIRED':
            return { kind: 'expired', current };
        case 'CO_SIGN_ALREADY_RESOLVED':
            return { kind: 'resolved', current };
        case 'FAMILY_INVITATION_NOT_FOUND':
            return { kind: 'invalid-invite' };
        case 'FAMILY_INVITATION_USED':
        case 'FAMILY_INVITATION_EXPIRED':
        case 'FAMILY_INVITATION_REVOKED':
            return { kind: 'invite-ended' };
        case 'GUARDIAN_REQUIRED':
            return { kind: 'guardian-required' };
        case 'FAMILY_GUARDIAN_ALREADY_ASSIGNED':
            return { kind: 'guardian-assigned' };
    }
    if (response.status === 401) return { kind: 'unauthorized' };
    if (response.status === 403) return { kind: 'forbidden' };
    if (response.status === 404) return { kind: 'missing' };
    if (response.status === 429) return { kind: 'rate-limit' };
    if (response.status >= 500) return { kind: 'unavailable' };
    return { kind: 'generic' };
}

// Một request lỗi truyền tải có thể đã commit. Người dùng phải đối chiếu hoặc retry cùng dữ liệu.
export function isUncertainError(error: unknown): boolean {
    const { kind } = classifyFamilyError(error);
    return kind === 'offline' || kind === 'unavailable';
}
