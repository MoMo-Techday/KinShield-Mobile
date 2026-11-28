// Hồ sơ trung tâm gia đình trên Mobile: đổi ảnh đại diện, điểm an toàn, danh bạ khẩn cấp, cài đặt & lối vào X-Ray/Gia đình.
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    View,
} from 'react-native';
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
import { AvatarPickerSheet } from '@/features/profile/components/AvatarPickerSheet';
import { MobileAvatarDisplay } from '@/features/profile/components/MobileAvatarDisplay';
import { ProfilePreferencesSection } from '@/features/profile/components/ProfilePreferencesSection';
import { ProfileSafetyContactsCard } from '@/features/profile/components/ProfileSafetyContactsCard';
import { useMobileProfileExtras } from '@/features/profile/hooks/use-profile-extras';
import {
    computeSafetyScore,
    FAMILY_ROLES,
} from '@/features/profile/utils/profile-extras';
import type { FamilyRole } from '@/features/profile/types/profile-extras';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { isUnauthorizedProfileError } from '@/lib/profile-state';
import { THEME } from '@/lib/theme';
import { toast } from '@/lib/toast';
import type { AuthUser } from '@/services/auth-service';

type ProfileTab = 'overview' | 'contacts' | 'settings';

function ProfileHub({ user }: { user: AuthUser }) {
    const router = useRouter();
    const logoutMutation = useLogout();
    const {
        extras,
        setCustomAvatarUri,
        selectAvatarPreset,
        clearAvatar,
        setAvatarFrame,
        updateIdentity,
        updatePreferences,
        addEmergencyContact,
        removeEmergencyContact,
        addTrustedAccount,
        removeTrustedAccount,
        toggleGoldenRule,
        resetExtras,
    } = useMobileProfileExtras(user.id, user.displayName);

    const [tab, setTab] = useState<ProfileTab>('overview');
    const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);
    const [editing, setEditing] = useState(false);

    const [draftNickname, setDraftNickname] = useState(extras.nickname);
    const [draftRole, setDraftRole] = useState<FamilyRole>(extras.familyRole);
    const [draftPhone, setDraftPhone] = useState(extras.phone);
    const [draftNote, setDraftNote] = useState(extras.safetyNote);

    const safety = computeSafetyScore(extras, user.emailVerified);
    const largeText = extras.preferences.largeTextMode;
    const bodyClass = largeText ? 'text-base' : 'text-sm';

    const startEditing = () => {
        setDraftNickname(extras.nickname || user.displayName);
        setDraftRole(extras.familyRole);
        setDraftPhone(extras.phone);
        setDraftNote(extras.safetyNote);
        setEditing(true);
    };

    const saveIdentity = () => {
        updateIdentity({
            nickname: draftNickname,
            familyRole: draftRole,
            phone: draftPhone,
            safetyNote: draftNote,
        });
        setEditing(false);
        toast.success('Đã lưu thông tin hồ sơ gia đình!');
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <ScrollView contentContainerClassName="px-5 py-6 pb-14">
                <View className="mx-auto w-full max-w-[500px] gap-5">
                    {/* Top Profile Card with Avatar Picker & Quick Launch Buttons */}
                    <Card className="gap-0 rounded-[28px] border-border bg-card py-0 shadow-xl shadow-primary/[0.06]">
                        <CardContent className="items-center gap-4 px-6 py-6">
                            <Pressable
                                testID="profile-avatar-trigger"
                                onPress={() => setAvatarSheetOpen(true)}
                                accessibilityLabel="Chạm để đổi ảnh đại diện"
                            >
                                <MobileAvatarDisplay
                                    name={extras.nickname || user.displayName}
                                    customUri={extras.avatarCustomUri}
                                    presetId={extras.avatarPresetId}
                                    frame={extras.avatarFrame}
                                    size="lg"
                                />
                            </Pressable>

                            <View className="items-center gap-1">
                                <Text className="text-xs font-extrabold uppercase tracking-[2px] text-primary">
                                    {extras.familyRole} • KINSHIELD
                                </Text>
                                <Text className="text-center text-2xl font-extrabold text-foreground">
                                    {extras.nickname || user.displayName}
                                </Text>
                                <Text className="text-center text-xs text-muted-foreground">
                                    {user.email}
                                </Text>
                            </View>

                            {extras.safetyNote.length > 0 && (
                                <View className="w-full rounded-2xl border border-border bg-secondary/45 px-4 py-2.5">
                                    <Text
                                        className={`text-center font-medium text-foreground ${bodyClass}`}
                                    >
                                        “{extras.safetyNote}”
                                    </Text>
                                </View>
                            )}

                            <View className="w-full flex-row gap-2.5">
                                <Button
                                    testID="open-avatar-picker"
                                    variant="secondary"
                                    size="sm"
                                    className="h-10 flex-1 rounded-full"
                                    onPress={() => setAvatarSheetOpen(true)}
                                >
                                    <Text className="text-xs font-bold text-primary">
                                        Đổi ảnh đại diện
                                    </Text>
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-10 flex-1 rounded-full"
                                    onPress={startEditing}
                                >
                                    <Text className="text-xs font-bold text-foreground">
                                        Sửa thông tin
                                    </Text>
                                </Button>
                            </View>

                            {/* Safety Score Bar */}
                            <View className="w-full gap-2 rounded-2xl border border-border bg-background/70 p-4">
                                <View className="flex-row items-center justify-between">
                                    <Text className="text-xs font-extrabold uppercase text-primary">
                                        Điểm an toàn gia đình
                                    </Text>
                                    <Text className="text-base font-extrabold text-primary">
                                        {safety.score}/100
                                    </Text>
                                </View>
                                <View className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                                    <View
                                        className="h-full rounded-full bg-primary"
                                        style={{ width: `${safety.score}%` }}
                                    />
                                </View>
                                <Text className="text-xs font-semibold text-foreground">
                                    {safety.levelLabel} ({safety.completedCount}
                                    /{safety.totalCount})
                                </Text>
                                <Text className="text-xs leading-5 text-muted-foreground">
                                    Gợi ý: {safety.nextHint}
                                </Text>
                            </View>

                            {/* Primary KinShield Feature Shortcuts */}
                            <View className="w-full gap-2.5 pt-1">
                                <Button
                                    testID="open-xray"
                                    className="h-auto min-h-12 w-full rounded-xl"
                                    onPress={() => router.push('/xray')}
                                >
                                    <Text className="font-bold text-primary-foreground">
                                        Soi tin nhắn, Bill &amp; QR (X-Ray)
                                    </Text>
                                </Button>
                                <Button
                                    testID="open-family"
                                    variant="secondary"
                                    className="h-auto min-h-12 w-full rounded-xl"
                                    onPress={() => router.push('/family')}
                                >
                                    <Text className="font-bold text-secondary-foreground">
                                        Gia đình và xác minh
                                    </Text>
                                </Button>
                            </View>
                        </CardContent>
                    </Card>

                    {/* 3-Tab Switcher */}
                    <View className="flex-row gap-1.5 rounded-full border border-border bg-card p-1.5">
                        {(
                            [
                                { id: 'overview', label: 'Hồ sơ' },
                                {
                                    id: 'contacts',
                                    label: `Liên hệ (${extras.emergencyContacts.length + extras.trustedAccounts.length})`,
                                },
                                { id: 'settings', label: 'Cài đặt' },
                            ] as const
                        ).map((item) => (
                            <Pressable
                                key={item.id}
                                onPress={() => setTab(item.id)}
                                className={`flex-1 items-center rounded-full py-2.5 ${
                                    tab === item.id ? 'bg-primary' : ''
                                }`}
                            >
                                <Text
                                    className={`text-xs font-extrabold ${
                                        tab === item.id
                                            ? 'text-primary-foreground'
                                            : 'text-muted-foreground'
                                    }`}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* TAB 1: PROFILE INFO & ACCOUNT SECURITY */}
                    {tab === 'overview' && (
                        <Card className="gap-0 rounded-[28px] border-border bg-card py-0">
                            <CardHeader className="gap-1.5 px-6 pt-6">
                                <CardTitle className="text-xl font-bold text-foreground">
                                    Thông tin &amp; Bảo mật
                                </CardTitle>
                                <CardDescription className={bodyClass}>
                                    Thông tin tài khoản KinShield và lối tắt bảo
                                    mật nhanh.
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="gap-5 px-6 pb-7 pt-5">
                                {editing ? (
                                    <View className="gap-3.5">
                                        <View className="gap-1.5">
                                            <Text className="text-xs font-bold text-muted-foreground">
                                                Tên gọi thân mật
                                            </Text>
                                            <Input
                                                value={draftNickname}
                                                onChangeText={setDraftNickname}
                                                placeholder="VD: Mẹ Lan, Con Minh..."
                                                className="h-11 rounded-xl"
                                            />
                                        </View>
                                        <View className="gap-1.5">
                                            <Text className="text-xs font-bold text-muted-foreground">
                                                Vai trò trong gia đình
                                            </Text>
                                            <View className="flex-row flex-wrap gap-2">
                                                {FAMILY_ROLES.map((role) => (
                                                    <Button
                                                        key={role}
                                                        size="sm"
                                                        variant={
                                                            draftRole === role
                                                                ? 'default'
                                                                : 'outline'
                                                        }
                                                        className="rounded-full"
                                                        onPress={() =>
                                                            setDraftRole(role)
                                                        }
                                                    >
                                                        <Text
                                                            className={`text-xs font-bold ${
                                                                draftRole ===
                                                                role
                                                                    ? 'text-primary-foreground'
                                                                    : 'text-foreground'
                                                            }`}
                                                        >
                                                            {role}
                                                        </Text>
                                                    </Button>
                                                ))}
                                            </View>
                                        </View>
                                        <View className="gap-1.5">
                                            <Text className="text-xs font-bold text-muted-foreground">
                                                Số điện thoại
                                            </Text>
                                            <Input
                                                value={draftPhone}
                                                onChangeText={setDraftPhone}
                                                keyboardType="phone-pad"
                                                placeholder="09xx xxx xxx"
                                                className="h-11 rounded-xl"
                                            />
                                        </View>
                                        <View className="gap-1.5">
                                            <Text className="text-xs font-bold text-muted-foreground">
                                                Lời nhắc an toàn cá nhân
                                            </Text>
                                            <Input
                                                value={draftNote}
                                                onChangeText={setDraftNote}
                                                placeholder="VD: Gọi con trước khi chuyển tiền"
                                                className="h-11 rounded-xl"
                                            />
                                        </View>
                                        <View className="flex-row gap-2.5 pt-1">
                                            <Button
                                                onPress={saveIdentity}
                                                className="h-11 flex-1 rounded-xl"
                                            >
                                                <Text className="font-bold text-primary-foreground">
                                                    Lưu thay đổi
                                                </Text>
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onPress={() =>
                                                    setEditing(false)
                                                }
                                                className="h-11 rounded-xl px-5"
                                            >
                                                <Text className="font-semibold text-foreground">
                                                    Hủy
                                                </Text>
                                            </Button>
                                        </View>
                                    </View>
                                ) : (
                                    <View className="gap-4">
                                        <View className="gap-1 border-b border-border pb-3.5">
                                            <Text className="text-xs text-muted-foreground">
                                                Họ và tên tài khoản
                                            </Text>
                                            <Text
                                                className={`font-semibold text-foreground ${bodyClass}`}
                                            >
                                                {user.displayName}
                                            </Text>
                                        </View>
                                        <View className="gap-1 border-b border-border pb-3.5">
                                            <Text className="text-xs text-muted-foreground">
                                                Số điện thoại
                                            </Text>
                                            <Text
                                                className={`font-semibold text-foreground ${bodyClass}`}
                                            >
                                                {extras.phone || 'Chưa cập nhật'}
                                            </Text>
                                        </View>
                                        <View className="gap-1 border-b border-border pb-3.5">
                                            <Text className="text-xs text-muted-foreground">
                                                Trạng thái email
                                            </Text>
                                            <Text
                                                className={`font-semibold text-foreground ${bodyClass}`}
                                            >
                                                {user.emailVerified
                                                    ? 'Đã xác minh'
                                                    : 'Chưa xác minh'}
                                            </Text>
                                        </View>
                                        <View className="gap-1">
                                            <Text className="text-xs text-muted-foreground">
                                                Ngày tham gia
                                            </Text>
                                            <Text
                                                className={`font-semibold text-foreground ${bodyClass}`}
                                            >
                                                {new Intl.DateTimeFormat(
                                                    'vi-VN',
                                                    { dateStyle: 'long' },
                                                ).format(
                                                    new Date(user.createdAt),
                                                )}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                <View className="gap-2.5 border-t border-border pt-4">
                                    {!user.emailVerified && (
                                        <Button
                                            variant="secondary"
                                            className="h-11 w-full rounded-xl"
                                            onPress={() =>
                                                router.push('/auth/email/verify')
                                            }
                                        >
                                            <Text className="font-bold text-primary">
                                                Xác minh email ngay (+25đ)
                                            </Text>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="h-11 w-full rounded-xl"
                                        onPress={() =>
                                            router.push('/auth/password/change')
                                        }
                                    >
                                        <Text className="font-bold text-foreground">
                                            Đổi mật khẩu đăng nhập
                                        </Text>
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        disabled={logoutMutation.isPending}
                                        onPress={() => logoutMutation.mutate()}
                                        className="h-12 w-full rounded-xl"
                                    >
                                        <Text className="font-bold text-destructive-foreground">
                                            {logoutMutation.isPending
                                                ? 'Đang đăng xuất...'
                                                : 'Đăng xuất'}
                                        </Text>
                                    </Button>
                                </View>
                            </CardContent>
                        </Card>
                    )}

                    {/* TAB 2: EMERGENCY CONTACTS & TRUSTED ACCOUNTS */}
                    {tab === 'contacts' && (
                        <ProfileSafetyContactsCard
                            largeText={largeText}
                            emergencyContacts={extras.emergencyContacts}
                            trustedAccounts={extras.trustedAccounts}
                            onAddEmergencyContact={addEmergencyContact}
                            onRemoveEmergencyContact={removeEmergencyContact}
                            onAddTrustedAccount={addTrustedAccount}
                            onRemoveTrustedAccount={removeTrustedAccount}
                        />
                    )}

                    {/* TAB 3: ACCESSIBILITY, THEME, GOLDEN RULES & LOG */}
                    {tab === 'settings' && (
                        <ProfilePreferencesSection
                            displayName={user.displayName}
                            extras={extras}
                            onUpdatePreferences={updatePreferences}
                            onToggleRule={toggleGoldenRule}
                            onResetExtras={resetExtras}
                        />
                    )}
                </View>
            </ScrollView>

            <AvatarPickerSheet
                visible={avatarSheetOpen}
                name={extras.nickname || user.displayName}
                customUri={extras.avatarCustomUri}
                presetId={extras.avatarPresetId}
                frame={extras.avatarFrame}
                onClose={() => setAvatarSheetOpen(false)}
                onSelectCustomUri={setCustomAvatarUri}
                onSelectPreset={selectAvatarPreset}
                onSelectFrame={setAvatarFrame}
                onClearAvatar={clearAvatar}
            />
        </SafeAreaView>
    );
}

// Chỉ mở hồ sơ khi phiên hợp lệ; đăng xuất hoặc hết phiên tự điều hướng về auth.
export default function ProfileScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const query = useCurrentUser();
    const logoutMutation = useLogout();
    const unauthorized =
        query.isError && isUnauthorizedProfileError(query.error);

    useEffect(() => {
        if (unauthorized || logoutMutation.isSuccess) {
            router.replace('/auth');
        }
    }, [logoutMutation.isSuccess, router, unauthorized]);

    if (query.isPending || unauthorized) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center px-5">
                    <Card className="w-full max-w-[460px] rounded-[28px] border-border bg-card shadow-xl shadow-primary/[0.06]">
                        <CardContent className="flex-row items-center gap-3 py-6">
                            <ActivityIndicator
                                color={THEME[colorScheme ?? 'light'].primary}
                            />
                            <Text
                                accessibilityLiveRegion="polite"
                                className="text-sm text-muted-foreground"
                            >
                                {unauthorized
                                    ? 'Đang chuyển đến trang đăng nhập...'
                                    : 'Đang tải hồ sơ...'}
                            </Text>
                        </CardContent>
                    </Card>
                </View>
            </SafeAreaView>
        );
    }

    if (query.isError) {
        return (
            <SafeAreaView className="flex-1 bg-background">
                <View className="flex-1 items-center justify-center px-5">
                    <Card className="w-full max-w-[460px] rounded-[28px] border-border bg-card shadow-xl shadow-primary/[0.06]">
                        <CardHeader>
                            <CardTitle className="text-2xl font-bold text-foreground">
                                Không thể tải hồ sơ
                            </CardTitle>
                            <CardDescription className="leading-6 text-muted-foreground">
                                Vui lòng kiểm tra kết nối rồi thử lại.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Button
                                onPress={() => void query.refetch()}
                                className="h-11 w-full rounded-xl bg-primary active:bg-primary/90"
                            >
                                <Text className="font-bold text-primary-foreground">
                                    Thử lại
                                </Text>
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

    return <ProfileHub key={user.id} user={user} />;
}
