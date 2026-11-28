// Tự điều hướng sang màn hình /xray khi người dùng bấm Chia sẻ ảnh/tin nhắn từ Zalo sang KinShield.
import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useShareIntentContext } from 'expo-share-intent';

export function ShareIntentRedirectBridge() {
    const router = useRouter();
    const pathname = usePathname();
    const { hasShareIntent } = useShareIntentContext();

    useEffect(() => {
        if (hasShareIntent && pathname !== '/xray') {
            router.push('/xray');
        }
    }, [hasShareIntent, pathname, router]);

    return null;
}
