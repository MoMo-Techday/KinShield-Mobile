import { useEffect } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useCurrentUser } from '@/hooks/use-auth';
import { isUnauthorizedProfileError } from '@/lib/profile-state';

export default function ProfileScreen() {
  const router = useRouter();
  const query = useCurrentUser();
  const unauthorized = query.isError && isUnauthorizedProfileError(query.error);

  useEffect(() => {
    if (unauthorized) {
      router.replace('/auth');
    }
  }, [router, unauthorized]);

  if (query.isPending || unauthorized) {
    return (
      <SafeAreaView className="flex-1 bg-[#f9f6f0]">
        <View className="flex-1 items-center justify-center px-5">
          <Card className="w-full max-w-[460px] rounded-[28px] border-[#e5ddd0] bg-white shadow-xl shadow-[#264673]/[0.06]">
            <CardContent className="flex-row items-center gap-3 py-6">
              <ActivityIndicator color="#264673" />
              <Text accessibilityLiveRegion="polite" className="text-sm text-[#5a616d]">
                {unauthorized ? 'Đang chuyển đến trang đăng nhập...' : 'Đang tải hồ sơ...'}
              </Text>
            </CardContent>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  if (query.isError) {
    return (
      <SafeAreaView className="flex-1 bg-[#f9f6f0]">
        <View className="flex-1 items-center justify-center px-5">
          <Card className="w-full max-w-[460px] rounded-[28px] border-[#e5ddd0] bg-white shadow-xl shadow-[#264673]/[0.06]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-[#1e2229]">
                Không thể tải hồ sơ
              </CardTitle>
              <CardDescription className="leading-6 text-[#5a616d]">
                Vui lòng kiểm tra kết nối rồi thử lại.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                onPress={() => void query.refetch()}
                className="h-11 w-full rounded-xl bg-[#264673] active:bg-[#1c3559]"
              >
                <Text className="font-bold text-white">Thử lại</Text>
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
    <SafeAreaView className="flex-1 bg-[#f9f6f0]">
      <ScrollView contentContainerClassName="flex-grow justify-center px-5 py-8">
        <View className="mx-auto w-full max-w-[460px] gap-5">
          <View className="items-center gap-3">
            <View className="size-12 items-center justify-center rounded-2xl bg-[#264673]">
              <Text className="text-lg font-extrabold text-white">K</Text>
            </View>
            <Text className="text-xs font-extrabold tracking-[3px] text-[#264673]">
              KINSHIELD
            </Text>
          </View>
          <Card className="gap-0 rounded-[28px] border-[#e5ddd0] bg-white py-0 shadow-xl shadow-[#264673]/[0.06]">
            <CardHeader className="gap-2 px-6 pt-7">
              <CardTitle className="text-2xl font-bold text-[#1e2229]">
                Hồ sơ của bạn
              </CardTitle>
              <CardDescription className="leading-6 text-[#5a616d]">
                Thông tin tài khoản KinShield của bạn.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-7 pt-6">
              <View className="gap-5">
                <View className="gap-1 border-b border-[#efe9de] pb-4">
                  <Text className="text-sm text-[#5a616d]">Họ và tên</Text>
                  <Text className="font-semibold text-[#1e2229]">{user.displayName}</Text>
                </View>
                <View className="gap-1 border-b border-[#efe9de] pb-4">
                  <Text className="text-sm text-[#5a616d]">Email</Text>
                  <Text className="break-all font-semibold text-[#1e2229]">{user.email}</Text>
                </View>
                <View className="gap-1 border-b border-[#efe9de] pb-4">
                  <Text className="text-sm text-[#5a616d]">Trạng thái email</Text>
                  <Text className="font-semibold text-[#1e2229]">
                    {user.emailVerified ? 'Đã xác minh' : 'Chưa xác minh'}
                  </Text>
                </View>
                <View className="gap-1">
                  <Text className="text-sm text-[#5a616d]">Ngày tham gia</Text>
                  <Text className="font-semibold text-[#1e2229]">
                    {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'long' }).format(
                      new Date(user.createdAt),
                    )}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
