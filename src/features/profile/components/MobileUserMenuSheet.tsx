// Menu tài khoản nhanh từ Topbar Mobile: thông tin user, đổi ảnh, chỉnh giao diện Sáng/Tối và Đăng xuất.
import { Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { MobileAvatarDisplay } from '@/features/profile/components/MobileAvatarDisplay';
import type {
    SafetyScoreSummary,
    UserProfileExtras,
} from '@/features/profile/types/profile-extras';

interface MobileUserMenuSheetProps {
    visible: boolean;
    email: string;
    displayName: string;
    extras: UserProfileExtras;
    safety: SafetyScoreSummary;
    syncLabel: string;
    isLoggingOut: boolean;
    onClose: () => void;
    onOpenAvatarPicker: () => void;
    onEditProfile: () => void;
    onChangePassword: () => void;
    onLogout: () => void;
}

export function MobileUserMenuSheet({
    visible,
    email,
    displayName,
    extras,
    safety,
    syncLabel,
    isLoggingOut,
    onClose,
    onOpenAvatarPicker,
    onEditProfile,
    onChangePassword,
    onLogout,
}: MobileUserMenuSheetProps) {
    const { colorScheme, setColorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View className="flex-1 justify-end bg-black/50">
                <Pressable
                    className="flex-1"
                    accessibilityLabel="Đóng menu tài khoản"
                    onPress={onClose}
                />

                <SafeAreaView
                    edges={['bottom']}
                    className="rounded-t-3xl border-t border-border bg-card"
                >
                    <View className="gap-4 px-5 pb-5 pt-4">
                        <View className="mx-auto h-1 w-10 rounded-full bg-border" />

                        {/* User summary */}
                        <View className="flex-row items-center gap-3.5 border-b border-border pb-4">
                            <MobileAvatarDisplay
                                name={displayName}
                                customUri={extras.avatarCustomUri}
                                presetId={extras.avatarPresetId}
                                frame={extras.avatarFrame}
                                size="md"
                            />
                            <View className="flex-1 gap-0.5">
                                <Text
                                    numberOfLines={1}
                                    className="text-base font-bold text-foreground"
                                >
                                    {displayName}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    className="text-xs text-muted-foreground"
                                >
                                    {email}
                                </Text>
                                <Text className="text-xs font-medium text-muted-foreground">
                                    {extras.familyRole} · {syncLabel} ·{' '}
                                    {safety.score}/100đ
                                </Text>
                            </View>
                        </View>

                        {/* Theme Switcher */}
                        <View className="gap-2">
                            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Chế độ giao diện
                            </Text>
                            <View className="flex-row gap-2 rounded-xl bg-secondary p-1">
                                <Pressable
                                    onPress={() => setColorScheme('light')}
                                    className={`flex-1 items-center rounded-lg py-2.5 ${
                                        !isDark ? 'bg-card' : ''
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-bold ${
                                            !isDark
                                                ? 'text-foreground'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        Giao diện Sáng
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={() => setColorScheme('dark')}
                                    className={`flex-1 items-center rounded-lg py-2.5 ${
                                        isDark ? 'bg-card' : ''
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-bold ${
                                            isDark
                                                ? 'text-foreground'
                                                : 'text-muted-foreground'
                                        }`}
                                    >
                                        Giao diện Tối
                                    </Text>
                                </Pressable>
                            </View>
                        </View>

                        {/* Quick Account Actions */}
                        <View className="gap-2">
                            <Button
                                variant="outline"
                                className="h-11 w-full rounded-xl"
                                onPress={() => {
                                    onClose();
                                    onOpenAvatarPicker();
                                }}
                            >
                                <Text className="font-semibold text-foreground">
                                    Đổi ảnh đại diện
                                </Text>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 w-full rounded-xl"
                                onPress={() => {
                                    onClose();
                                    onEditProfile();
                                }}
                            >
                                <Text className="font-semibold text-foreground">
                                    Sửa thông tin hồ sơ
                                </Text>
                            </Button>
                            <Button
                                variant="outline"
                                className="h-11 w-full rounded-xl"
                                onPress={() => {
                                    onClose();
                                    onChangePassword();
                                }}
                            >
                                <Text className="font-semibold text-foreground">
                                    Đổi mật khẩu đăng nhập
                                </Text>
                            </Button>
                        </View>

                        {/* Logout */}
                        <View className="border-t border-border pt-3">
                            <Button
                                variant="destructive"
                                disabled={isLoggingOut}
                                onPress={() => {
                                    onClose();
                                    onLogout();
                                }}
                                className="h-12 w-full rounded-xl"
                            >
                                <Text className="font-bold text-destructive-foreground">
                                    {isLoggingOut
                                        ? 'Đang đăng xuất...'
                                        : 'Đăng xuất'}
                                </Text>
                            </Button>
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}
