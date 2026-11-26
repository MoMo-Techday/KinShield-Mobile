// Trang gia đình hiển thị vai trò và thành viên theo quyền đã đọc từ Core.
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { FamilyPage } from '@/features/family/components/FamilyPage';
import { FamilyMembership } from '@/features/family/components/FamilyMembership';
import { useActiveFamily } from '@/features/family/hooks/family-context';

// Hiển thị thông tin gia đình và vai trò của tài khoản đang xem.
export function FamilyDashboard() {
    const family = useActiveFamily();
    return (
        <FamilyPage>
            <View className="gap-2">
                <Text accessibilityRole="header" className="text-3xl font-bold">
                    {family.name}
                </Text>
                <Text className="text-base text-muted-foreground">
                    {family.viewerRole === 'PARENT'
                        ? 'Bạn là cha mẹ'
                        : 'Bạn là người xác minh'}
                </Text>
            </View>
            <FamilyMembership />
        </FamilyPage>
    );
}
