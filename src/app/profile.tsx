// Không gian chính sau đăng nhập trên Mobile: Topbar + UserMenu (Sáng/Tối & Đăng xuất), KeyboardAvoidingView, Pull-to-refresh và 3 tab gọn gàng.
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    RefreshControl,
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
import { MobileUserMenuSheet } from '@/features/profile/components/MobileUserMenuSheet';
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

const JOIN_DATE_FORMATTER = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long',
});

function ProfileHub({
    user,
    onRefreshUser,
}: {
    user: AuthUser;
    onRefreshUser: () => Promise<unknown>;
}) {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const logoutMutation = useLogout();
    const {
        extras,
        syncStatus,
        refreshFromServer,
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
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const [draftNickname, setDraftNickname] = useState(extras.nickname);
    const [draftRole, setDraftRole] = useState<FamilyRole>(extras.familyRole);
    const [draftPhone, setDraftPhone] = useState(extras.phone);
    const [draftNote, setDraftNote] = useState(extras.safetyNote);

    const displayName = extras.nickname || user.displayName;
    const safety = computeSafetyScore(extras, user.emailVerified);
    const largeText = extras.preferences.largeTextMode;
    const bodyClass = largeText ? 'text-base' : 'text-sm';
    const syncLabel =
        syncStatus === 'synced'
            ? 'Đã đồng bộ'
            : syncStatus === 'syncing'
              ? 'Đang đồng bộ'
              : 'Lưu trên máy';

    const startEditing = () => {
        setDraftNickname(displayName);
        setDraftRole(extras.familyRole);
        setDraftPhone(extras.phone);
        setDraftNote(extras.safetyNote);
        setTab('overview');
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

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([onRefreshUser(), refreshFromServer()]);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
            {/* Compact Topbar with UserMenu Trigger */}
            <View className="flex-row items-center justify-between border-b border-border bg-card px-5 py-3">
                <View>
                    <Text className="text-base font-extrabold text-foreground">
                        KinShield
                    </Text>
                    <Text className="text-[11px] font-medium text-muted-foreground">
                        Khiên Gia Đình · {syncLabel}
                    </Text>
                </View>

                <Pressable
                    testID="mobile-user-menu-trigger"
                    onPress={() => setUserMenuOpen(true)}
                    accessibilityLabel="Mở menu tài khoản"
                    className="flex-row items-center gap-2 rounded-xl border border-border bg-background px-2.5 py-1.5"
                >
                    <MobileAvatarDisplay
                        name={displayName}
                        customUri={extras.avatarCustomUri}
                        presetId={extras.avatarPresetId}
                        frame={extras.avatarFrame}
                        size="sm"
                    />
                    <View className="max-w-[116px]">
                        <Text
                            numberOfLines={1}
                            className="text-xs font-bold text-foreground"
                        >
                            {displayName}
                        </Text>
                        <Text className="text-[10px] font-medium text-muted-foreground">
                            {safety.score}/100đ ▾
                        </Text>
                    </View>
                </Pressable>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => void handleRefresh()}
                            tintColor={THEME[colorScheme ?? 'light'].primary}
                        />
                    }
                    contentContainerClassName="px-4 py-5 pb-12"
                >
                    <View className="mx-auto w-full max-w-[500px] gap-4">
                        {/* Clean Overview + Safety Score + Primary Actions */}
                        <Card className="gap-0 rounded-2xl border-border bg-card py-0">
                            <CardContent className="gap-4 px-5 py-5">
                                <View className="flex-row items-center gap-4">
                                    <Pressable
                                        testID="profile-avatar-trigger"
                                        onPress={() => setAvatarSheetOpen(true)}
                                        accessibilityLabel="Chạm để đổi ảnh đại diện"
                                    >
                                        <MobileAvatarDisplay
                                            name={displayName}
                                            customUri={extras.avatarCustomUri}
                                            presetId={extras.avatarPresetId}
                                            frame={extras.avatarFrame}
                                            size="lg"
                                        />
                                    </Pressable>

                                    <View className="flex-1 gap-1">
                                        <View className="self-start rounded-md bg-secondary px-2 py-0.5">
                                            <Text className="text-[11px] font-semibold text-secondary-foreground">
                                                {extras.familyRole}
                                            </Text>
                                        </View>
                                        <Text
                                            numberOfLines={2}
                                            className="text-xl font-bold text-foreground"
                                        >
                                            {displayName}
                                        </Text>
                                        <Text
                                            numberOfLines={1}
                                            className="text-xs text-muted-foreground"
                                        >
                                            {user.email}
                                        </Text>
                                    </View>
                                </View>

                                {extras.safetyNote.length > 0 && (
                                    <View className="rounded-xl border border-border bg-muted px-3.5 py-2.5">
                                        <Text
                                            className={`font-medium text-foreground ${bodyClass}`}
                                        >
                                            “{extras.safetyNote}”
                                        </Text>
                                    </View>
                                )}

                                {/* Safety Score Strip */}
                                <View className="gap-2 rounded-xl border border-border bg-background p-3.5">
                                    <View className="flex-row items-center justify-between">
                                        <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Điểm an toàn gia đình
                                        </Text>
                                        <Text className="text-base font-bold text-foreground">
                                            {safety.score}/100
                                        </Text>
                                    </View>
                                    <View className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                        <View
                                            className="h-full rounded-full bg-primary"
                                            style={{
                                                width: `${safety.score}%`,
                                            }}
                                        />
                                    </View>
                                    <Text className="text-xs font-semibold text-foreground">
                                        {safety.levelLabel} (
                                        {safety.completedCount}/
                                        {safety.totalCount})
                                    </Text>
                                    <Text className="text-xs leading-5 text-muted-foreground">
                                        Gợi ý: {safety.nextHint}
                                    </Text>
                                </View>

                                {/* Primary KinShield Feature Shortcuts */}
                                <View className="gap-2.5">
                                    <Button
                                        testID="open-xray"
                                        className="h-12 w-full rounded-xl"
                                        onPress={() => router.push('/xray')}
                                    >
                                        <Text className="font-bold text-primary-foreground">
                                            Soi 1 chạm Tin nhắn, Bill &amp; QR
                                        </Text>
                                    </Button>
                                    <Button
                                        testID="open-family"
                                        variant="outline"
                                        className="h-12 w-full rounded-xl"
                                        onPress={() => router.push('/family')}
                                    >
                                        <Text className="font-bold text-foreground">
                                            Gia đình &amp; Đồng duyệt
                                        </Text>
                                    </Button>
                                </View>
                            </CardContent>
                        </Card>

                        {/* 3-Tab Switcher */}
                        <View className="flex-row gap-1 rounded-xl border border-border bg-card p-1">
                            {(
                                [
                                    { id: 'overview', label: 'Hồ sơ' },
                                    {
                                        id: 'contacts',
                                        label: `Danh bạ (${extras.emergencyContacts.length + extras.trustedAccounts.length})`,
                                    },
                                    { id: 'settings', label: 'Cài đặt' },
                                ] as const
                            ).map((item) => (
                                <Pressable
                                    key={item.id}
                                    onPress={() => setTab(item.id)}
                                    className={`flex-1 items-center rounded-lg py-2.5 ${
                                        tab === item.id ? 'bg-primary' : ''
                                    }`}
                                >
                                    <Text
                                        className={`text-xs font-bold ${
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

                        {/* TAB 1: PROFILE INFO & QUICK EDIT */}
                        {tab === 'overview' && (
                            <Card className="gap-0 rounded-2xl border-border bg-card py-0">
                                <CardHeader className="flex-row items-center justify-between gap-3 px-5 pt-5">
                                    <View className="flex-1 gap-0.5">
                                        <CardTitle className="text-lg font-bold text-foreground">
                                            Thông tin cá nhân
                                        </CardTitle>
                                        <CardDescription className={bodyClass}>
                                            Thông tin tài khoản &amp; bảo mật.
                                        </CardDescription>
                                    </View>
                                    {!editing && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-lg px-3"
                                            onPress={startEditing}
                                        >
                                            <Text className="text-xs font-semibold text-foreground">
                                                Chỉnh sửa
                                            </Text>
                                        </Button>
                                    )}
                                </CardHeader>

                                <CardContent className="gap-4 px-5 pb-6 pt-4">
                                    {editing ? (
                                        <View className="gap-3.5">
                                            <View className="gap-1.5">
                                                <Text className="text-xs font-semibold text-muted-foreground">
                                                    Tên gọi thân mật
                                                </Text>
                                                <Input
                                                    value={draftNickname}
                                                    onChangeText={
                                                        setDraftNickname
                                                    }
                                                    placeholder="VD: Mẹ Lan, Con Minh..."
                                                    returnKeyType="next"
                                                    className="h-11 rounded-xl"
                                                />
                                            </View>
                                            <View className="gap-1.5">
                                                <Text className="text-xs font-semibold text-muted-foreground">
                                                    Vai trò trong gia đình
                                                </Text>
                                                <View className="flex-row flex-wrap gap-2">
                                                    {FAMILY_ROLES.map(
                                                        (role) => (
                                                            <Button
                                                                key={role}
                                                                size="sm"
                                                                variant={
                                                                    draftRole ===
                                                                    role
                                                                        ? 'default'
                                                                        : 'outline'
                                                                }
                                                                className="rounded-lg"
                                                                onPress={() =>
                                                                    setDraftRole(
                                                                        role,
                                                                    )
                                                                }
                                                            >
                                                                <Text
                                                                    className={`text-xs font-semibold ${
                                                                        draftRole ===
                                                                        role
                                                                            ? 'text-primary-foreground'
                                                                            : 'text-foreground'
                                                                    }`}
                                                                >
                                                                    {role}
                                                                </Text>
                                                            </Button>
                                                        ),
                                                    )}
                                                </View>
                                            </View>
                                            <View className="gap-1.5">
                                                <Text className="text-xs font-semibold text-muted-foreground">
                                                    Số điện thoại
                                                </Text>
                                                <Input
                                                    value={draftPhone}
                                                    onChangeText={setDraftPhone}
                                                    keyboardType="phone-pad"
                                                    placeholder="09xx xxx xxx"
                                                    returnKeyType="next"
                                                    className="h-11 rounded-xl"
                                                />
                                            </View>
                                            <View className="gap-1.5">
                                                <Text className="text-xs font-semibold text-muted-foreground">
                                                    Lời nhắc an toàn cá nhân
                                                </Text>
                                                <Input
                                                    value={draftNote}
                                                    onChangeText={setDraftNote}
                                                    placeholder="VD: Gọi con trước khi chuyển tiền"
                                                    returnKeyType="done"
                                                    onSubmitEditing={
                                                        saveIdentity
                                                    }
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
                                        <View className="gap-3.5">
                                            <View className="gap-1 border-b border-border pb-3">
                                                <Text className="text-xs text-muted-foreground">
                                                    Họ và tên tài khoản
                                                </Text>
                                                <Text
                                                    className={`font-semibold text-foreground ${bodyClass}`}
                                                >
                                                    {user.displayName}
                                                </Text>
                                            </View>
                                            <View className="gap-1 border-b border-border pb-3">
                                                <Text className="text-xs text-muted-foreground">
                                                    Số điện thoại
                                                </Text>
                                                <Text
                                                    className={`font-semibold text-foreground ${bodyClass}`}
                                                >
                                                    {extras.phone ||
                                                        'Chưa cập nhật'}
                                                </Text>
                                            </View>
                                            <View className="gap-1 border-b border-border pb-3">
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
                                                    {JOIN_DATE_FORMATTER.format(
                                                        new Date(
                                                            user.createdAt,
                                                        ),
                                                    )}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {!user.emailVerified && (
                                        <View className="border-t border-border pt-3">
                                            <Button
                                                variant="secondary"
                                                className="h-11 w-full rounded-xl"
                                                onPress={() =>
                                                    router.push(
                                                        '/auth/email/verify',
                                                    )
                                                }
                                            >
                                                <Text className="font-bold text-primary">
                                                    Xác minh email ngay (+25đ)
                                                </Text>
                                            </Button>
                                        </View>
                                    )}
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
                                onRemoveEmergencyContact={
                                    removeEmergencyContact
                                }
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
            </KeyboardAvoidingView>

            <MobileUserMenuSheet
                visible={userMenuOpen}
                email={user.email}
                displayName={displayName}
                extras={extras}
                safety={safety}
                syncLabel={syncLabel}
                isLoggingOut={logoutMutation.isPending}
                onClose={() => setUserMenuOpen(false)}
                onOpenAvatarPicker={() => setAvatarSheetOpen(true)}
                onEditProfile={startEditing}
                onChangePassword={() => router.push('/auth/password/change')}
                onLogout={() => logoutMutation.mutate()}
            />

            <AvatarPickerSheet
                visible={avatarSheetOpen}
                name={displayName}
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
                    <Card className="w-full max-w-[460px] rounded-2xl border-border bg-card">
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
                                    : 'Đang tải không gian gia đình...'}
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
                    <Card className="w-full max-w-[460px] rounded-2xl border-border bg-card">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-foreground">
                                Không thể tải hồ sơ
                            </CardTitle>
                            <CardDescription className="leading-6 text-muted-foreground">
                                Vui lòng kiểm tra kết nối rồi thử lại.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
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

    return (
        <ProfileHub
            key={user.id}
            user={user}
            onRefreshUser={() => query.refetch()}
        />
    );
}
