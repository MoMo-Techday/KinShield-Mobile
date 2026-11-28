// Chuẩn hóa MIME ảnh và đọc file chia sẻ từ Zalo thành base64 để gửi lên Core/AI.
import { File } from 'expo-file-system';
import type { XRayAnalyzeRequest } from '@/features/xray/types/xray';

export type AllowedXRayImageMime = NonNullable<XRayAnalyzeRequest['imageMime']>;

export function normalizeXRayImageMime(
    rawMime?: string | null,
    fileName?: string | null,
): AllowedXRayImageMime {
    const lower = (rawMime ?? '').toLowerCase();
    if (lower === 'image/png' || (fileName ?? '').toLowerCase().endsWith('.png')) {
        return 'image/png';
    }
    if (
        lower === 'image/webp' ||
        (fileName ?? '').toLowerCase().endsWith('.webp')
    ) {
        return 'image/webp';
    }
    return 'image/jpeg';
}

export async function readSharedImageAsBase64(
    rawPath: string,
): Promise<string | null> {
    if (!rawPath) return null;
    try {
        const uri =
            rawPath.startsWith('file://') || rawPath.startsWith('content://')
                ? rawPath
                : `file://${rawPath}`;
        const file = new File(uri);
        const encoded = await file.base64();
        return encoded.length > 0 ? encoded : null;
    } catch {
        return null;
    }
}
