// Thanh điều hướng đáy (Bottom Nav Bar) 5 mục trên Mobile, đồng bộ đầy đủ tính năng như Sidebar Web.
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Text } from '@/components/ui/text';
import { THEME } from '@/lib/theme';

export type MobileNavTab =
    | 'overview'
    | 'shield'
    | 'contacts'
    | 'academy'
    | 'settings';

interface MobileBottomNavProps {
    activeTab: MobileNavTab;
    onSelectTab: (tab: MobileNavTab) => void;
    contactsCount: number;
}

function NavIcon({
    tab,
    color,
}: {
    tab: MobileNavTab;
    color: string;
}) {
    switch (tab) {
        case 'overview':
            return (
                <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <Rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <Rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <Rect x="3" y="14" width="7" height="7" rx="1.5" />
                    <Rect x="14" y="14" width="7" height="7" rx="1.5" />
                </Svg>
            );
        case 'shield':
            return (
                <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <Path d="m9 12 2 2 4-4" />
                </Svg>
            );
        case 'contacts':
            return (
                <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <Path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <Circle cx="9" cy="7" r="4" />
                    <Path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <Path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </Svg>
            );
        case 'academy':
            return (
                <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
                    <Path d="M8 7h6" />
                    <Path d="M8 11h8" />
                </Svg>
            );
        case 'settings':
            return (
                <Svg
                    width={20}
                    height={20}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <Circle cx="12" cy="12" r="3" />
                    <Path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </Svg>
            );
    }
}

const NAV_ITEMS: readonly { id: MobileNavTab; label: string }[] = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'shield', label: 'Bảo vệ' },
    { id: 'contacts', label: 'Danh bạ' },
    { id: 'academy', label: 'Cẩm nang' },
    { id: 'settings', label: 'Cài đặt' },
] as const;

export function MobileBottomNav({
    activeTab,
    onSelectTab,
    contactsCount,
}: MobileBottomNavProps) {
    const { colorScheme } = useColorScheme();
    const palette = THEME[colorScheme ?? 'light'];

    return (
        <SafeAreaView
            edges={['bottom']}
            className="border-t border-border bg-card"
        >
            <View className="flex-row items-center justify-around px-1.5 pb-1.5 pt-2">
                {NAV_ITEMS.map((item) => {
                    const active = activeTab === item.id;
                    const color = active
                        ? palette.primary
                        : palette.mutedForeground;

                    return (
                        <Pressable
                            key={item.id}
                            testID={`bottom-nav-${item.id}`}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: active }}
                            onPress={() => onSelectTab(item.id)}
                            className="flex-1 items-center gap-1 py-1"
                        >
                            <View
                                className={`relative items-center justify-center rounded-xl px-3 py-1 ${
                                    active ? 'bg-accent' : ''
                                }`}
                            >
                                <NavIcon tab={item.id} color={color} />
                                {item.id === 'contacts' &&
                                    contactsCount > 0 && (
                                        <View className="absolute -right-0.5 -top-0.5 min-w-4 items-center justify-center rounded-full bg-primary px-1">
                                            <Text className="text-[9px] font-bold text-primary-foreground">
                                                {contactsCount}
                                            </Text>
                                        </View>
                                    )}
                            </View>
                            <Text
                                numberOfLines={1}
                                className={`text-[11px] ${
                                    active
                                        ? 'font-bold text-primary'
                                        : 'font-medium text-muted-foreground'
                                }`}
                            >
                                {item.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </SafeAreaView>
    );
}
