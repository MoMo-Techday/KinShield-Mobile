// Route gốc khôi phục phiên native trước khi chọn màn hình đầu tiên.
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useRestoreSession } from '@/hooks/use-auth';
import { usesAuthCookies } from '@/lib/api/auth-transport';

// Đợi SecureStore trước khi chuyển hướng. Hồ sơ kiểm tra Bearer và refresh qua Core.
export default function Index() {
    const session = useRestoreSession();
    if (!usesAuthCookies && session.isPending) {
        return (
            <View className="flex-1 items-center justify-center bg-background">
                <ActivityIndicator accessibilityLabel="Đang kiểm tra phiên đăng nhập" />
            </View>
        );
    }
    return <Redirect href={session.data ? '/profile' : '/auth'} />;
}
