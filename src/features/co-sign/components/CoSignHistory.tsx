// Lịch sử có cursor từ Core; danh sách chỉ hiển thị yêu cầu đúng quyền của tài khoản.
import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useCoSignList } from '@/features/co-sign/hooks/use-co-sign-data';
import { CoSignStatusLabel } from '@/features/co-sign/components/CoSignLabels';
import { formatVnd } from '@/features/co-sign/utils/co-sign-state';
import { classifyFamilyError } from '@/features/co-sign/utils/co-sign-errors';
import { FamilyIssue } from '@/features/family/components/FamilyPage';
import {
    useActiveFamily,
    useFamilyUser,
} from '@/features/family/hooks/family-context';

// Duyệt từng trang được cho phép. Ẩn dữ liệu đã cache khi Core báo mất quyền.
export function CoSignHistory() {
    const userId = useFamilyUser();
    const { id: familyId } = useActiveFamily();
    const router = useRouter();
    const query = useCoSignList(userId, familyId);
    const denied =
        query.isError &&
        ['missing', 'forbidden', 'unauthorized'].includes(
            classifyFamilyError(query.error).kind,
        );
    const items = denied
        ? []
        : (query.data?.pages.flatMap(({ snapshot }) => snapshot.items) ?? []);
    const visibleItems = [
        ...new Map(items.map((item) => [item.id, item])).values(),
    ];
    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Yêu cầu xác minh</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
                {query.isPending && (
                    <ActivityIndicator accessibilityLabel="Đang tải yêu cầu" />
                )}
                {query.isError && (
                    <FamilyIssue error={query.error} onRetry={query.refetch} />
                )}
                {!query.isPending &&
                    !query.isError &&
                    visibleItems.length === 0 && (
                        <Text>Chưa có yêu cầu nào.</Text>
                    )}
                {visibleItems.map((item) => (
                    <Button
                        key={item.id}
                        variant="outline"
                        className="h-auto min-h-12 justify-start rounded-xl p-3"
                        onPress={() =>
                            router.push({
                                pathname:
                                    '/family/[familyId]/co-sign/[requestId]',
                                params: { familyId, requestId: item.id },
                            })
                        }
                    >
                        <View className="min-w-0 flex-1 gap-1">
                            <Text className="text-lg font-bold">
                                {formatVnd(item.amountVnd)}
                            </Text>
                            <CoSignStatusLabel status={item.status} />
                            <Text className="text-muted-foreground">
                                {new Date(item.createdAt).toLocaleString(
                                    'vi-VN',
                                )}
                            </Text>
                        </View>
                    </Button>
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
                                : 'Xem thêm'}
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
                        <Text>Làm mới yêu cầu</Text>
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
