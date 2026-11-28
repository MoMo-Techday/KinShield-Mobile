import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useCallAlerts } from '@/features/call-protection/hooks/use-call-alerts';
import { useCallAlertRealtime } from '@/features/call-protection/hooks/use-call-alert-realtime';
import { canViewCallAlerts } from '@/features/call-protection/utils/call-protection-access';
import { classifyFamilyError } from '@/features/co-sign/utils/co-sign-errors';
import { FamilyIssue, FamilyPage } from '@/features/family/components/FamilyPage';
import {
    useActiveFamily,
    useFamilyUser,
} from '@/features/family/hooks/family-context';

export function CallAlertsScreen() {
    const userId = useFamilyUser();
    const family = useActiveFamily();
    const allowed = canViewCallAlerts(family.viewerRole);
    const query = useCallAlerts(userId, family.id, allowed);
    const denied =
        query.isError &&
        ['missing', 'forbidden', 'unauthorized'].includes(
            classifyFamilyError(query.error).kind,
        );
    useCallAlertRealtime(userId, family.id, allowed && !denied);

    if (!allowed) return <Redirect href="/family" />;

    const alerts = denied
        ? []
        : (query.data?.pages.flatMap((page) => page.items) ?? []);

    return (
        <FamilyPage>
            <View className="gap-2">
                <Text accessibilityRole="header" className="text-3xl font-bold">
                    Cảnh báo cuộc gọi
                </Text>
                <Text className="text-base text-muted-foreground">
                    Chỉ hiển thị mức rủi ro và thời điểm cảnh báo đã lưu.
                </Text>
            </View>

            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Hộp thư cảnh báo SOS</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                    {query.isPending && (
                        <ActivityIndicator accessibilityLabel="Đang tải cảnh báo" />
                    )}
                    {query.isError && (
                        <FamilyIssue error={query.error} onRetry={query.refetch} />
                    )}
                    {!query.isPending &&
                        !query.isError &&
                        alerts.length === 0 && (
                            <Text>Chưa có cảnh báo nào được lưu.</Text>
                        )}
                    {alerts.map((alert) => (
                        <View
                            key={alert.alertId}
                            className="gap-2 rounded-xl border border-border p-3"
                        >
                            <Text className="text-lg font-bold">
                                Nguy cơ cao · {alert.riskScore}/100
                            </Text>
                            <Text>Giai đoạn {alert.stage}</Text>
                            <Text className="text-muted-foreground">
                                {new Date(alert.createdAt).toLocaleString(
                                    'vi-VN',
                                )}
                            </Text>
                        </View>
                    ))}
                    {query.hasNextPage && !denied && (
                        <Button
                            variant="outline"
                            className="h-auto min-h-12"
                            disabled={query.isFetching}
                            onPress={() => void query.fetchNextPage()}
                        >
                            <Text>
                                {query.isFetchingNextPage
                                    ? 'Đang tải...'
                                    : 'Xem thêm cảnh báo'}
                            </Text>
                        </Button>
                    )}
                    {!query.isPending && !denied && (
                        <Button
                            variant="ghost"
                            className="h-auto min-h-12"
                            disabled={query.isFetching}
                            onPress={() => void query.refetch()}
                        >
                            <Text>Làm mới cảnh báo</Text>
                        </Button>
                    )}
                </CardContent>
            </Card>
        </FamilyPage>
    );
}
