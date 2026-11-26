// Stack gốc dùng chung theme, query client và tiêu đề thân thiện cho các route Family.
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, ThemeProvider } from 'expo-router';
import { PortalHost } from '@rn-primitives/portal';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import '../../global.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { NAV_THEME } from '@/lib/theme';

// Cung cấp theme và một cache phiên cho ứng dụng, bao gồm các route khôi phục từ deep link.
export default function RootLayout() {
    const { colorScheme } = useColorScheme();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
                <AppProviders>
                    <StatusBar
                        style={colorScheme === 'dark' ? 'light' : 'dark'}
                    />
                    <Stack>
                        <Stack.Screen
                            name="family"
                            options={{ title: 'Gia đình' }}
                        />
                    </Stack>
                    <PortalHost />
                </AppProviders>
            </ThemeProvider>
        </GestureHandlerRootView>
    );
}
