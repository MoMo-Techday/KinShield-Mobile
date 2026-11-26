// Hồ sơ của phiên hiện tại và lối vào các tính năng yêu cầu đăng nhập.
import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { isUnauthorizedProfileError } from '@/lib/profile-state';
import { THEME } from '@/lib/theme';

// Chỉ mở gia đình khi hồ sơ đã xác nhận user; đăng xuất điều hướng về auth.
export default function ProfileScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const query = useCurrentUser();
    const logoutMutation = useLogout();
    const unauthorized =
        query.isError && isUnauthorizedProfileError(query.error);

    useEffect(() => {
        if (unauthorized || logoutMutation.isSuccess) {
            router.replace('/auth');
        }
    }, [logoutMutation.isSuccess, router, unauthorized]);

    if (query.isPending || unauthorized) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center px-5">
                    <Card className="w-full max-w-[460px] rounded-[28px] border-border bg-card shadow-xl shadow-primary/[0.06]">
                        <CardContent className="flex-row items-center gap-3 py-6">
                            <ActivityIndicator
                                color={THEME[colorScheme ?? 'light'].primary}
                            />
                            <Text
                                accessibilityLiveRegion="polite"
                                className="text-sm text-muted-foreground"
                            >
                                {unauthorized
                                    ? 'Đang chuyển đến trang đăng nhập...'
                                    : 'Đang tải hồ sơ...'}
                            </Text>
                        </CardContent>
                    </Card>
                </View>
            </SafeAreaView>
        );
    }

    if (query.isError) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center px-5">
                    <Card className="w-full max-w-[460px] rounded-[28px] border-border bg-card shadow-xl shadow-primary/[0.06]">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-foreground">
                                Không thể tải hồ sơ
                            </CardTitle>
                            <CardDescription className="leading-6 text-muted-foreground">
                                Vui lòng kiểm tra kết nối rồi thử lại.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Button
                                onPress={() => void query.refetch()}
                                className="h-11 w-full rounded-xl bg-primary active:bg-primary/90"
                            >
                                <Text className="font-bold text-primary-foreground">
                                    Thử lại
                                </Text>
                            </Button>
                        </CardContent>
                    </Card>
                </View>
            </SafeAreaView>
        );
    }

    const user = query.data;
    if (!user) {
        return null;
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8">
                <View className="mx-auto w-full max-w-[460px] gap-5">
                    <View className="items-center gap-3">
                        <View className="size-12 items-center justify-center rounded-2xl bg-primary">
                            <Text className="text-lg font-extrabold text-primary-foreground">
                                K
                            </Text>
                        </View>
                        <Text className="text-xs font-extrabold tracking-[3px] text-primary">
                            KINSHIELD
                        </Text>
                    </View>
                    <Card className="gap-0 rounded-[28px] border-border bg-card py-0 shadow-xl shadow-primary/[0.06]">
                        <CardHeader className="gap-2 px-6 pt-7">
                            <CardTitle className="text-2xl font-bold text-foreground">
                                Hồ sơ của bạn
                            </CardTitle>
                            <CardDescription className="leading-6 text-muted-foreground">
                                Thông tin tài khoản KinShield của bạn.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-7 pt-6">
                            <View className="gap-5">
                                <View className="gap-1 border-b border-border pb-4">
                                    <Text className="text-sm text-muted-foreground">
                                        Họ và tên
                                    </Text>
                                    <Text className="font-semibold text-foreground">
                                        {user.displayName}
                                    </Text>
                                </View>
                                <View className="gap-1 border-b border-border pb-4">
                                    <Text className="text-sm text-muted-foreground">
                                        Email
                                    </Text>
                                    <Text className="break-all font-semibold text-foreground">
                                        {user.email}
                                    </Text>
                                </View>
                                <View className="gap-1 border-b border-border pb-4">
                                    <Text className="text-sm text-muted-foreground">
                                        Trạng thái email
                                    </Text>
                                    <Text className="font-semibold text-foreground">
                                        {user.emailVerified
                                            ? 'Đã xác minh'
                                            : 'Chưa xác minh'}
                                    </Text>
                                </View>
                                <View className="gap-1">
                                    <Text className="text-sm text-muted-foreground">
                                        Ngày tham gia
                                    </Text>
                                    <Text className="font-semibold text-foreground">
                                        {new Intl.DateTimeFormat('vi-VN', {
                                            dateStyle: 'long',
                                        }).format(new Date(user.createdAt))}
                                    </Text>
                                </View>
                            </View>
                            <Button
                                testID="open-family"
                                className="mt-6 h-auto min-h-12 w-full rounded-xl"
                                onPress={() => router.push('/family')}
                            >
                                <Text className="font-bold text-primary-foreground">
                                    Gia đình và xác minh
                                </Text>
                            </Button>
                            <Button
                                variant="destructive"
                                disabled={logoutMutation.isPending}
                                onPress={() => logoutMutation.mutate()}
                                className="mt-6 h-12 w-full rounded-xl"
                            >
                                <Text className="font-bold text-destructive-foreground">
                                    {logoutMutation.isPending
                                        ? 'Đang đăng xuất...'
                                        : 'Đăng xuất'}
                                </Text>
                            </Button>
                        </CardContent>
                    </Card>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
