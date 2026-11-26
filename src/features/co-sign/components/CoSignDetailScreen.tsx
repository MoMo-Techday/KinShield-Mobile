// Chi tiết Co-Sign dùng snapshot được lọc, đồng hồ và xác nhận thao tác theo role.
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useCoSignDetail } from '@/features/co-sign/hooks/use-co-sign-data';
import { useCoSignDecision } from '@/features/co-sign/hooks/use-co-sign-decision';
import { useDeadline } from '@/features/co-sign/hooks/use-deadline';
import {
    CoSignReasons,
    CoSignStatusLabel,
} from '@/features/co-sign/components/CoSignLabels';
import {
    allowedActions,
    formatVnd,
} from '@/features/co-sign/utils/co-sign-state';
import { classifyFamilyError } from '@/features/co-sign/utils/co-sign-errors';
import type { CoSignAction } from '@/features/co-sign/types/co-sign';
import {
    FamilyIssue,
    FamilyPage,
} from '@/features/family/components/FamilyPage';
import {
    useActiveFamily,
    useFamilyUser,
} from '@/features/family/hooks/family-context';

// Chỉ hiện nút khi còn hạn và đúng vai trò; trạng thái cuối và quyết định luôn đến từ HTTP.
export function CoSignDetailScreen({ requestId }: { requestId: string }) {
    const userId = useFamilyUser();
    const family = useActiveFamily();
    const query = useCoSignDetail(userId, family.id, requestId);
    const decision = useCoSignDecision(requestId);
    const remaining = useDeadline(query.data, query.refetch);
    const [confirmation, setConfirmation] = useState<CoSignAction | null>(null);
    const kind = query.isError ? classifyFamilyError(query.error).kind : null;
    const denied =
        kind === 'missing' || kind === 'forbidden' || kind === 'unauthorized';
    const snapshot = denied ? undefined : query.data?.snapshot;
    const actions =
        snapshot && !query.isError
            ? allowedActions(family.viewerRole, snapshot.status, remaining)
            : [];
    const guardian = family.members.find(
        (member) => member.role === 'GUARDIAN',
    );
    const activeConfirmation =
        confirmation && actions.includes(confirmation) ? confirmation : null;
    const seconds = Math.ceil(remaining / 1_000);
    return (
        <FamilyPage>
            {query.isPending && (
                <ActivityIndicator accessibilityLabel="Đang đọc yêu cầu xác minh" />
            )}
            {query.isError && (
                <FamilyIssue error={query.error} onRetry={query.refetch} />
            )}
            {snapshot && (
                <Card className="rounded-2xl">
                    <CardHeader className="gap-2">
                        <CardTitle>Giao dịch mô phỏng</CardTitle>
                        <Text className="text-3xl font-bold">
                            {formatVnd(snapshot.amountVnd)}
                        </Text>
                        <CoSignStatusLabel status={snapshot.status} />
                        <Text className="text-muted-foreground">
                            Thao tác trên yêu cầu này không chuyển tiền thật.
                        </Text>
                    </CardHeader>
                    <CardContent className="gap-4">
                        <CoSignReasons reasons={snapshot.reasonCodes} />
                        {snapshot.expiresAt && (
                            <Text>
                                Hạn xác minh{' '}
                                {new Date(snapshot.expiresAt).toLocaleString(
                                    'vi-VN',
                                )}
                            </Text>
                        )}
                        {snapshot.status === 'PENDING_REVIEW' && (
                            <>
                                {guardian && (
                                    <Text>
                                        Người xác minh {guardian.displayName}
                                    </Text>
                                )}
                                {remaining > 0 ? (
                                    <Text
                                        accessibilityLabel="Thời gian xác minh còn lại"
                                        className="text-2xl font-bold"
                                    >
                                        {Math.floor(seconds / 60)}:
                                        {String(seconds % 60).padStart(2, '0')}
                                    </Text>
                                ) : (
                                    <Text accessibilityLiveRegion="polite">
                                        Đã đến hạn. Đang kiểm tra kết quả từ
                                        Core.
                                    </Text>
                                )}
                            </>
                        )}
                        {Boolean(decision.error) && (
                            <FamilyIssue error={decision.error} />
                        )}
                        {decision.uncertainAction &&
                            snapshot.status === 'PENDING_REVIEW' && (
                                <View className="gap-2">
                                    <Text accessibilityLiveRegion="polite">
                                        Chưa nhận được phản hồi. Kiểm tra lại
                                        trước khi gửi tiếp.
                                    </Text>
                                    <Button
                                        className="h-auto min-h-12"
                                        disabled={decision.pending}
                                        onPress={() => {
                                            if (decision.uncertainAction)
                                                void decision.submit(
                                                    decision.uncertainAction,
                                                );
                                        }}
                                    >
                                        <Text>
                                            {decision.pending
                                                ? 'Đang kiểm tra...'
                                                : 'Kiểm tra và thử lại'}
                                        </Text>
                                    </Button>
                                </View>
                            )}
                        {!decision.uncertainAction &&
                            !activeConfirmation &&
                            actions.map((action) => (
                                <Button
                                    key={action}
                                    testID={`co-sign-action-${action.toLowerCase()}`}
                                    className="h-auto min-h-12"
                                    disabled={decision.pending}
                                    variant={
                                        action === 'APPROVE'
                                            ? 'default'
                                            : 'outline'
                                    }
                                    onPress={() => setConfirmation(action)}
                                >
                                    <Text>
                                        {action === 'APPROVE'
                                            ? 'Cho qua'
                                            : action === 'BLOCK'
                                              ? 'Chặn'
                                              : 'Hủy yêu cầu'}
                                    </Text>
                                </Button>
                            ))}
                        {!decision.uncertainAction && activeConfirmation && (
                            <View className="gap-3 rounded-xl border border-border p-3">
                                <Text className="font-semibold">
                                    {activeConfirmation === 'APPROVE'
                                        ? 'Xác nhận cho qua giao dịch mô phỏng?'
                                        : activeConfirmation === 'BLOCK'
                                          ? 'Xác nhận chặn giao dịch mô phỏng?'
                                          : 'Xác nhận hủy yêu cầu mô phỏng?'}
                                </Text>
                                <Button
                                    className="h-auto min-h-12"
                                    testID="co-sign-confirm"
                                    disabled={decision.pending}
                                    variant={
                                        activeConfirmation === 'APPROVE'
                                            ? 'default'
                                            : 'destructive'
                                    }
                                    onPress={() => {
                                        setConfirmation(null);
                                        void decision.submit(
                                            activeConfirmation,
                                        );
                                    }}
                                >
                                    <Text>
                                        {decision.pending
                                            ? 'Đang gửi...'
                                            : 'Xác nhận'}
                                    </Text>
                                </Button>
                                <Button
                                    className="h-auto min-h-12"
                                    variant="ghost"
                                    disabled={decision.pending}
                                    onPress={() => setConfirmation(null)}
                                >
                                    <Text>Quay lại</Text>
                                </Button>
                            </View>
                        )}
                        {decision.pending && (
                            <Text accessibilityLiveRegion="polite">
                                Đang chờ phản hồi từ Core...
                            </Text>
                        )}
                        <Button
                            className="h-auto min-h-12"
                            variant="ghost"
                            disabled={query.isFetching}
                            onPress={() => void query.refetch()}
                        >
                            <Text>Làm mới trạng thái</Text>
                        </Button>
                    </CardContent>
                </Card>
            )}
        </FamilyPage>
    );
}
