// Thẻ kết quả X-Ray gọn gàng, ít chữ, tập trung vào mức cảnh báo cho cha mẹ.
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
    { label: string; badgeClass: string; textClass: string; borderClass: string }
> = {
    SAFE: {
        label: 'AN TOÀN',
        badgeClass: 'bg-emerald-500/12',
        textClass: 'text-emerald-700 dark:text-emerald-300',
        borderClass: 'border-emerald-500/35',
    },
    WARN: {
        label: 'CẢNH BÁO',
        badgeClass: 'bg-amber-500/12',
        textClass: 'text-amber-700 dark:text-amber-300',
        borderClass: 'border-amber-500/40',
    },
    BLOCK: {
        label: 'NGUY HIỂM',
        badgeClass: 'bg-destructive/12',
        textClass: 'text-destructive',
        borderClass: 'border-destructive/45',
    },
    LOCKDOWN: {
        label: 'NGUY HIỂM CAO',
        badgeClass: 'bg-destructive/15',
        textClass: 'text-destructive',
        borderClass: 'border-destructive',
    },
};

const VND_FORMATTER = new Intl.NumberFormat('vi-VN');

function formatVnd(amount: number): string {
    return `${VND_FORMATTER.format(amount)}₫`;
}

export function XRayResultCard({ result, onOpenFamily }: XRayResultCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const style = LEVEL_STYLES[result.level];
    const vietQr = result.tier1Signals.vietQr;
    const isRisky = result.riskScore >= 50;
    const topActions = result.recommendedActions.slice(0, 2);

    return (
        <Card className={`gap-0 rounded-2xl border bg-card py-0 ${style.borderClass}`}>
            <CardContent className="gap-4 px-5 py-5">
                <View
                    className={`flex-row items-center justify-between rounded-xl px-4 py-2.5 ${style.badgeClass}`}
                >
                    <Text className={`text-sm font-extrabold tracking-wide ${style.textClass}`}>
                        {style.label}
                    </Text>
                    <Text className={`text-base font-extrabold ${style.textClass}`}>
                        {result.riskScore}/100
                    </Text>
                </View>

                <View className="gap-2">
                    <Text className="text-lg font-bold leading-snug text-foreground">
                        {result.verdict}
                    </Text>
                    <Text className="text-sm leading-6 text-muted-foreground">
                        {result.elderlyVoiceScript}
                    </Text>
                </View>

                {vietQr && (
                    <View className="gap-1 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5">
                        <Text className="text-xs font-bold text-foreground">
                            VietQR: {vietQr.bankName} • {vietQr.accountNumber}
                            {vietQr.amountVnd !== null ? ` • ${formatVnd(vietQr.amountVnd)}` : ''}
                        </Text>
                        {vietQr.crcValid === false && (
                            <Text className="text-xs font-bold text-destructive">
                                Mã CRC-16 không hợp lệ — nghi QR giả mạo.
                            </Text>
                        )}
                    </View>
                )}

                {topActions.length > 0 && (
                    <View className="gap-1.5 border-t border-border pt-3">
                        {topActions.map((action, index) => (
                            <Text
                                key={`${index}-${action}`}
                                className="text-sm leading-5 text-foreground"
                            >
                                • {action}
                            </Text>
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
                            Gọi xác minh / Đồng duyệt với con
                        </Text>
                    </Button>
                )}

                {result.findings.length > 0 && (
                    <View className="border-t border-border pt-2">
                        <Pressable
                            onPress={() => setShowDetails((prev) => !prev)}
                            className="py-1.5"
                        >
                            <Text className="text-xs font-semibold text-muted-foreground">
                                {showDetails ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật'}
                            </Text>
                        </Pressable>

                        {showDetails && (
                            <View className="mt-2 gap-2">
                                <Text className="text-xs text-muted-foreground">
                                    {result.scamCategory} · {result.engine}
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
                                            <Text className="text-xs font-bold text-primary">
                                                {finding.score}/100
                                            </Text>
                                        </View>
                                        <Text className="text-xs leading-5 text-muted-foreground">
                                            {finding.detail}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </CardContent>
        </Card>
    );
}
