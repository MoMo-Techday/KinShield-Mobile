// Cha mẹ nhập thông tin demo. Retry giữ cả idempotency key lẫn nội dung đã gửi.
import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { coSignApi } from '@/features/co-sign/api/co-sign-api';
import { coSignKeys } from '@/features/co-sign/utils/co-sign-queries';
import {
    makeSimulationAttempt,
    newerDetail,
    parseVnd,
} from '@/features/co-sign/utils/co-sign-state';
import { isUncertainError } from '@/features/co-sign/utils/co-sign-errors';
import { FamilyIssue } from '@/features/family/components/FamilyPage';
import {
    useActiveFamily,
    useFamilyUser,
} from '@/features/family/hooks/family-context';
import type {
    CoSignDetail,
    SimulationAttempt,
    TimedCoSign,
} from '@/features/co-sign/types/co-sign';
import { getSessionRevision } from '@/lib/api/client';

// Chỉ Core quyết định giao dịch có cần giữ. Lỗi mất phản hồi khóa dữ liệu form để lần thử lại dùng cùng key.
export function SimulationForm() {
    const userId = useFamilyUser();
    const family = useActiveFamily();
    const client = useQueryClient();
    const router = useRouter();
    const [amountText, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [unconfirmed, setUnconfirmed] = useState<SimulationAttempt | null>(
        null,
    );
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<unknown>(null);
    const sending = useRef(false);
    const amount = parseVnd(amountText, 1, 2_147_483_647);

    // Dùng cùng attempt khi Core có thể đã commit. Chặn hai lần chạm trong cùng lượt render.
    async function submit() {
        if (
            sending.current ||
            amount === null ||
            !recipient.trim() ||
            family.viewerRole !== 'PARENT'
        )
            return;
        const revision = getSessionRevision();
        const attempt =
            unconfirmed ?? makeSimulationAttempt(amount, recipient, randomUUID);
        sending.current = true;
        setPending(true);
        setError(null);
        try {
            const result = await coSignApi.create(family.id, attempt);
            if (revision !== getSessionRevision()) return;
            const requestId = result.snapshot.id;
            client.setQueryData<TimedCoSign<CoSignDetail>>(
                coSignKeys.detail(userId, family.id, requestId),
                (current) => newerDetail(current, result),
            );
            void client.invalidateQueries({
                queryKey: coSignKeys.list(userId, family.id),
            });
            setUnconfirmed(null);
            setAmount('');
            setRecipient('');
            router.push({
                pathname: '/family/[familyId]/co-sign/[requestId]',
                params: { familyId: family.id, requestId },
            });
        } catch (failure) {
            if (revision !== getSessionRevision()) return;
            // Một lỗi xác thực sau timeout vẫn chưa chứng minh lần gửi trước đã bị từ chối.
            setUnconfirmed(
                isUncertainError(failure) || unconfirmed ? attempt : null,
            );
            setError(failure);
        } finally {
            sending.current = false;
            setPending(false);
        }
    }

    return (
        <Card className="rounded-2xl">
            <CardHeader>
                <CardTitle>Tạo giao dịch mô phỏng</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
                <Text className="text-muted-foreground">
                    Giao dịch mô phỏng, không chuyển tiền thật.
                </Text>
                <Text>Số tiền (đồng)</Text>
                <Input
                    accessibilityLabel="Số tiền mô phỏng theo đồng"
                    testID="co-sign-amount"
                    placeholder="Ví dụ 5000000"
                    className="h-auto min-h-12"
                    keyboardType="number-pad"
                    value={amountText}
                    onChangeText={setAmount}
                    editable={!pending && !unconfirmed}
                />
                <Text>Tên người nhận mô phỏng</Text>
                <Input
                    accessibilityLabel="Tên người nhận mô phỏng"
                    testID="co-sign-recipient"
                    placeholder="Ví dụ Cửa hàng demo"
                    className="h-auto min-h-12"
                    maxLength={80}
                    value={recipient}
                    onChangeText={setRecipient}
                    editable={!pending && !unconfirmed}
                />
                {amountText.length > 0 && amount === null && (
                    <Text accessibilityLiveRegion="polite">
                        Nhập số nguyên từ 1 đến 2.147.483.647 đồng.
                    </Text>
                )}
                {Boolean(error) && <FamilyIssue error={error} />}
                {unconfirmed && (
                    <Text accessibilityLiveRegion="polite">
                        Chưa nhận được xác nhận. Thử lại sẽ dùng đúng giao dịch
                        vừa gửi.
                    </Text>
                )}
                <Button
                    className="h-auto min-h-12"
                    testID="co-sign-create"
                    disabled={pending || amount === null || !recipient.trim()}
                    onPress={() => void submit()}
                >
                    <Text>
                        {pending
                            ? 'Đang gửi...'
                            : unconfirmed
                              ? 'Thử lại giao dịch này'
                              : 'Kiểm tra giao dịch'}
                    </Text>
                </Button>
            </CardContent>
        </Card>
    );
}
