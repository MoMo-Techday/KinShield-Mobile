// Chuyển request ID đã kiểm tra định dạng vào màn chi tiết.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { CoSignDetailScreen } from '@/features/co-sign/components/CoSignDetailScreen';
import { isUuid } from '@/features/co-sign/utils/co-sign-state';

// Route chỉ chọn màn. GET của feature dùng Bearer để xác minh quyền đọc.
export default function CoSignDetailRoute() {
    const { requestId } = useLocalSearchParams<{ requestId: string }>();
    return isUuid(requestId) ? (
        <CoSignDetailScreen key={requestId} requestId={requestId} />
    ) : (
        <Redirect href="/family" />
    );
}
