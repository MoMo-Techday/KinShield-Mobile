// Stack gốc dùng chung theme, query client, Share Intent và tiêu đề thân thiện cho các route.
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, ThemeProvider } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { PortalHost } from '@rn-primitives/portal';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import '../../global.css';
import { AppProviders } from '@/components/providers/AppProviders';
import { ShareIntentRedirectBridge } from '@/features/xray/components/ShareIntentRedirectBridge';
import { NAV_THEME } from '@/lib/theme';

// Cung cấp theme, Share Intent (Zalo -> X-Ray) và cache phiên cho toàn ứng dụng.
export default function RootLayout() {
    const { colorScheme } = useColorScheme();

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ShareIntentProvider
                options={{
                    resetOnBackground: true,
                    disabled: Platform.OS === 'web',
                }}
            >
                <ThemeProvider value={NAV_THEME[colorScheme ?? 'light']}>
                    <AppProviders>
                        <StatusBar
                            style={colorScheme === 'dark' ? 'light' : 'dark'}
                        />
                        <ShareIntentRedirectBridge />
                        <Stack>
                            <Stack.Screen
                                name="family"
                                options={{ title: 'Gia đình' }}
                            />
                            <Stack.Screen
                                name="xray"
                                options={{ title: 'Soi 1 chạm X-Ray' }}
                            />
                        </Stack>
                        <PortalHost />
                    </AppProviders>
                </ThemeProvider>
            </ShareIntentProvider>
        </GestureHandlerRootView>
    );
}
