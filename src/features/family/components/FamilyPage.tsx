// Khung cuộn dùng chung để nội dung và nút vẫn tiếp cận được với màn nhỏ và cỡ chữ lớn.
import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { classifyFamilyError } from '@/features/co-sign/utils/co-sign-errors';

// Giữ vùng an toàn phía dưới, đẩy nội dung lên khi mở bàn phím và để form cuộn mượt.
export function FamilyPage({ children }: PropsWithChildren) {
    return (
        <SafeAreaView edges={['bottom']} className="flex-1 bg-background">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
                className="flex-1"
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerClassName="px-5 py-5 pb-10"
                >
                    <View className="mx-auto w-full max-w-[540px] gap-4">
                        {children}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// Lỗi được đọc thành lời và không đưa thông tin kỹ thuật từ API lên màn hình.
export function FamilyIssue({
    error,
    onRetry,
}: {
    error: unknown;
    onRetry?: () => unknown;
}) {
    const { kind } = classifyFamilyError(error);
    return (
        <View className="gap-3 rounded-2xl border border-destructive/40 bg-card p-4">
            <Text
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
                className="text-base"
            >
                {kind === 'offline'
                    ? 'Mất kết nối. Kiểm tra mạng rồi thử lại.'
                    : kind === 'unavailable'
                      ? 'Máy chủ đang gián đoạn. Vui lòng thử lại sau.'
                      : kind === 'unauthorized'
                        ? 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.'
                        : kind === 'forbidden' || kind === 'missing'
                          ? 'Bạn không còn quyền xem nội dung này.'
                          : kind === 'expired'
                            ? 'Yêu cầu đã quá hạn.'
                            : kind === 'resolved'
                              ? 'Yêu cầu đã được xử lý. Trạng thái đã được cập nhật.'
                              : kind === 'invalid-invite'
                                ? 'Không tìm thấy mã mời. Hãy kiểm tra lại mã.'
                                : kind === 'invite-ended'
                                  ? 'Mã mời đã hết hạn, bị thu hồi hoặc đã dùng. Hãy xin mã mới.'
                                  : kind === 'guardian-required'
                                    ? 'Cần ghép một người xác minh trước khi tạo yêu cầu cần duyệt.'
                                    : kind === 'guardian-assigned'
                                      ? 'Gia đình đã có người xác minh.'
                                      : kind === 'rate-limit'
                                        ? 'Bạn đã thử quá nhiều lần. Hãy đợi một phút rồi thử lại.'
                                        : 'Thao tác chưa hoàn tất. Kiểm tra thông tin và thử lại.'}
            </Text>
            {onRetry && (
                <Button
                    variant="outline"
                    className="h-auto min-h-12"
                    onPress={() => void onRetry()}
                >
                    <Text>Thử lại</Text>
                </Button>
            )}
        </View>
    );
}
