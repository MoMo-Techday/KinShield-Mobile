// Thẻ kết quả X-Ray chữ lớn, tương phản cao và dễ hiểu cho cha mẹ.
import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type {
    XRayAnalysisResult,
    XRayRiskLevel,
} from '@/features/xray/types/xray';

interface XRayResultCardProps {
    result: XRayAnalysisResult;
    onOpenFamily: () => void;
}

const LEVEL_STYLES: Record<
    XRayRiskLevel,
    { label: string; bannerClass: string; textClass: string }
> = {
    SAFE: {
        label: 'AN TOÀN',
        bannerClass: 'border-emerald-500/30 bg-emerald-500/10',
        textClass: 'text-emerald-700 dark:text-emerald-300',
    },
    WARN: {
        label: 'CẢNH BÁO',
        bannerClass: 'border-amber-500/35 bg-amber-500/10',
        textClass: 'text-amber-700 dark:text-amber-300',
    },
    BLOCK: {
        label: 'NGUY HIỂM',
        bannerClass: 'border-destructive/40 bg-destructive/10',
        textClass: 'text-destructive',
    },
    LOCKDOWN: {
        label: 'KHÓA KHẨN CẤP',
        bannerClass: 'border-destructive bg-destructive/15',
        textClass: 'text-destructive',
    },
};

function formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)}₫`;
}

export function XRayResultCard({ result, onOpenFamily }: XRayResultCardProps) {
    const style = LEVEL_STYLES[result.level];
    const vietQr = result.tier1Signals.vietQr;
    const isRisky = result.riskScore >= 50;

    return (
        <Card className="gap-0 rounded-[28px] border-border bg-card py-0 shadow-xl shadow-primary/[0.06]">
            <CardHeader className="gap-3 px-6 pt-6">
                <View
                    className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${style.bannerClass}`}
                >
                    <Text className={`text-sm font-extrabold ${style.textClass}`}>
                        {style.label}
                    </Text>
                    <Text className={`text-lg font-extrabold ${style.textClass}`}>
                        {result.riskScore}/100
                    </Text>
                </View>

                <CardTitle className="text-xl font-bold leading-snug text-foreground">
                    {result.verdict}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                    Phân loại: {result.scamCategory}
                </CardDescription>
            </CardHeader>

            <CardContent className="gap-5 px-6 pb-7 pt-4">
                <View className="gap-1.5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <Text className="text-xs font-extrabold uppercase tracking-wider text-primary">
                        Lời khuyên cho ba mẹ
                    </Text>
                    <Text className="text-base font-semibold leading-6 text-foreground">
                        {result.elderlyVoiceScript}
                    </Text>
                </View>

                {vietQr && (
                    <View className="gap-1.5 rounded-2xl border border-border bg-secondary/40 p-4">
                        <Text className="text-xs font-extrabold uppercase tracking-wider text-primary">
                            Thông tin giải mã VietQR
                        </Text>
                        <Text className="text-sm font-bold text-foreground">
                            {vietQr.bankName} • STK {vietQr.accountNumber}
                        </Text>
                        {vietQr.amountVnd !== null && (
                            <Text className="text-sm font-semibold text-foreground">
                                Số tiền: {formatVnd(vietQr.amountVnd)}
                            </Text>
                        )}
                        {vietQr.purpose.length > 0 && (
                            <Text className="text-xs text-muted-foreground">
                                Nội dung: {vietQr.purpose}
                            </Text>
                        )}
                        {vietQr.crcValid === false && (
                            <Text className="text-xs font-bold text-destructive">
                                Cảnh báo: Mã toàn vẹn CRC-16 không hợp lệ!
                            </Text>
                        )}
                    </View>
                )}

                {result.recommendedActions.length > 0 && (
                    <View className="gap-2">
                        <Text className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                            Nên làm ngay
                        </Text>
                        {result.recommendedActions.map((action, index) => (
                            <Text
                                key={`${index}-${action}`}
                                className="text-sm leading-5 text-foreground"
                            >
                                • {action}
                            </Text>
                        ))}
                    </View>
                )}

                {result.findings.length > 0 && (
                    <View className="gap-2 border-t border-border pt-4">
                        <Text className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">
                            Chi tiết kiểm tra ({result.engine})
                        </Text>
                        {result.findings.map((finding, index) => (
                            <View
                                key={`${index}-${finding.agent}`}
                                className="gap-0.5 rounded-xl border border-border bg-background/60 p-3"
                            >
                                <View className="flex-row items-center justify-between gap-2">
                                    <Text className="flex-1 text-xs font-bold text-foreground">
                                        {finding.agent}
                                    </Text>
                                    <Text className="text-xs font-extrabold text-primary">
                                        {finding.status} • {finding.score}
                                    </Text>
                                </View>
                                <Text className="text-xs leading-5 text-muted-foreground">
                                    {finding.detail}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {isRisky && (
                    <Button
                        testID="xray-open-family"
                        className="h-auto min-h-12 w-full rounded-xl"
                        onPress={onOpenFamily}
                    >
                        <Text className="font-bold text-primary-foreground">
                            Mở Gia đình &amp; Đồng duyệt với con
                        </Text>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
