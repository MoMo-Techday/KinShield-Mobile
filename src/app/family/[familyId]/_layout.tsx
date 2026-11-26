// Mọi route Co-Sign con dùng cùng membership và socket trong phạm vi gia đình.
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
import { useCoSignRealtime } from '@/features/co-sign/hooks/use-co-sign-realtime';
import { classifyFamilyError } from '@/features/co-sign/utils/co-sign-errors';
import { isUuid } from '@/features/co-sign/utils/co-sign-state';

// Giữ một socket cho cả danh sách và chi tiết. Ẩn dữ liệu ngay khi API xác nhận mất quyền.
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
    useCoSignRealtime(userId, familyId, Boolean(family.data) && !denied);

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
