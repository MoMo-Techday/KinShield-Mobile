// Màn đầu của Co-Sign cho người dùng mở gia đình đã ghép hoặc dùng lời mời mới.
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { familyApi } from '@/features/family/api/family-api';
import {
    FamilyIssue,
    FamilyPage,
} from '@/features/family/components/FamilyPage';
import { useFamilyUser } from '@/features/family/hooks/family-context';
import { useFamilyList } from '@/features/family/hooks/use-family';
import type { FamilyFormAction } from '@/features/family/types/family';
import { familyKeys } from '@/features/family/utils/family-queries';
import { getSessionRevision } from '@/lib/api/client';

// Vai trò trong danh sách đến từ Core. Thành công mở đúng gia đình được API trả về.
export function FamilyPicker() {
    const userId = useFamilyUser();
    const client = useQueryClient();
    const router = useRouter();
    const families = useFamilyList(userId);
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const invitationCode = code.trim();
    const validCode = /^[A-Za-z0-9_-]{43}$/.test(invitationCode);
    const action = useMutation({
        // Core xác định role từ thao tác được phép, không nhận role do client gửi.
        mutationFn: ({ kind, value }: FamilyFormAction) =>
            kind === 'create'
                ? familyApi.create(value)
                : familyApi.accept(value),
        onMutate: getSessionRevision,
        onSuccess: (family, _action, revision) => {
            // Kết quả của màn đã logout không được điều hướng user mới.
            if (revision !== getSessionRevision()) return;
            setCode('');
            setName('');
            void client.invalidateQueries({
                queryKey: familyKeys.list(userId),
            });
            router.push({
                pathname: '/family/[familyId]',
                params: { familyId: family.id },
            });
        },
        onError: (_error, _action, revision) => {
            if (revision === getSessionRevision()) void families.refetch();
        },
    });

    return (
        <FamilyPage>
            <View className="gap-2">
                <Text accessibilityRole="header" className="text-3xl font-bold">
                    Gia đình an toàn
                </Text>
                <Text className="text-base text-muted-foreground">
                    Ghép cặp để người thân xác minh giao dịch mô phỏng khi cần.
                </Text>
            </View>
            {families.isPending && (
                <ActivityIndicator accessibilityLabel="Đang tải gia đình" />
            )}
            {families.isError && (
                <FamilyIssue
                    error={families.error}
                    onRetry={families.refetch}
                />
            )}
            {families.data?.length === 0 && (
                <Text accessibilityLiveRegion="polite">
                    Chưa có gia đình nào được ghép với tài khoản này.
                </Text>
            )}
            {families.data?.map((family) => (
                <Button
                    key={family.id}
                    variant="outline"
                    className="h-auto min-h-12 justify-start rounded-2xl p-4"
                    onPress={() =>
                        router.push({
                            pathname: '/family/[familyId]',
                            params: { familyId: family.id },
                        })
                    }
                >
                    <View className="min-w-0 flex-1 gap-1">
                        <Text className="text-lg font-bold">{family.name}</Text>
                        <Text>
                            {family.viewerRole === 'PARENT'
                                ? 'Cha mẹ'
                                : 'Người xác minh'}
                        </Text>
                    </View>
                </Button>
            ))}
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Tạo gia đình</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                    <Text>Tên gia đình</Text>
                    <Input
                        accessibilityLabel="Tên gia đình"
                        testID="family-name"
                        value={name}
                        onChangeText={setName}
                        placeholder="Ví dụ Gia đình An"
                        maxLength={120}
                        editable={!action.isPending}
                        className="h-auto min-h-12"
                    />
                    <Button
                        testID="family-create"
                        className="h-auto min-h-12"
                        disabled={!name.trim() || action.isPending}
                        onPress={() =>
                            action.mutate({
                                kind: 'create',
                                value: name.trim(),
                            })
                        }
                    >
                        <Text>
                            {action.isPending &&
                            action.variables?.kind === 'create'
                                ? 'Đang tạo...'
                                : 'Tạo gia đình'}
                        </Text>
                    </Button>
                </CardContent>
            </Card>
            <Card className="rounded-2xl">
                <CardHeader>
                    <CardTitle>Nhận lời mời</CardTitle>
                </CardHeader>
                <CardContent className="gap-3">
                    <Text>Mã mời từ người thân</Text>
                    <Input
                        accessibilityLabel="Mã mời"
                        testID="family-join-code"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="Dán mã mời"
                        editable={!action.isPending}
                        className="h-auto min-h-12"
                    />
                    {invitationCode.length > 0 && !validCode && (
                        <Text accessibilityLiveRegion="polite">
                            Mã mời cần đủ 43 ký tự. Hãy dán toàn bộ mã.
                        </Text>
                    )}
                    <Button
                        testID="family-accept"
                        className="h-auto min-h-12"
                        disabled={!validCode || action.isPending}
                        onPress={() =>
                            action.mutate({
                                kind: 'accept',
                                value: invitationCode,
                            })
                        }
                    >
                        <Text>
                            {action.isPending &&
                            action.variables?.kind === 'accept'
                                ? 'Đang tham gia...'
                                : 'Tham gia gia đình'}
                        </Text>
                    </Button>
                    {action.error && <FamilyIssue error={action.error} />}
                </CardContent>
            </Card>
        </FamilyPage>
    );
}
