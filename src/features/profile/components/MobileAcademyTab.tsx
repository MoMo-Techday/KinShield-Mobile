// Tab Cẩm nang chống lừa đảo trên Mobile: Checklist 5 nguyên tắc vàng + 4 kịch bản lừa đảo phổ biến tại Việt Nam.
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { GOLDEN_SAFETY_RULES } from '@/features/profile/utils/profile-extras';

interface MobileAcademyTabProps {
    largeText: boolean;
    acknowledgedRuleIds: string[];
    onToggleRule: (ruleId: string) => void;
    onOpenXRay: () => void;
    onOpenContacts: () => void;
}

const SCAM_PLAYBOOKS = [
    {
        id: 'police',
        tag: 'Giả Công an / VNeID',
        headline: 'Gọi video mặc sắc phục, dọa phong tỏa tài khoản',
        signs: [
            'Yêu cầu chuyển tiền vào “tài khoản tạm giữ chứng minh trong sạch”.',
            'Gửi link lạ cài ứng dụng VNeID / Dịch vụ công giả (.apk).',
            'Cấm không được nói chuyện với con cái hay người thân.',
        ],
        action: 'Cúp máy ngay — Công an KHÔNG BAO GIỜ làm việc hay thu tiền qua điện thoại.',
        target: 'contacts' as const,
        cta: 'Mở danh bạ gọi người thân',
    },
    {
        id: 'shipper',
        tag: 'Giả Shipper giao hàng',
        headline: 'Báo đơn hàng gửi về quê, giục chuyển khoản gấp',
        signs: [
            'Giục chuyển tiền vào STK cá nhân lạ rồi gửi link “hủy hội viên”.',
            'Báo đã để hàng trước cửa khi cả nhà không ai đặt.',
        ],
        action: 'Hỏi lại người thân và soi số tài khoản/tin nhắn bằng X-Ray trước khi chuyển.',
        target: 'xray' as const,
        cta: 'Soi tin nhắn / QR ngay',
    },
    {
        id: 'utility',
        tag: 'Giả hóa đơn Điện / Nước',
        headline: 'Dọa cắt điện trong 2 giờ nếu không quét mã QR ngay',
        signs: [
            'Gửi mã QR cá nhân hoặc đường link web tên miền gần giống EVN.',
            'Hối thúc thao tác gấp, không cho thời gian kiểm tra.',
        ],
        action: 'Chụp màn hình gửi vào Soi 1 chạm X-Ray để xác minh người nhận thật.',
        target: 'xray' as const,
        cta: 'Soi ảnh hóa đơn / QR',
    },
    {
        id: 'deepvoice',
        tag: 'Giả giọng người thân (AI)',
        headline: 'Cuộc gọi chập chờn giọng giống con cháu báo tai nạn gấp',
        signs: [
            'Gọi ngắn vài giây rồi tắt, sau đó nhắn tin xin chuyển vào STK lạ.',
            'Né tránh trả lời câu hỏi riêng tư của gia đình.',
        ],
        action: 'Gọi trực tiếp số thật của con cháu trong Danh bạ khẩn cấp KinShield.',
        target: 'contacts' as const,
        cta: 'Gọi xác minh người thân',
    },
] as const;

export function MobileAcademyTab({
    largeText,
    acknowledgedRuleIds,
    onToggleRule,
    onOpenXRay,
    onOpenContacts,
}: MobileAcademyTabProps) {
    const bodyClass = largeText ? 'text-base' : 'text-sm';

    return (
        <View className="gap-4">
            {/* 5 Golden Rules Interactive Checklist */}
            <Card className="gap-0 rounded-2xl border-border bg-card py-0">
                <CardHeader className="gap-1 px-5 pt-5">
                    <Text className="text-[11px] font-bold uppercase tracking-wider text-primary">
                        Cẩm nang gia đình
                    </Text>
                    <CardTitle className="text-lg font-bold text-foreground">
                        5 Nguyên tắc vàng ({acknowledgedRuleIds.length}/
                        {GOLDEN_SAFETY_RULES.length})
                    </CardTitle>
                    <CardDescription className={bodyClass}>
                        Chạm vào từng nguyên tắc sau khi đọc cùng ông bà để tích
                        ghi nhớ &amp; cộng Điểm an toàn.
                    </CardDescription>
                </CardHeader>

                <CardContent className="gap-2.5 px-5 pb-5 pt-4">
                    {GOLDEN_SAFETY_RULES.map((rule) => {
                        const checked = acknowledgedRuleIds.includes(rule.id);
                        return (
                            <Pressable
                                key={rule.id}
                                onPress={() => onToggleRule(rule.id)}
                                className={`flex-row items-start gap-3 rounded-xl border p-3.5 ${
                                    checked
                                        ? 'border-success-foreground/30 bg-success'
                                        : 'border-border bg-background'
                                }`}
                            >
                                <View
                                    className={`mt-0.5 size-5 items-center justify-center rounded-full border ${
                                        checked
                                            ? 'border-success-foreground bg-success-foreground'
                                            : 'border-muted-foreground/50 bg-card'
                                    }`}
                                >
                                    {checked && (
                                        <Text className="text-[10px] font-extrabold text-card">
                                            ✓
                                        </Text>
                                    )}
                                </View>
                                <View className="flex-1 gap-0.5">
                                    <Text
                                        className={`font-bold text-foreground ${bodyClass}`}
                                    >
                                        {rule.title}
                                    </Text>
                                    <Text className="text-xs leading-5 text-muted-foreground">
                                        {rule.detail}
                                    </Text>
                                </View>
                            </Pressable>
                        );
                    })}
                </CardContent>
            </Card>

            {/* 4 Common Vietnam Scam Playbooks */}
            <View className="gap-3">
                <Text className="px-1 text-base font-bold text-foreground">
                    4 chiêu trò lừa đảo phổ biến tại Việt Nam
                </Text>

                {SCAM_PLAYBOOKS.map((item) => (
                    <Card
                        key={item.id}
                        className="gap-0 rounded-2xl border-border bg-card py-0"
                    >
                        <CardHeader className="gap-1.5 px-5 pt-5">
                            <View className="self-start rounded-md bg-accent px-2.5 py-0.5">
                                <Text className="text-[11px] font-bold text-accent-foreground">
                                    {item.tag}
                                </Text>
                            </View>
                            <CardTitle className="text-base font-bold text-foreground">
                                {item.headline}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="gap-3 px-5 pb-5 pt-3">
                            <View className="gap-1.5">
                                {item.signs.map((sign) => (
                                    <Text
                                        key={sign}
                                        className="text-xs leading-5 text-muted-foreground"
                                    >
                                        • {sign}
                                    </Text>
                                ))}
                            </View>

                            <View className="rounded-xl border border-warning-foreground/20 bg-warning px-3.5 py-2.5">
                                <Text className="text-xs font-semibold leading-5 text-warning-foreground">
                                    Cách xử lý: {item.action}
                                </Text>
                            </View>

                            <Button
                                variant="outline"
                                className="h-10 w-full rounded-xl"
                                onPress={
                                    item.target === 'xray'
                                        ? onOpenXRay
                                        : onOpenContacts
                                }
                            >
                                <Text className="text-xs font-bold text-foreground">
                                    {item.cta}
                                </Text>
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </View>
        </View>
    );
}
