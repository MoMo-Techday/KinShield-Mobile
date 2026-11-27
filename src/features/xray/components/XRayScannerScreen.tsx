// Màn hình Soi 1 chạm X-Ray (Lớp 1): chọn/chụp ảnh bill, quét mã QR, nhận chia sẻ từ Zalo hoặc dán tin nhắn.
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
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
import { QrCameraModal } from '@/features/xray/components/QrCameraModal';
import { XRayResultCard } from '@/features/xray/components/XRayResultCard';
import { useAnalyzeXRay } from '@/features/xray/hooks/use-xray';
import {
    normalizeXRayImageMime,
    readSharedImageAsBase64,
    type AllowedXRayImageMime,
} from '@/features/xray/utils/image-helpers';
import {
    parseMobileVietQr,
    XRAY_DEMO_PRESETS,
} from '@/features/xray/utils/vietqr';
import { getApiErrorMessage } from '@/lib/api/api-error';
import { THEME } from '@/lib/theme';

interface AttachedImage {
    uri: string;
    base64: string;
    mime: AllowedXRayImageMime;
    label: string;
}

export function XRayScannerScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const { hasShareIntent, shareIntent, resetShareIntent } =
        useShareIntentContext();

    const [text, setText] = useState('');
    const [url, setUrl] = useState('');
    const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(
        null,
    );
    const [sourceNotice, setSourceNotice] = useState<string | null>(null);
    const [pickerError, setPickerError] = useState<string | null>(null);
    const [qrModalVisible, setQrModalVisible] = useState(false);

    const analyzeMutation = useAnalyzeXRay();
    const resetMutation = analyzeMutation.reset;

    // Tự nạp ảnh / tin nhắn / link khi người dùng chia sẻ trực tiếp từ Zalo sang KinShield.
    useEffect(() => {
        if (!hasShareIntent) return;
        let cancelled = false;

        const consumeShareIntent = async () => {
            if (shareIntent.text) {
                setText(shareIntent.text);
            }
            if (shareIntent.webUrl) {
                setUrl(shareIntent.webUrl);
            }

            const firstFile = shareIntent.files?.[0];
            if (firstFile?.path && firstFile.mimeType?.startsWith('image/')) {
                const base64 = await readSharedImageAsBase64(firstFile.path);
                if (!cancelled && base64) {
                    const uri =
                        firstFile.path.startsWith('file://') ||
                        firstFile.path.startsWith('content://')
                            ? firstFile.path
                            : `file://${firstFile.path}`;
                    setAttachedImage({
                        uri,
                        base64,
                        mime: normalizeXRayImageMime(
                            firstFile.mimeType,
                            firstFile.fileName,
                        ),
                        label: firstFile.fileName || 'Ảnh chia sẻ từ ứng dụng',
                    });
                }
            }

            if (!cancelled) {
                setSourceNotice(
                    'Đã nhận nội dung chia sẻ từ Zalo/ứng dụng khác — bấm "Soi ngay với AI" để kiểm tra.',
                );
                resetMutation();
                resetShareIntent();
            }
        };

        void consumeShareIntent();
        return () => {
            cancelled = true;
        };
    }, [hasShareIntent, resetMutation, resetShareIntent, shareIntent]);

    const offlineVietQr = useMemo(
        () => parseMobileVietQr(`${text} ${url}`),
        [text, url],
    );

    const canSubmit =
        text.trim().length > 0 ||
        url.trim().length > 0 ||
        attachedImage !== null;

    const handlePickImage = async (source: 'library' | 'camera') => {
        setPickerError(null);
        try {
            if (source === 'camera') {
                const perm = await ImagePicker.requestCameraPermissionsAsync();
                if (!perm.granted) {
                    setPickerError(
                        'Chưa có quyền máy ảnh. Vui lòng cấp quyền để chụp ảnh biên lai.',
                    );
                    return;
                }
            } else {
                const perm =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!perm.granted) {
                    setPickerError(
                        'Chưa có quyền thư viện ảnh. Vui lòng cấp quyền để chọn ảnh biên lai.',
                    );
                    return;
                }
            }

            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                base64: true,
                quality: 0.75,
                allowsEditing: false,
            };
            const result =
                source === 'camera'
                    ? await ImagePicker.launchCameraAsync(options)
                    : await ImagePicker.launchImageLibraryAsync(options);

            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset?.base64) {
                setPickerError('Không đọc được dữ liệu ảnh. Vui lòng chọn ảnh khác.');
                return;
            }

            setAttachedImage({
                uri: asset.uri,
                base64: asset.base64,
                mime: normalizeXRayImageMime(asset.mimeType, asset.fileName),
                label:
                    asset.fileName ||
                    (source === 'camera'
                        ? 'Ảnh vừa chụp'
                        : 'Ảnh từ thư viện'),
            });
            setSourceNotice(null);
            analyzeMutation.reset();
        } catch {
            setPickerError('Không thể mở thư viện/máy ảnh lúc này.');
        }
    };

    const handleQrScanned = (scanned: string) => {
        setPickerError(null);
        const isHttpUrl = /^https?:\/\//i.test(scanned);
        if (isHttpUrl) {
            setUrl(scanned);
            setSourceNotice('Đã quét đường dẫn từ mã QR — bấm "Soi ngay với AI".');
        } else {
            setText(scanned);
            setSourceNotice('Đã quét mã QR — kiểm tra thông tin giải mã bên dưới.');
        }
        analyzeMutation.reset();
    };

    const handleAnalyze = () => {
        if (!canSubmit) return;
        analyzeMutation.mutate({
            text: text.trim() || undefined,
            url: url.trim() || undefined,
            vietQrPayload: offlineVietQr ? text.trim() : undefined,
            imageBase64: attachedImage?.base64,
            imageMime: attachedImage?.mime,
        });
    };

    const handleReset = () => {
        setText('');
        setUrl('');
        setAttachedImage(null);
        setSourceNotice(null);
        setPickerError(null);
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
                                Soi ảnh Bill, mã QR &amp; tin nhắn
                            </CardTitle>
                            <CardDescription className="leading-6 text-muted-foreground">
                                Chọn ảnh biên lai, quét mã VietQR, chia sẻ thẳng
                                từ Zalo hoặc dán tin nhắn để KinShield AI soi
                                dấu hiệu lừa đảo trước khi chuyển tiền.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="gap-4 px-6 pb-6 pt-5">
                            {/* 3 Nút thao tác nhanh trên điện thoại */}
                            <View className="flex-row gap-2">
                                <Button
                                    testID="xray-pick-photo"
                                    variant="outline"
                                    className="h-11 flex-1 rounded-xl px-2"
                                    onPress={() =>
                                        void handlePickImage('library')
                                    }
                                >
                                    <Text className="text-xs font-bold text-foreground">
                                        Chọn ảnh bill
                                    </Text>
                                </Button>
                                <Button
                                    testID="xray-take-photo"
                                    variant="outline"
                                    className="h-11 flex-1 rounded-xl px-2"
                                    onPress={() =>
                                        void handlePickImage('camera')
                                    }
                                >
                                    <Text className="text-xs font-bold text-foreground">
                                        Chụp ảnh
                                    </Text>
                                </Button>
                                <Button
                                    testID="xray-scan-qr"
                                    variant="secondary"
                                    className="h-11 flex-1 rounded-xl px-2"
                                    onPress={() => setQrModalVisible(true)}
                                >
                                    <Text className="text-xs font-bold text-primary">
                                        Quét mã QR
                                    </Text>
                                </Button>
                            </View>

                            {sourceNotice && (
                                <View className="rounded-2xl border border-primary/25 bg-primary/5 px-3.5 py-2.5">
                                    <Text className="text-xs font-semibold leading-5 text-primary">
                                        {sourceNotice}
                                    </Text>
                                </View>
                            )}

                            {pickerError && (
                                <View className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5">
                                    <Text className="text-xs font-semibold text-destructive">
                                        {pickerError}
                                    </Text>
                                </View>
                            )}

                            {attachedImage && (
                                <View className="gap-2.5 rounded-2xl border border-border bg-secondary/40 p-3">
                                    <View className="flex-row items-center justify-between gap-2">
                                        <Text
                                            className="flex-1 text-xs font-bold text-foreground"
                                            numberOfLines={1}
                                        >
                                            Ảnh đính kèm: {attachedImage.label}
                                        </Text>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onPress={() =>
                                                setAttachedImage(null)
                                            }
                                        >
                                            <Text className="text-xs font-bold text-destructive">
                                                Gỡ ảnh
                                            </Text>
                                        </Button>
                                    </View>
                                    <Image
                                        source={{ uri: attachedImage.uri }}
                                        className="h-44 w-full rounded-xl bg-background"
                                        resizeMode="contain"
                                        accessibilityLabel="Ảnh biên lai cần kiểm tra"
                                    />
                                </View>
                            )}

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
                                                setSourceNotice(null);
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
                                    placeholder="Dán tin nhắn Zalo, SMS hoặc quét mã VietQR..."
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

            <QrCameraModal
                visible={qrModalVisible}
                onClose={() => setQrModalVisible(false)}
                onScanned={handleQrScanned}
            />
        </SafeAreaView>
    );
}
