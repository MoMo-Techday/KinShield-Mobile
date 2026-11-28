// Thẻ điều khiển Bảo vệ chat Zalo/SMS tự động + Nút Khiên nổi 1 chạm trên Android.
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
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
    getChatGuardStatus,
    getRecentChatAlerts,
    openNotificationAccessSettings,
    openOverlaySettings,
    startFloatingShield,
    stopFloatingShield,
    subscribeChatGuardAlerts,
    type ChatGuardStatus,
    type IncomingChatAlert,
} from '@/features/xray/native/chat-guard-bridge';
import { toast } from '@/lib/toast';

export function ChatGuardControlCard() {
    const router = useRouter();
    const [status, setStatus] = useState<ChatGuardStatus>({
        supported: Platform.OS === 'android',
        notificationAccessGranted: false,
        overlayPermissionGranted: false,
        postNotificationsGranted: false,
        floatingActive: false,
    });
    const [alerts, setAlerts] = useState<IncomingChatAlert[]>([]);
    const [busy, setBusy] = useState(false);

    const refreshStatus = useCallback(async () => {
        const [nextStatus, nextAlerts] = await Promise.all([
            getChatGuardStatus(),
            getRecentChatAlerts(),
        ]);
        setStatus(nextStatus);
        setAlerts(nextAlerts.slice(0, 3));
    }, []);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const [nextStatus, nextAlerts] = await Promise.all([
                getChatGuardStatus(),
                getRecentChatAlerts(),
            ]);
            if (!active) return;
            setStatus(nextStatus);
            setAlerts(nextAlerts.slice(0, 3));
        };

        void load();
        const unsubscribeAlerts = subscribeChatGuardAlerts((incoming) => {
            setAlerts((prev) =>
                [
                    incoming,
                    ...prev.filter((item) => item.id !== incoming.id),
                ].slice(0, 3),
            );
        });
        const appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                void load();
            }
        });
        return () => {
            active = false;
            unsubscribeAlerts();
            appStateSub.remove();
        };
    }, []);

    if (Platform.OS !== 'android') {
        return null;
    }

    const handleNotificationAccess = async () => {
        if (!status.supported) {
            toast.info('Cần cài bản APK KinShield mới nhất để dùng tính năng này.');
            return;
        }
        try {
            await openNotificationAccessSettings();
            toast.info('Hãy tìm "KinShield" và gạt BẬT quyền Truy cập thông báo.');
        } catch {
            toast.error('Không mở được cài đặt quyền thông báo.');
        }
    };

    const handleToggleFloating = async () => {
        if (!status.supported) {
            toast.info('Cần cài bản APK KinShield mới nhất để dùng Nút Khiên nổi.');
            return;
        }
        setBusy(true);
        try {
            if (status.floatingActive) {
                await stopFloatingShield();
                toast.info('Đã tắt Nút Khiên nổi.');
            } else if (!status.overlayPermissionGranted) {
                await openOverlaySettings();
                toast.info('Hãy bật "Hiển thị trên ứng dụng khác" cho KinShield rồi quay lại.');
            } else {
                const started = await startFloatingShield();
                if (started) {
                    toast.success('Đã bật Nút Khiên nổi "Soi AI" ở mép màn hình!');
                } else {
                    await openOverlaySettings();
                }
            }
        } catch {
            toast.error('Không thể bật/tắt Nút Khiên nổi lúc này.');
        } finally {
            setBusy(false);
            void refreshStatus();
        }
    };

    return (
        <Card className="gap-0 rounded-2xl border-border bg-card py-0">
            <CardHeader className="gap-1 px-5 pt-5">
                <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Soi trực tiếp khi đang nhắn Zalo / SMS
                </Text>
                <CardTitle className="text-base font-bold text-foreground">
                    Khiên bảo vệ chat &amp; Nút soi nổi
                </CardTitle>
                <CardDescription className="text-xs leading-4">
                    Lọc Tầng 1 ngay trên máy — tin nhắn thường không gửi đi đâu.
                    Chỉ cảnh báo khi có dấu hiệu lừa đảo hoặc khi bạn bấm nút Khiên.
                </CardDescription>
            </CardHeader>

            <CardContent className="gap-3 px-5 pb-5 pt-4">
                <View className="gap-2.5 rounded-xl border border-border bg-background p-3.5">
                    <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-1 gap-0.5">
                            <Text className="text-sm font-bold text-foreground">
                                Tự động soi tin nhắn Zalo / SMS mới
                            </Text>
                            <Text className="text-xs leading-4 text-muted-foreground">
                                Bật cảnh báo ngay khi nhận link lạ, .apk, đòi OTP hoặc giả công an/EVN.
                            </Text>
                        </View>
                        <View
                            className={`rounded-md px-2 py-0.5 ${
                                status.notificationAccessGranted
                                    ? 'bg-success'
                                    : 'bg-secondary'
                            }`}
                        >
                            <Text
                                className={`text-[11px] font-bold ${
                                    status.notificationAccessGranted
                                        ? 'text-success-foreground'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                {status.notificationAccessGranted ? 'ĐANG BẬT' : 'CHƯA BẬT'}
                            </Text>
                        </View>
                    </View>
                    <Button
                        variant={status.notificationAccessGranted ? 'outline' : 'default'}
                        className="h-10 w-full rounded-xl"
                        onPress={() => void handleNotificationAccess()}
                    >
                        <Text
                            className={`text-xs font-bold ${
                                status.notificationAccessGranted
                                    ? 'text-foreground'
                                    : 'text-primary-foreground'
                            }`}
                        >
                            {status.notificationAccessGranted
                                ? 'Quản lý quyền đọc thông báo'
                                : 'Bật soi tin nhắn Zalo / SMS tự động'}
                        </Text>
                    </Button>
                </View>

                <View className="gap-2.5 rounded-xl border border-border bg-background p-3.5">
                    <View className="flex-row items-center justify-between gap-2">
                        <View className="flex-1 gap-0.5">
                            <Text className="text-sm font-bold text-foreground">
                                Nút Khiên nổi 1 chạm (Soi ảnh Zalo / QR)
                            </Text>
                            <Text className="text-xs leading-4 text-muted-foreground">
                                Hiện nút &ldquo;Soi AI&rdquo; bên mép màn hình — chạm 1 cái để chụp nhanh và soi ngay.
                            </Text>
                        </View>
                        <View
                            className={`rounded-md px-2 py-0.5 ${
                                status.floatingActive ? 'bg-primary' : 'bg-secondary'
                            }`}
                        >
                            <Text
                                className={`text-[11px] font-bold ${
                                    status.floatingActive
                                        ? 'text-primary-foreground'
                                        : 'text-muted-foreground'
                                }`}
                            >
                                {status.floatingActive ? 'ĐANG HIỆN' : 'TẮT'}
                            </Text>
                        </View>
                    </View>
                    <Button
                        disabled={busy}
                        variant={status.floatingActive ? 'outline' : 'default'}
                        className="h-10 w-full rounded-xl"
                        onPress={() => void handleToggleFloating()}
                    >
                        <Text
                            className={`text-xs font-bold ${
                                status.floatingActive
                                    ? 'text-foreground'
                                    : 'text-primary-foreground'
                            }`}
                        >
                            {status.floatingActive
                                ? 'Tắt Nút Khiên nổi'
                                : status.overlayPermissionGranted
                                  ? 'Bật Nút Khiên nổi ngay'
                                  : 'Cấp quyền & Bật Nút Khiên nổi'}
                        </Text>
                    </Button>
                </View>

                {alerts.length > 0 && (
                    <View className="gap-2 border-t border-border pt-3">
                        <Text className="text-xs font-bold text-destructive">
                            Cảnh báo tin nhắn vừa phát hiện ({alerts.length})
                        </Text>
                        {alerts.map((alert) => (
                            <Pressable
                                key={alert.id}
                                onPress={() =>
                                    router.push({
                                        pathname: '/xray',
                                        params: {
                                            autoScan: '1',
                                            source: alert.appName,
                                            sender: alert.sender,
                                            text: alert.text,
                                        },
                                    })
                                }
                                className="gap-1 rounded-xl border border-destructive/30 bg-destructive/10 p-3"
                            >
                                <Text className="text-xs font-bold text-destructive">
                                    {alert.appName} • {alert.sender}
                                </Text>
                                <Text
                                    className="text-xs text-foreground"
                                    numberOfLines={2}
                                >
                                    {alert.reasons[0] ?? alert.text}
                                </Text>
                                <Text className="text-[11px] font-bold text-primary">
                                    Chạm để AI soi chi tiết →
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                )}
            </CardContent>
        </Card>
    );
}
