// Nội dung tiếng Việt cho kết quả từ Core và lý do người xác minh được phép xem.
import { Text } from '@/components/ui/text';
import type {
    CoSignReason,
    CoSignStatus,
} from '@/features/co-sign/types/co-sign';

// Văn bản luôn đi cùng màu để phân biệt trạng thái khi bật trợ năng.
export function CoSignStatusLabel({ status }: { status: CoSignStatus }) {
    return (
        <Text
            accessibilityLiveRegion="polite"
            className="text-base font-bold text-primary"
        >
            {status === 'PENDING_REVIEW'
                ? 'Đang chờ xác minh'
                : status === 'NOT_REQUIRED'
                  ? 'Không cần xác minh'
                  : status === 'APPROVED'
                    ? 'Đã cho qua'
                    : status === 'BLOCKED'
                      ? 'Đã chặn'
                      : status === 'CANCELLED'
                        ? 'Đã hủy'
                        : 'Đã hết hạn'}
        </Text>
    );
}

// Lý do được lọc từ Core; UI không tự tính điểm rủi ro.
export function CoSignReasons({ reasons }: { reasons: CoSignReason[] }) {
    return reasons.map((reason) => (
        <Text key={reason} className="text-base">
            {reason === 'AMOUNT_THRESHOLD'
                ? 'Số tiền đạt ngưỡng bảo vệ.'
                : 'Core đánh dấu giao dịch có rủi ro cao.'}
        </Text>
    ));
}
