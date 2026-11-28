// Tự điều hướng sang /xray khi nhận Share từ Zalo hoặc cảnh báo tin nhắn từ Chat Guard Android.
import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';
import { subscribeChatGuardAlerts } from '@/features/xray/native/chat-guard-bridge';
import { toast } from '@/lib/toast';

export function ShareIntentRedirectBridge() {
    const router = useRouter();
    const pathname = usePathname();
    const { hasShareIntent } = useShareIntentContext();

    useEffect(() => {
        if (hasShareIntent && pathname !== '/xray') {
            router.push('/xray');
        }
    }, [hasShareIntent, pathname, router]);

    useEffect(() => {
        return subscribeChatGuardAlerts((alert) => {
            const detail = alert.reasons[0] ?? 'Phát hiện dấu hiệu lừa đảo';
            toast.error(`Cảnh báo ${alert.appName}: ${detail}`);
        });
    }, []);

    return null;
}
