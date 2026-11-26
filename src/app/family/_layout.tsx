// Chỉ vào cây route Family sau khi Core xác nhận tài khoản; đổi user dựng lại layout và socket.
import { Redirect, Slot } from 'expo-router';
import { ActivityIndicator } from 'react-native';
import { useCurrentUser } from '@/hooks/use-auth';
import { isUnauthorizedProfileError } from '@/lib/profile-state';
import { FamilyUserContext } from '@/features/family/hooks/family-context';
import {
    FamilyIssue,
    FamilyPage,
} from '@/features/family/components/FamilyPage';

// Dùng cùng luồng refresh /me với hồ sơ để deep link không mở dữ liệu khi chưa có phiên.
export default function FamilyLayout() {
    const user = useCurrentUser();
    if (user.isError && isUnauthorizedProfileError(user.error))
        return <Redirect href="/auth" />;
    if (!user.data) {
        return (
            <FamilyPage>
                {user.isError ? (
                    <FamilyIssue error={user.error} onRetry={user.refetch} />
                ) : (
                    <ActivityIndicator accessibilityLabel="Đang kiểm tra phiên đăng nhập" />
                )}
            </FamilyPage>
        );
    }
    return (
        <FamilyUserContext value={user.data.id}>
            <Slot key={user.data.id} />
        </FamilyUserContext>
    );
}
