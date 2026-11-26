// Mọi route con dùng membership đã được Core xác nhận cho gia đình hiện tại.
import { Redirect, Slot, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import {
    FamilyDetailsContext,
    useFamilyUser,
} from '@/features/family/hooks/family-context';
import { useFamilyDetails } from '@/features/family/hooks/use-family';
import {
    FamilyIssue,
    FamilyPage,
} from '@/features/family/components/FamilyPage';
import { classifyFamilyError } from '@/features/co-sign/utils/co-sign-errors';
import { isUuid } from '@/features/co-sign/utils/co-sign-state';

// Cung cấp dữ liệu cho các màn trong phạm vi gia đình và ẩn khi Core xác nhận mất quyền.
function FamilyScope({ familyId }: { familyId: string }) {
    const userId = useFamilyUser();
    const family = useFamilyDetails(userId, familyId);
    const issue = family.isError
        ? classifyFamilyError(family.error).kind
        : null;
    const denied =
        issue === 'missing' ||
        issue === 'forbidden' ||
        issue === 'unauthorized';

    if (!family.data || denied) {
        return (
            <FamilyPage>
                {family.isError ? (
                    <FamilyIssue
                        error={family.error}
                        onRetry={family.refetch}
                    />
                ) : (
                    <ActivityIndicator accessibilityLabel="Đang kiểm tra quyền gia đình" />
                )}
            </FamilyPage>
        );
    }
    return (
        <FamilyDetailsContext value={family.data}>
            <Slot />
        </FamilyDetailsContext>
    );
}

// Chỉ tiếp nhận UUID từ URL; membership luôn do Core quyết định.
export default function FamilyScopeLayout() {
    const { familyId } = useLocalSearchParams<{ familyId: string }>();
    return isUuid(familyId) ? (
        <FamilyScope key={familyId} familyId={familyId} />
    ) : (
        <Redirect href="/family" />
    );
}
