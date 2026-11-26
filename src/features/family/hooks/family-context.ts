// Hai layout lồng nhau trao tài khoản và membership đã đọc từ Core cho các màn con.
import { createContext, useContext } from 'react';
import type { FamilyDetails } from '@/features/family/types/family';

export const FamilyUserContext = createContext<string | null>(null);
export const FamilyDetailsContext = createContext<FamilyDetails | null>(null);

// Màn gia đình chỉ hiển thị sau khi layout đã biết user từ phiên Core.
export function useFamilyUser(): string {
    const userId = useContext(FamilyUserContext);
    if (!userId) throw new Error('Family user layout is required');
    return userId;
}

// Màn chi tiết chỉ hoạt động trong family đã xác nhận quyền hiện tại.
export function useActiveFamily(): FamilyDetails {
    const family = useContext(FamilyDetailsContext);
    if (!family) throw new Error('Family membership layout is required');
    return family;
}
