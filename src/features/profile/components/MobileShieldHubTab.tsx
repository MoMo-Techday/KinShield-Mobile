// Tab Bảo vệ 3 lớp trên Mobile: Soi 1 chạm X-Ray, Cảnh báo cuộc gọi, Vòng tròn Gia đình & công tắc bảo vệ đồng bộ Core.
import { Image, Linking, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { MOBILE_ILLUSTRATIONS } from '@/features/profile/constants/illustrations';
import {
    formatVnd,
    THRESHOLD_OPTIONS_VND,
} from '@/features/profile/utils/profile-extras';
import type {
    EmergencyContact,
    SafetyPreferences,
} from '@/features/profile/types/profile-extras';
import { ChatGuardControlCard } from '@/features/xray/components/ChatGuardControlCard';
import { toast } from '@/lib/toast';

interface MobileShieldHubTabProps {
    preferences: SafetyPreferences;
    emergencyContacts: EmergencyContact[];
    trustedAccountsCount: number;
    onOpenXRay: () => void;
    onOpenFamily: () => void;
    onOpenContacts: () => void;
    onUpdatePreferences: (patch: Partial<SafetyPreferences>) => void;
}

export function MobileShieldHubTab({
    preferences,
    emergencyContacts,
    trustedAccountsCount,
    onOpenXRay,
    onOpenFamily,
    onOpenContacts,
    onUpdatePreferences,
}: MobileShieldHubTabProps) {
    const bodyClass = preferences.largeTextMode ? 'text-base' : 'text-sm';
    const primaryContact = emergencyContacts[0] ?? null;

    const handleQuickCallFamily = () => {
        if (!primaryContact) {
            onOpenContacts();
            toast.info('Hãy thêm số người thân để gọi xác minh 1 chạm.');
            return;
        }
        void Linking.openURL(`tel:${primaryContact.phone}`);
    };

    const handleSelectThreshold = (amount: number) => {
        onUpdatePreferences({ coSignThresholdVnd: amount });
        toast.success(`Đã đặt ngưỡng hỏi ý người thân: ${formatVnd(amount)}`);
    };

    return (
        <View className="gap-4">
            {/* Layer 1 & Layer 3 Native Launchers */}
            <Card className="gap-0 rounded-2xl border-border bg-card py-0">
                <CardHeader className="gap-1 px-5 pt-5">
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        3 Lớp Khiên Gia Đình
                    </Text>
                    <CardTitle className="text-lg font-bold text-foreground">
                        Công cụ phòng vệ trực tiếp
                    </CardTitle>
                    <CardDescription className={bodyClass}>
                        Kiểm tra tin nhắn, hóa đơn, mã VietQR và kết nối xác
                        minh giao dịch cùng con cháu.
                    </CardDescription>
                </CardHeader>

                <CardContent className="gap-3 px-5 pb-5 pt-4">
                    <View className="gap-3 rounded-xl border border-border bg-background p-3.5">
                        <View className="flex-row items-center gap-3">
                            <Image
                                source={MOBILE_ILLUSTRATIONS.layerXray}
                                className="size-16 rounded-xl"
                                resizeMode="cover"
                                accessibilityLabel="Minh họa Soi 1 chạm X-Ray"
                            />
                            <View className="flex-1 gap-1">
                                <View className="flex-row items-center justify-between gap-2">
                                    <Text className="text-sm font-bold text-foreground">
                                        Lớp 1 · Soi 1 chạm X-Ray
                                    </Text>
                                    <View className="rounded-md bg-success px-2 py-0.5">
                                        <Text className="text-[11px] font-semibold text-success-foreground">
                                            Sẵn sàng
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-xs leading-4 text-muted-foreground">
                                    Chụp ảnh bill, quét mã VietQR, dán link hoặc
                                    chia sẻ từ Zalo để AI soi lừa đảo.
                                </Text>
                            </View>
                        </View>
                        <Button
                            className="h-11 w-full rounded-xl"
                            onPress={onOpenXRay}
                        >
                            <Text className="font-bold text-primary-foreground">
                                Mở Soi 1 chạm X-Ray
                            </Text>
                        </Button>
                    </View>

                    <View className="gap-3 rounded-xl border border-border bg-background p-3.5">
                        <View className="flex-row items-center gap-3">
                            <Image
                                source={MOBILE_ILLUSTRATIONS.layerCosign}
                                className="size-16 rounded-xl"
                                resizeMode="cover"
                                accessibilityLabel="Minh họa Vòng tròn Gia đình"
                            />
                            <View className="flex-1 gap-1">
                                <View className="flex-row items-center justify-between gap-2">
                                    <Text className="text-sm font-bold text-foreground">
                                        Lớp 3 · Vòng tròn Gia đình
                                    </Text>
                                    <View className="rounded-md bg-secondary px-2 py-0.5">
                                        <Text className="text-[11px] font-semibold text-secondary-foreground">
                                            {emergencyContacts.length} số ·{' '}
                                            {trustedAccountsCount} STK
                                        </Text>
                                    </View>
                                </View>
                                <Text className="text-xs leading-4 text-muted-foreground">
                                    Ghép đôi người bảo vệ, theo dõi cuộc gọi và
                                    đồng duyệt giao dịch lớn.
                                </Text>
                            </View>
                        </View>
                        <Button
                            variant="outline"
                            className="h-11 w-full rounded-xl"
                            onPress={onOpenFamily}
                        >
                            <Text className="font-bold text-foreground">
                                Mở Gia đình, Cuộc gọi &amp; Đồng duyệt
                            </Text>
                        </Button>
                    </View>
                </CardContent>
            </Card>

            {/* Android Live Chat Guard (Zalo/SMS NotificationListener + Floating Shield) */}
            <ChatGuardControlCard />

            {/* Layer 2 & 3 Protection Switches (Synced with Core) */}
            <Card className="gap-0 rounded-2xl border-border bg-card py-0">
                <CardHeader className="flex-row items-center gap-3 px-5 pt-5">
                    <Image
                        source={MOBILE_ILLUSTRATIONS.layerVoice}
                        className="size-12 rounded-xl"
                        resizeMode="cover"
                        accessibilityLabel="Minh họa Bảo vệ cuộc gọi"
                    />
                    <View className="flex-1 gap-0.5">
                        <CardTitle className="text-base font-bold text-foreground">
                            Cảnh báo cuộc gọi &amp; Đồng duyệt
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Đồng bộ tự động giữa điện thoại và Web.
                        </CardDescription>
                    </View>
                </CardHeader>

                <CardContent className="gap-3 px-5 pb-5 pt-4">
                    {(
                        [
                            {
                                key: 'voiceAlertsEnabled' as const,
                                title: 'Loa cảnh báo giọng nói tiếng Việt',
                                desc: 'Phát lời nhắc bình tĩnh khi phát hiện dấu hiệu lừa đảo',
                                value: preferences.voiceAlertsEnabled,
                            },
                            {
                                key: 'blockOtpInCalls' as const,
                                title: 'Chặn nhắc đọc 6 số OTP khi nghe máy',
                                desc: 'Cảnh báo ngay nếu người lạ hỏi mã xác thực ngân hàng',
                                value: preferences.blockOtpInCalls,
                            },
                            {
                                key: 'coSignAlertEnabled' as const,
                                title: 'Nhắc hỏi ý người thân khi chuyển tiền lớn',
                                desc: `Tự động nhắc đồng duyệt từ ${formatVnd(preferences.coSignThresholdVnd)} trở lên`,
                                value: preferences.coSignAlertEnabled,
                            },
                        ] as const
                    ).map((item) => (
                        <Pressable
                            key={item.key}
                            onPress={() =>
                                onUpdatePreferences({
                                    [item.key]: !item.value,
                                })
                            }
                            className={`flex-row items-center justify-between gap-3 rounded-xl border px-4 py-3.5 ${
                                item.value
                                    ? 'border-primary/40 bg-accent/60'
                                    : 'border-border bg-background'
                            }`}
                        >
                            <View className="flex-1 gap-0.5">
                                <Text
                                    className={`font-bold text-foreground ${bodyClass}`}
                                >
                                    {item.title}
                                </Text>
                                <Text className="text-xs leading-4 text-muted-foreground">
                                    {item.desc}
                                </Text>
                            </View>
                            <View
                                className={`rounded-md px-2.5 py-1 ${
                                    item.value ? 'bg-primary' : 'bg-secondary'
                                }`}
                            >
                                <Text
                                    className={`text-[11px] font-bold ${
                                        item.value
                                            ? 'text-primary-foreground'
                                            : 'text-muted-foreground'
                                    }`}
                                >
                                    {item.value ? 'ĐANG BẬT' : 'TẮT'}
                                </Text>
                            </View>
                        </Pressable>
                    ))}

                    <View className="gap-2 pt-2">
                        <Text className="text-xs font-bold text-foreground">
                            Ngưỡng giao dịch cần hỏi ý con:{' '}
                            <Text className="text-primary">
                                {formatVnd(preferences.coSignThresholdVnd)}
                            </Text>
                        </Text>
                        <View className="flex-row flex-wrap gap-2">
                            {THRESHOLD_OPTIONS_VND.map((amount) => {
                                const selected =
                                    preferences.coSignThresholdVnd === amount;
                                return (
                                    <Button
                                        key={amount}
                                        size="sm"
                                        variant={
                                            selected ? 'default' : 'outline'
                                        }
                                        className="rounded-lg"
                                        onPress={() =>
                                            handleSelectThreshold(amount)
                                        }
                                    >
                                        <Text
                                            className={`text-xs font-bold ${
                                                selected
                                                    ? 'text-primary-foreground'
                                                    : 'text-foreground'
                                            }`}
                                        >
                                            {formatVnd(amount)}
                                        </Text>
                                    </Button>
                                );
                            })}
                        </View>
                    </View>
                </CardContent>
            </Card>

            {/* Quick Emergency Verification Call */}
            <Card className="gap-0 rounded-2xl border-border bg-card py-0">
                <CardContent className="gap-3 px-5 py-5">
                    <View className="gap-0.5">
                        <Text className="text-base font-bold text-foreground">
                            Nghi ngờ cuộc gọi lạ? Gọi xác minh ngay!
                        </Text>
                        <Text className="text-xs leading-5 text-muted-foreground">
                            {primaryContact
                                ? `Liên hệ ưu tiên: ${primaryContact.name} (${primaryContact.relation}) — ${primaryContact.phone}`
                                : 'Chưa lưu số người thân khẩn cấp. Thêm ngay để gọi chỉ với 1 chạm.'}
                        </Text>
                    </View>
                    <Button
                        variant={primaryContact ? 'default' : 'outline'}
                        className="h-11 w-full rounded-xl"
                        onPress={handleQuickCallFamily}
                    >
                        <Text
                            className={`font-bold ${
                                primaryContact
                                    ? 'text-primary-foreground'
                                    : 'text-foreground'
                            }`}
                        >
                            {primaryContact
                                ? `Gọi ${primaryContact.name} ngay`
                                : 'Thêm số khẩn cấp trong Danh bạ'}
                        </Text>
                    </Button>
                </CardContent>
            </Card>
        </View>
    );
}
