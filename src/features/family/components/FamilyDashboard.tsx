// Trang gia đình kết hợp thành viên, tạo mô phỏng và lịch sử theo quyền đã đọc từ Core.
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { FamilyPage } from '@/features/family/components/FamilyPage';
import { FamilyMembership } from '@/features/family/components/FamilyMembership';
import { useActiveFamily } from '@/features/family/hooks/family-context';
import { CoSignHistory } from '@/features/co-sign/components/CoSignHistory';
import { SimulationForm } from '@/features/co-sign/components/SimulationForm';

// PARENT tạo giao dịch, GUARDIAN vào danh sách yêu cầu được phép xác minh.
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
            {family.viewerRole === 'PARENT' && <SimulationForm />}
            <CoSignHistory />
            <FamilyMembership />
        </FamilyPage>
    );
}
