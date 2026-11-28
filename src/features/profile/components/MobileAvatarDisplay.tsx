// Hiển thị ảnh đại diện cá nhân, biểu tượng gia đình hoặc chữ cái đầu cùng viền màu tùy chọn.
import { Image, View } from 'react-native';
import { Text } from '@/components/ui/text';
import {
    AVATAR_FRAME_TONES,
    AVATAR_PRESETS,
    getUserInitials,
} from '@/features/profile/utils/profile-extras';
import type {
    AvatarFrameTone,
    AvatarPresetId,
} from '@/features/profile/types/profile-extras';

interface MobileAvatarDisplayProps {
    name: string;
    customUri: string | null;
    presetId: AvatarPresetId | null;
    frame: AvatarFrameTone;
    size?: 'md' | 'lg';
}

export function MobileAvatarDisplay({
    name,
    customUri,
    presetId,
    frame,
    size = 'lg',
}: MobileAvatarDisplayProps) {
    const frameSpec =
        AVATAR_FRAME_TONES.find((t) => t.id === frame) ?? AVATAR_FRAME_TONES[0];
    const preset = presetId
        ? AVATAR_PRESETS.find((p) => p.id === presetId) ?? null
        : null;

    const boxClass = size === 'lg' ? 'size-24' : 'size-14';
    const emojiClass = size === 'lg' ? 'text-4xl' : 'text-2xl';
    const textClass = size === 'lg' ? 'text-2xl' : 'text-base';

    return (
        <View
            className={`${boxClass} items-center justify-center overflow-hidden rounded-full border-4 ${frameSpec.borderClass} ${
                preset ? preset.bgClass : 'bg-primary/10'
            }`}
        >
            {customUri ? (
                <Image
                    source={{ uri: customUri }}
                    className="h-full w-full"
                    resizeMode="cover"
                    accessibilityLabel={`Ảnh đại diện của ${name}`}
                />
            ) : preset ? (
                <Text className={emojiClass}>{preset.emoji}</Text>
            ) : (
                <Text className={`${textClass} font-extrabold text-primary`}>
                    {getUserInitials(name)}
                </Text>
            )}
        </View>
    );
}
