// Modal quét mã VietQR / Quishing URL trực tiếp bằng camera của điện thoại.
import { useEffect, useRef } from 'react';
import { Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    CameraView,
    useCameraPermissions,
    type BarcodeScanningResult,
} from 'expo-camera';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

interface QrCameraModalProps {
    visible: boolean;
    onClose: () => void;
    onScanned: (data: string) => void;
}

export function QrCameraModal({
    visible,
    onClose,
    onScanned,
}: QrCameraModalProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const lockedRef = useRef(false);

    useEffect(() => {
        if (visible) {
            lockedRef.current = false;
        }
    }, [visible]);

    const handleBarcodeScanned = (event: BarcodeScanningResult) => {
        if (lockedRef.current) return;
        const value = event.data?.trim();
        if (!value) return;
        lockedRef.current = true;
        onScanned(value);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-row items-center justify-between border-b border-border px-5 py-4">
                    <View className="gap-0.5">
                        <Text className="text-lg font-extrabold text-foreground">
                            Quét mã VietQR / Link QR
                        </Text>
                        <Text className="text-xs text-muted-foreground">
                            Đưa mã QR vào giữa khung để KinShield đọc hộ
                        </Text>
                    </View>
                    <Button variant="outline" size="sm" onPress={onClose}>
                        <Text className="font-bold text-foreground">Đóng</Text>
                    </Button>
                </View>

                {!permission?.granted ? (
                    <View className="flex-1 items-center justify-center gap-4 px-6">
                        <Text className="text-center text-base font-semibold leading-6 text-foreground">
                            KinShield cần quyền máy ảnh để quét mã QR thanh toán
                            hoặc đường dẫn nghi ngờ lừa đảo.
                        </Text>
                        <Button
                            className="h-12 w-full max-w-[300px] rounded-xl"
                            onPress={() => void requestPermission()}
                        >
                            <Text className="font-bold text-primary-foreground">
                                Cho phép dùng máy ảnh
                            </Text>
                        </Button>
                    </View>
                ) : (
                    <View className="flex-1">
                        <CameraView
                            style={{ flex: 1 }}
                            facing="back"
                            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            onBarcodeScanned={handleBarcodeScanned}
                        />
                        <View className="border-t border-border bg-card px-5 py-4">
                            <Text className="text-center text-sm font-semibold text-muted-foreground">
                                Giữ máy ổn định — KinShield sẽ tự giải mã ngân
                                hàng &amp; STK ngay khi quét được.
                            </Text>
                        </View>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
}
