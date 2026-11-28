// Modal đổi ảnh đại diện trên điện thoại: chọn ảnh thư viện, chụp ảnh 1:1 hoặc chọn biểu tượng gia đình.
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MobileAvatarDisplay } from '@/features/profile/components/MobileAvatarDisplay';
import {
    AVATAR_FRAME_TONES,
    AVATAR_PRESETS,
} from '@/features/profile/utils/profile-extras';
import type {
    AvatarFrameTone,
    AvatarPresetId,
} from '@/features/profile/types/profile-extras';
import { toast } from '@/lib/toast';

interface AvatarPickerSheetProps {
    visible: boolean;
    name: string;
    customUri: string | null;
    presetId: AvatarPresetId | null;
    frame: AvatarFrameTone;
    onClose: () => void;
    onSelectCustomUri: (uri: string) => void;
    onSelectPreset: (presetId: AvatarPresetId) => void;
    onSelectFrame: (frame: AvatarFrameTone) => void;
    onClearAvatar: () => void;
}

export function AvatarPickerSheet({
    visible,
    name,
    customUri,
    presetId,
    frame,
    onClose,
    onSelectCustomUri,
    onSelectPreset,
    onSelectFrame,
    onClearAvatar,
}: AvatarPickerSheetProps) {
    const [picking, setPicking] = useState(false);

    const handlePickPhoto = async (source: 'library' | 'camera') => {
        setPicking(true);
        try {
            const perm =
                source === 'camera'
                    ? await ImagePicker.requestCameraPermissionsAsync()
                    : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (!perm.granted) {
                toast.error(
                    source === 'camera'
                        ? 'Cần quyền máy ảnh để chụp ảnh đại diện.'
                        : 'Cần quyền thư viện ảnh để chọn ảnh đại diện.',
                );
                return;
            }

            const options: ImagePicker.ImagePickerOptions = {
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.65,
                base64: true,
            };

            const result =
                source === 'camera'
                    ? await ImagePicker.launchCameraAsync(options)
                    : await ImagePicker.launchImageLibraryAsync(options);

            if (result.canceled) return;
            const asset = result.assets?.[0];
            if (!asset) return;

            const uri = asset.base64
                ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
                : asset.uri;
            onSelectCustomUri(uri);
            toast.success('Đã đổi ảnh đại diện mới!');
        } catch {
            toast.error('Không thể mở thư viện hoặc máy ảnh lúc này.');
        } finally {
            setPicking(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView className="flex-1 bg-background">
                <ScrollView contentContainerClassName="px-5 py-6">
                    <View className="mx-auto w-full max-w-[460px] gap-6">
                        <View className="flex-row items-center justify-between gap-3">
                            <Text className="text-xl font-extrabold text-foreground">
                                Đổi ảnh đại diện
                            </Text>
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-full px-4"
                                onPress={onClose}
                            >
                                <Text className="font-bold text-foreground">
                                    Xong
                                </Text>
                            </Button>
                        </View>
                        <View className="items-center gap-4 rounded-[28px] border border-border bg-card p-6">
                            <MobileAvatarDisplay
                                name={name}
                                customUri={customUri}
                                presetId={presetId}
                                frame={frame}
                                size="lg"
                            />
                            <View className="w-full flex-row gap-2.5">
                                <Button
                                    testID="avatar-pick-library"
                                    disabled={picking}
                                    onPress={() =>
                                        void handlePickPhoto('library')
                                    }
                                    className="h-11 flex-1 rounded-xl"
                                >
                                    <Text className="text-xs font-bold text-primary-foreground">
                                        {picking
                                            ? 'Đang mở...'
                                            : 'Chọn từ thư viện'}
                                    </Text>
                                </Button>
                                <Button
                                    testID="avatar-take-photo"
                                    variant="secondary"
                                    disabled={picking}
                                    onPress={() =>
                                        void handlePickPhoto('camera')
                                    }
                                    className="h-11 flex-1 rounded-xl"
                                >
                                    <Text className="text-xs font-bold text-secondary-foreground">
                                        Chụp ảnh mới
                                    </Text>
                                </Button>
                            </View>
                            {(customUri || presetId) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onPress={() => {
                                        onClearAvatar();
                                        toast.success(
                                            'Đã chuyển đại diện về chữ cái đầu.',
                                        );
                                    }}
                                >
                                    <Text className="text-xs font-bold text-destructive">
                                        Dùng chữ cái đầu
                                    </Text>
                                </Button>
                            )}
                        </View>

                        <View className="gap-3">
                            <Text className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                Chọn biểu tượng gia đình (1 chạm)
                            </Text>
                            <View className="flex-row flex-wrap gap-2.5">
                                {AVATAR_PRESETS.map((preset) => {
                                    const selected =
                                        !customUri && presetId === preset.id;
                                    return (
                                        <Pressable
                                            key={preset.id}
                                            onPress={() => {
                                                onSelectPreset(preset.id);
                                                toast.success(
                                                    `Đã chọn "${preset.label}"`,
                                                );
                                            }}
                                            className={`w-[22.5%] items-center gap-1 rounded-2xl border p-3 ${preset.bgClass} ${
                                                selected
                                                    ? 'border-primary'
                                                    : 'border-border'
                                            }`}
                                        >
                                            <Text className="text-2xl">
                                                {preset.emoji}
                                            </Text>
                                            <Text
                                                className="text-[11px] font-bold text-foreground"
                                                numberOfLines={1}
                                            >
                                                {preset.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        <View className="gap-3">
                            <Text className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                                Màu khung đại diện
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                                {AVATAR_FRAME_TONES.map((tone) => (
                                    <Pressable
                                        key={tone.id}
                                        onPress={() => onSelectFrame(tone.id)}
                                        className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
                                            frame === tone.id
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border bg-card'
                                        }`}
                                    >
                                        <View
                                            className={`size-3 rounded-full ${tone.dotClass}`}
                                        />
                                        <Text className="text-xs font-bold text-foreground">
                                            {tone.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
}
