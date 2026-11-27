// Màn hình Soi 1 chạm X-Ray (Lớp 1): dán tin nhắn, link hoặc chuỗi VietQR để AI phân tích.
import { useMemo, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { XRayResultCard } from '@/features/xray/components/XRayResultCard';
import { useAnalyzeXRay } from '@/features/xray/hooks/use-xray';
import {
    parseMobileVietQr,
    XRAY_DEMO_PRESETS,
} from '@/features/xray/utils/vietqr';
import { getApiErrorMessage } from '@/lib/api/api-error';
import { THEME } from '@/lib/theme';

export function XRayScannerScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const analyzeMutation = useAnalyzeXRay();

    const offlineVietQr = useMemo(
        () => parseMobileVietQr(`${text} ${url}`),
        [text, url],
    );

    const canSubmit = text.trim().length > 0 || url.trim().length > 0;

    const handleAnalyze = () => {
        if (!canSubmit) return;
        analyzeMutation.mutate({
            text: text.trim() || undefined,
            url: url.trim() || undefined,
            vietQrPayload: offlineVietQr ? text.trim() : undefined,
        });
    };

    const handleReset = () => {
        setText('');
        setUrl('');
        analyzeMutation.reset();
    };

    return (
        <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
            <ScrollView contentContainerClassName="px-5 py-6">
                <View className="mx-auto w-full max-w-[520px] gap-5">
                    <Card className="gap-0 rounded-[28px] border-border bg-card py-0 shadow-xl shadow-primary/[0.06]">
                        <CardHeader className="gap-2 px-6 pt-6">
                            <Text className="text-xs font-extrabold uppercase tracking-[2px] text-primary">
                                Lớp 1 • Soi 1 chạm X-Ray
                            </Text>
                            <CardTitle className="text-2xl font-bold text-foreground">
                                Kiểm tra tin nhắn, link &amp; VietQR
                            </CardTitle>
                            <CardDescription className="leading-6 text-muted-foreground">
                                Dán tin nhắn Zalo, đường dẫn lạ hoặc chuỗi mã QR
                                để KinShield AI soi dấu hiệu lừa đảo trước khi
                                bấm hay chuyển khoản.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="gap-4 px-6 pb-6 pt-5">
                            <View className="gap-2">
                                <Text className="text-xs font-bold text-muted-foreground">
                                    Thử nhanh kịch bản phổ biến
                                </Text>
                                <View className="flex-row flex-wrap gap-2">
                                    {XRAY_DEMO_PRESETS.map((preset) => (
                                        <Button
                                            key={preset.id}
                                            variant="secondary"
                                            size="sm"
                                            className="rounded-full"
                                            onPress={() => {
                                                setText(preset.text);
                                                setUrl(preset.url);
                                                analyzeMutation.reset();
                                            }}
                                        >
                                            <Text className="text-xs font-bold text-secondary-foreground">
                                                {preset.label}
                                            </Text>
                                        </Button>
                                    ))}
                                </View>
                            </View>

                            <View className="gap-1.5">
                                <Text className="text-sm font-semibold text-foreground">
                                    Nội dung tin nhắn hoặc chuỗi VietQR
                                </Text>
                                <Input
                                    testID="xray-text-input"
                                    value={text}
                                    onChangeText={setText}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                    placeholder="Dán tin nhắn Zalo, SMS hoặc mã VietQR..."
                                    className="h-28 rounded-2xl py-3"
                                />
                            </View>

                            <View className="gap-1.5">
                                <Text className="text-sm font-semibold text-foreground">
                                    Đường dẫn web / tệp .apk (tùy chọn)
                                </Text>
                                <Input
                                    testID="xray-url-input"
                                    value={url}
                                    onChangeText={setUrl}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                    placeholder="https://..."
                                    className="h-12 rounded-2xl"
                                />
                            </View>

                            {offlineVietQr && (
                                <View className="gap-1 rounded-2xl border border-primary/25 bg-primary/5 p-3.5">
                                    <Text className="text-xs font-extrabold text-primary">
                                        Phát hiện VietQR tức thì (offline)
                                    </Text>
                                    <Text className="text-sm font-bold text-foreground">
                                        {offlineVietQr.bankName} • STK{' '}
                                        {offlineVietQr.accountNumber}
                                    </Text>
                                    {offlineVietQr.amountVnd !== null && (
                                        <Text className="text-xs font-semibold text-muted-foreground">
                                            Số tiền:{' '}
                                            {new Intl.NumberFormat('vi-VN').format(
                                                offlineVietQr.amountVnd,
                                            )}
                                            ₫
                                        </Text>
                                    )}
                                </View>
                            )}

                            {analyzeMutation.isError && (
                                <View className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3.5">
                                    <Text className="text-sm font-semibold text-destructive">
                                        {getApiErrorMessage(
                                            analyzeMutation.error,
                                        )}
                                    </Text>
                                </View>
                            )}

                            <View className="flex-row gap-3 pt-1">
                                <Button
                                    testID="xray-submit"
                                    disabled={
                                        !canSubmit || analyzeMutation.isPending
                                    }
                                    onPress={handleAnalyze}
                                    className="h-12 flex-1 rounded-xl"
                                >
                                    {analyzeMutation.isPending ? (
                                        <View className="flex-row items-center gap-2">
                                            <ActivityIndicator
                                                color={
                                                    THEME[
                                                        colorScheme ?? 'light'
                                                    ].primaryForeground
                                                }
                                            />
                                            <Text className="font-bold text-primary-foreground">
                                                Đang soi...
                                            </Text>
                                        </View>
                                    ) : (
                                        <Text className="font-bold text-primary-foreground">
                                            Soi ngay với AI
                                        </Text>
                                    )}
                                </Button>
                                {(canSubmit || analyzeMutation.data) && (
                                    <Button
                                        variant="outline"
                                        onPress={handleReset}
                                        className="h-12 rounded-xl px-4"
                                    >
                                        <Text className="font-semibold text-foreground">
                                            Xóa
                                        </Text>
                                    </Button>
                                )}
                            </View>
                        </CardContent>
                    </Card>

                    {analyzeMutation.data && (
                        <XRayResultCard
                            result={analyzeMutation.data}
                            onOpenFamily={() => router.push('/family')}
                        />
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}
