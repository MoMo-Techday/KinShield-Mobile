// Cài đặt cỡ chữ lớn cho ông bà, chế độ Sáng/Tối, ngưỡng bảo vệ, 5 nguyên tắc vàng & Nhật ký an toàn.
import { Pressable, Share, View } from 'react-native';
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
import {
    formatVnd,
    GOLDEN_SAFETY_RULES,
    THRESHOLD_OPTIONS_VND,
} from '@/features/profile/utils/profile-extras';
import type {
    SafetyPreferences,
    UserProfileExtras,
} from '@/features/profile/types/profile-extras';
import { toast } from '@/lib/toast';

interface ProfilePreferencesSectionProps {
    displayName: string;
    extras: UserProfileExtras;
    onUpdatePreferences: (patch: Partial<SafetyPreferences>) => void;
    onToggleRule: (ruleId: string) => void;
    onResetExtras: () => void;
}

export function ProfilePreferencesSection({
    displayName,
    extras,
    onUpdatePreferences,
    onToggleRule,
    onResetExtras,
}: ProfilePreferencesSectionProps) {
    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';
    const prefs = extras.preferences;
    const bodyClass = prefs.largeTextMode ? 'text-base' : 'text-sm';

    const handleShareSafetyCard = async () => {
        try {
            await Share.share({
                message: `Thẻ an toàn KinShield của ${extras.nickname || displayName} (${extras.familyRole}): "${extras.safetyNote}". Ngưỡng hỏi ý con: ${formatVnd(prefs.coSignThresholdVnd)}.`,
            });
        } catch {
            // Người dùng hủy chia sẻ
        }
    };

    return (
        <View className="gap-5">
            <Card className="gap-0 rounded-[28px] border-border bg-card py-0">
                <CardHeader className="gap-1.5 px-6 pt-6">
                    <CardTitle className="text-xl font-bold text-foreground">
                        Tùy chỉnh hiển thị &amp; bảo vệ
                    </CardTitle>
                    <CardDescription className={bodyClass}>
                        Bật chữ lớn cho ông bà, đổi Sáng/Tối và chọn ngưỡng cảnh
                        báo chuyển khoản.
                    </CardDescription>
                </CardHeader>

                <CardContent className="gap-3 px-6 pb-6 pt-4">
                    <Pressable
                        onPress={() =>
                            onUpdatePreferences({
                                largeTextMode: !prefs.largeTextMode,
                            })
                        }
                        className={`flex-row items-center justify-between rounded-2xl border px-4 py-3.5 ${
                            prefs.largeTextMode
                                ? 'border-primary bg-primary/10'
                                : 'border-border bg-background/70'
                        }`}
                    >
                        <View className="flex-1 pr-3">
                            <Text className={`font-bold text-foreground ${bodyClass}`}>
                                Chế độ Chữ lớn cho ông bà
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                Phóng to cỡ chữ đọc thoải mái hơn
                            </Text>
                        </View>
                        <Text className="text-xs font-extrabold text-primary">
                            {prefs.largeTextMode ? 'ĐANG BẬT' : 'TẮT'}
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setColorScheme(isDark ? 'light' : 'dark')}
                        className="flex-row items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3.5"
                    >
                        <View className="flex-1 pr-3">
                            <Text className={`font-bold text-foreground ${bodyClass}`}>
                                Giao diện {isDark ? 'Tối dịu' : 'Sáng ấm'}
                            </Text>
                            <Text className="text-xs text-muted-foreground">
                                Chạm để chuyển chế độ màu màn hình
                            </Text>
                        </View>
                        <Text className="text-xs font-extrabold text-primary">
                            Đổi ngay
                        </Text>
                    </Pressable>

                    {(
                        [
                            {
                                key: 'voiceAlertsEnabled' as const,
                                title: 'Nhắc cảnh báo giọng Việt ấm áp',
                                desc: 'Cảnh báo rõ ràng khi phát hiện dấu hiệu lừa đảo',
                            },
                            {
                                key: 'blockOtpInCalls' as const,
                                title: 'Nhắc giữ kín 6 số OTP trong cuộc gọi',
                                desc: 'Không bao giờ đọc mã xác thực cho người lạ',
                            },
                            {
                                key: 'coSignAlertEnabled' as const,
                                title: 'Hỏi ý con khi chuyển khoản lớn',
                                desc: 'Kích hoạt hạ nhiệt 180 giây trước khi gửi tiền',
                            },
                        ] as const
                    ).map((item) => {
                        const active = prefs[item.key];
                        return (
                            <Pressable
                                key={item.key}
                                onPress={() =>
                                    onUpdatePreferences({
                                        [item.key]: !active,
                                    })
                                }
                                className="flex-row items-center justify-between rounded-2xl border border-border bg-background/70 px-4 py-3.5"
                            >
                                <View className="flex-1 pr-3">
                                    <Text
                                        className={`font-bold text-foreground ${bodyClass}`}
                                    >
                                        {item.title}
                                    </Text>
                                    <Text className="text-xs text-muted-foreground">
                                        {item.desc}
                                    </Text>
                                </View>
                                <Text
                                    className={`text-xs font-extrabold ${
                                        active
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-muted-foreground'
                                    }`}
                                >
                                    {active ? 'BẬT' : 'TẮT'}
                                </Text>
                            </Pressable>
                        );
                    })}

                    <View className="gap-2.5 rounded-2xl border border-border bg-secondary/40 p-4">
                        <View className="flex-row items-center justify-between">
                            <Text className="text-xs font-extrabold uppercase text-muted-foreground">
                                Ngưỡng hỏi ý con
                            </Text>
                            <Text className="text-sm font-extrabold text-primary">
                                {formatVnd(prefs.coSignThresholdVnd)}
                            </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-2">
                            {THRESHOLD_OPTIONS_VND.map((amount) => (
                                <Button
                                    key={amount}
                                    size="sm"
                                    variant={
                                        prefs.coSignThresholdVnd === amount
                                            ? 'default'
                                            : 'outline'
                                    }
                                    className="rounded-full"
                                    onPress={() =>
                                        onUpdatePreferences({
                                            coSignThresholdVnd: amount,
                                        })
                                    }
                                >
                                    <Text
                                        className={`text-xs font-bold ${
                                            prefs.coSignThresholdVnd === amount
                                                ? 'text-primary-foreground'
                                                : 'text-foreground'
                                        }`}
                                    >
                                        {formatVnd(amount)}
                                    </Text>
                                </Button>
                            ))}
                        </View>
                    </View>
                </CardContent>
            </Card>

            <Card className="gap-0 rounded-[28px] border-border bg-card py-0">
                <CardHeader className="gap-1.5 px-6 pt-6">
                    <View className="flex-row items-center justify-between">
                        <CardTitle className="text-xl font-bold text-foreground">
                            5 nguyên tắc vàng cho ba mẹ
                        </CardTitle>
                        <Text className="text-xs font-extrabold text-primary">
                            {extras.acknowledgedRuleIds.length}/
                            {GOLDEN_SAFETY_RULES.length}
                        </Text>
                    </View>
                    <CardDescription className={bodyClass}>
                        Chạm vào từng điều để đánh dấu đã ghi nhớ.
                    </CardDescription>
                </CardHeader>
                <CardContent className="gap-2.5 px-6 pb-6 pt-4">
                    {GOLDEN_SAFETY_RULES.map((rule) => {
                        const done = extras.acknowledgedRuleIds.includes(
                            rule.id,
                        );
                        return (
                            <Pressable
                                key={rule.id}
                                onPress={() => onToggleRule(rule.id)}
                                className={`gap-1 rounded-2xl border p-3.5 ${
                                    done
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : 'border-border bg-background/70'
                                }`}
                            >
                                <Text
                                    className={`font-extrabold text-foreground ${bodyClass}`}
                                >
                                    {done ? '✓ ' : '○ '}
                                    {rule.title}
                                </Text>
                                <Text className="text-xs leading-5 text-muted-foreground">
                                    {rule.detail}
                                </Text>
                            </Pressable>
                        );
                    })}
                </CardContent>
            </Card>

            <Card className="gap-0 rounded-[28px] border-border bg-card py-0">
                <CardHeader className="gap-1 px-6 pt-6">
                    <CardTitle className="text-lg font-bold text-foreground">
                        Nhật ký &amp; Chia sẻ thẻ an toàn
                    </CardTitle>
                </CardHeader>
                <CardContent className="gap-3 px-6 pb-6 pt-3">
                    {extras.activityLog.slice(0, 5).map((item) => (
                        <View
                            key={item.id}
                            className="flex-row items-center justify-between gap-2 rounded-xl border border-border bg-background/60 px-3 py-2"
                        >
                            <Text className="flex-1 text-xs font-semibold text-foreground">
                                {item.message}
                            </Text>
                            <Text className="text-[10px] text-muted-foreground">
                                {new Intl.DateTimeFormat('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                }).format(new Date(item.timestamp))}
                            </Text>
                        </View>
                    ))}
                    <View className="flex-row gap-2.5 pt-1">
                        <Button
                            variant="secondary"
                            className="h-11 flex-1 rounded-xl"
                            onPress={() => void handleShareSafetyCard()}
                        >
                            <Text className="text-xs font-bold text-secondary-foreground">
                                Chia sẻ thẻ an toàn
                            </Text>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 rounded-xl px-4"
                            onPress={() => {
                                onResetExtras();
                                toast.success('Đã khôi phục cài đặt mặc định.');
                            }}
                        >
                            <Text className="text-xs font-semibold text-muted-foreground">
                                Đặt lại
                            </Text>
                        </Button>
                    </View>
                </CardContent>
            </Card>
        </View>
    );
}
