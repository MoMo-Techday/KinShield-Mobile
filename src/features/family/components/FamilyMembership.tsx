// Phần ghép cặp và ngưỡng thuộc vai trò do Core trả, mã mời không lưu vào cache.
import { useEffect, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { familyApi } from '@/features/family/api/family-api';
import { FamilyIssue } from '@/features/family/components/FamilyPage';
import {
    useActiveFamily,
    useFamilyUser,
} from '@/features/family/hooks/family-context';
import type {
    FamilyInvitation,
    ManageFamilyAction,
} from '@/features/family/types/family';
import { familyKeys } from '@/features/family/utils/family-queries';
import { formatVnd, parseVnd } from '@/features/co-sign/utils/co-sign-state';
import { getSessionRevision } from '@/lib/api/client';

// Hiện người đang ghép và cho PARENT sửa ngưỡng hoặc cấp mã theo membership mới nhất.
export function FamilyMembership() {
    const userId = useFamilyUser();
    const family = useActiveFamily();
    const client = useQueryClient();
    const [thresholdText, setThresholdText] = useState('');
    const [invitation, setInvitation] = useState<FamilyInvitation | null>(null);
    const [sharingError, setSharingError] = useState(false);
    const [confirmRemoval, setConfirmRemoval] = useState(false);
    const [pending, setPending] = useState<ManageFamilyAction['kind'] | null>(
        null,
    );
    const [error, setError] = useState<unknown>(null);
    const busy = useRef(false);
    const guardian = family.members.find(
        (member) => member.role === 'GUARDIAN',
    );
    const threshold = parseVnd(thresholdText, 500_000, 500_000_000);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!invitation || guardian) return;
        const timer = setInterval(() => setNow(Date.now()), 1_000);
        return () => clearInterval(timer);
    }, [guardian, invitation]);

    // Điều phối các lệnh ghi tuần tự. Chỉ cập nhật cache nếu tài khoản vẫn là phiên đã gửi lệnh.
    async function manage(action: ManageFamilyAction) {
        if (busy.current || family.viewerRole !== 'PARENT') return;
        busy.current = true;
        const revision = getSessionRevision();
        setPending(action.kind);
        setError(null);
        try {
            if (action.kind === 'invite') {
                const issued = await familyApi.invite(family.id);
                if (revision !== getSessionRevision()) return;
                setNow(Date.now());
                setInvitation(issued);
                setSharingError(false);
            } else {
                if (action.kind === 'threshold') {
                    await familyApi.updateThreshold(
                        family.id,
                        action.thresholdVnd,
                    );
                    setThresholdText('');
                } else {
                    await familyApi.removeGuardian(
                        family.id,
                        action.membershipId,
                    );
                    setConfirmRemoval(false);
                    setInvitation(null);
                }
                if (revision === getSessionRevision())
                    await client.invalidateQueries({
                        queryKey: familyKeys.scope(userId, family.id),
                    });
            }
        } catch (failure) {
            setError(failure);
            if (revision === getSessionRevision())
                void client.invalidateQueries({
                    queryKey: familyKeys.membership(userId, family.id),
                });
        } finally {
            busy.current = false;
            setPending(null);
        }
    }

    // Chia sẻ do người dùng chủ động bấm, mã vẫn có thể chọn thủ công nếu hệ điều hành từ chối.
    async function shareInvite() {
        if (!invitation || Date.parse(invitation.expiresAt) <= Date.now())
            return;
        try {
            await Share.share({ message: invitation.code });
        } catch {
            setSharingError(true);
        }
    }

    const liveInvitation =
        invitation && Date.parse(invitation.expiresAt) > now
            ? invitation
            : null;
    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Thành viên và ngưỡng bảo vệ</CardTitle>
            </CardHeader>
            <CardContent className="gap-4">
                {family.members.map((member) => (
                    <View key={member.id} className="gap-1">
                        <Text className="font-semibold">
                            {member.displayName}
                        </Text>
                        <Text className="text-muted-foreground">
                            {member.role === 'PARENT'
                                ? 'Cha mẹ'
                                : 'Người xác minh'}
                        </Text>
                    </View>
                ))}
                {!guardian && <Text>Chưa ghép người xác minh.</Text>}
                <Text className="font-semibold">
                    Ngưỡng hiện tại {formatVnd(family.thresholdVnd)}
                </Text>
                {family.viewerRole === 'PARENT' && (
                    <>
                        <Input
                            accessibilityLabel="Ngưỡng bảo vệ theo đồng"
                            testID="family-threshold"
                            className="h-auto min-h-12"
                            keyboardType="number-pad"
                            value={thresholdText}
                            onChangeText={setThresholdText}
                            placeholder="Từ 500.000 đến 500.000.000 đồng"
                            editable={!pending}
                        />
                        <Button
                            variant="outline"
                            className="h-auto min-h-12"
                            disabled={threshold === null || Boolean(pending)}
                            onPress={() => {
                                if (threshold !== null)
                                    void manage({
                                        kind: 'threshold',
                                        thresholdVnd: threshold,
                                    });
                            }}
                        >
                            <Text>
                                {pending === 'threshold'
                                    ? 'Đang lưu...'
                                    : 'Lưu ngưỡng'}
                            </Text>
                        </Button>
                        {!guardian && (
                            <Button
                                className="h-auto min-h-12"
                                testID="family-issue-invite"
                                disabled={Boolean(pending)}
                                onPress={() => void manage({ kind: 'invite' })}
                            >
                                <Text>
                                    {pending === 'invite'
                                        ? 'Đang tạo mã...'
                                        : liveInvitation
                                          ? 'Tạo mã mới'
                                          : 'Tạo mã mời'}
                                </Text>
                            </Button>
                        )}
                        {!guardian && liveInvitation && (
                            <View className="gap-2 rounded-xl bg-muted p-3">
                                <Text className="font-semibold">Mã mời</Text>
                                <Text testID="family-issued-code" selectable>
                                    {liveInvitation.code}
                                </Text>
                                <Text>
                                    Hết hạn lúc{' '}
                                    {new Date(
                                        liveInvitation.expiresAt,
                                    ).toLocaleTimeString('vi-VN')}
                                </Text>
                                <Button
                                    variant="outline"
                                    className="h-auto min-h-12"
                                    onPress={() => void shareInvite()}
                                >
                                    <Text>Chia sẻ mã mời</Text>
                                </Button>
                                {sharingError && (
                                    <Text accessibilityRole="alert">
                                        Không mở được chia sẻ. Hãy chọn và sao
                                        chép mã.
                                    </Text>
                                )}
                            </View>
                        )}
                        {guardian &&
                            (!confirmRemoval ? (
                                <Button
                                    variant="outline"
                                    className="h-auto min-h-12"
                                    onPress={() => setConfirmRemoval(true)}
                                >
                                    <Text>Gỡ người xác minh</Text>
                                </Button>
                            ) : (
                                <View className="gap-2">
                                    <Text>
                                        Gỡ {guardian.displayName} sẽ hủy các yêu
                                        cầu đang chờ người này xác minh.
                                    </Text>
                                    <Button
                                        variant="destructive"
                                        className="h-auto min-h-12"
                                        disabled={Boolean(pending)}
                                        onPress={() =>
                                            void manage({
                                                kind: 'remove',
                                                membershipId: guardian.id,
                                            })
                                        }
                                    >
                                        <Text>
                                            {pending === 'remove'
                                                ? 'Đang gỡ...'
                                                : 'Xác nhận gỡ'}
                                        </Text>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="h-auto min-h-12"
                                        disabled={Boolean(pending)}
                                        onPress={() => setConfirmRemoval(false)}
                                    >
                                        <Text>Quay lại</Text>
                                    </Button>
                                </View>
                            ))}
                    </>
                )}
                {Boolean(error) && <FamilyIssue error={error} />}
            </CardContent>
        </Card>
    );
}
