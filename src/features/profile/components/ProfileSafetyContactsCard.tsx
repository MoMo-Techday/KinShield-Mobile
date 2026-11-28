// Danh bạ khẩn cấp 1 chạm gọi điện + Đường dây nóng VN + Sổ tài khoản tin cậy.
import { useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import {
    OFFICIAL_VN_HOTLINES,
    validateEmergencyContact,
    validateTrustedAccount,
} from '@/features/profile/utils/profile-extras';
import type {
    EmergencyContact,
    TrustedAccount,
} from '@/features/profile/types/profile-extras';
import { toast } from '@/lib/toast';

interface ProfileSafetyContactsCardProps {
    largeText: boolean;
    emergencyContacts: EmergencyContact[];
    trustedAccounts: TrustedAccount[];
    onAddEmergencyContact: (input: {
        name: string;
        relation: string;
        phone: string;
    }) => void;
    onRemoveEmergencyContact: (id: string) => void;
    onAddTrustedAccount: (input: {
        ownerName: string;
        bankName: string;
        accountNumber: string;
        note: string;
    }) => void;
    onRemoveTrustedAccount: (id: string) => void;
}

export function ProfileSafetyContactsCard({
    largeText,
    emergencyContacts,
    trustedAccounts,
    onAddEmergencyContact,
    onRemoveEmergencyContact,
    onAddTrustedAccount,
    onRemoveTrustedAccount,
}: ProfileSafetyContactsCardProps) {
    const [contactName, setContactName] = useState('');
    const [contactRelation, setContactRelation] = useState('Con trai');
    const [contactPhone, setContactPhone] = useState('');

    const [ownerName, setOwnerName] = useState('');
    const [bankName, setBankName] = useState('Vietcombank');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountNote, setAccountNote] = useState('');

    const bodyClass = largeText ? 'text-base' : 'text-sm';

    const handleDial = async (phone: string) => {
        try {
            await Linking.openURL(`tel:${phone}`);
        } catch {
            toast.error('Thiết bị này không hỗ trợ gọi điện trực tiếp.');
        }
    };

    const handleShareAccount = async (account: TrustedAccount) => {
        try {
            await Share.share({
                message: `Tài khoản tin cậy KinShield: ${account.ownerName} • ${account.bankName} • STK ${account.accountNumber}`,
            });
        } catch {
            // Người dùng hủy chia sẻ
        }
    };

    const handleAddContact = () => {
        const error = validateEmergencyContact({
            name: contactName,
            relation: contactRelation,
            phone: contactPhone,
        });
        if (error) {
            toast.error(error);
            return;
        }
        onAddEmergencyContact({
            name: contactName,
            relation: contactRelation,
            phone: contactPhone,
        });
        setContactName('');
        setContactPhone('');
        toast.success('Đã thêm người thân vào danh bạ khẩn cấp!');
    };

    const handleAddAccount = () => {
        const error = validateTrustedAccount({
            ownerName,
            bankName,
            accountNumber,
        });
        if (error) {
            toast.error(error);
            return;
        }
        onAddTrustedAccount({
            ownerName,
            bankName,
            accountNumber,
            note: accountNote,
        });
        setOwnerName('');
        setAccountNumber('');
        setAccountNote('');
        toast.success('Đã lưu tài khoản ngân hàng tin cậy!');
    };

    return (
        <View className="gap-5">
            <Card className="gap-0 rounded-[28px] border-border bg-card py-0">
                <CardHeader className="gap-1.5 px-6 pt-6">
                    <CardTitle className="text-xl font-bold text-foreground">
                        Danh bạ khẩn cấp gia đình
                    </CardTitle>
                    <CardDescription className={bodyClass}>
                        Chạm 1 nút để gọi thẳng số thật của con cái khi gặp cuộc
                        gọi nghi ngờ lừa đảo.
                    </CardDescription>
                </CardHeader>
                <CardContent className="gap-4 px-6 pb-6 pt-4">
                    <View className="gap-2.5 rounded-2xl border border-border bg-secondary/40 p-3.5">
                        <Input
                            value={contactName}
                            onChangeText={setContactName}
                            placeholder="Tên người thân (VD: Minh)"
                            className="h-11 rounded-xl bg-card"
                        />
                        <View className="flex-row gap-2">
                            <Input
                                value={contactRelation}
                                onChangeText={setContactRelation}
                                placeholder="Quan hệ"
                                className="h-11 flex-1 rounded-xl bg-card"
                            />
                            <Input
                                value={contactPhone}
                                onChangeText={setContactPhone}
                                keyboardType="phone-pad"
                                placeholder="Số điện thoại"
                                className="h-11 flex-1 rounded-xl bg-card"
                            />
                        </View>
                        <Button
                            onPress={handleAddContact}
                            className="h-11 w-full rounded-xl"
                        >
                            <Text className="font-bold text-primary-foreground">
                                + Thêm số người thân
                            </Text>
                        </Button>
                    </View>

                    {emergencyContacts.length === 0 ? (
                        <Text className={`text-muted-foreground ${bodyClass}`}>
                            Chưa có số người thân nào. Thêm ngay để cộng +20
                            điểm an toàn!
                        </Text>
                    ) : (
                        <View className="gap-2.5">
                            {emergencyContacts.map((contact) => (
                                <View
                                    key={contact.id}
                                    className="flex-row items-center justify-between gap-2 rounded-2xl border border-border bg-background/70 p-3.5"
                                >
                                    <View className="flex-1">
                                        <Text
                                            className={`font-bold text-foreground ${bodyClass}`}
                                        >
                                            {contact.name} ({contact.relation})
                                        </Text>
                                        <Text className="text-xs font-semibold text-muted-foreground">
                                            {contact.phone}
                                        </Text>
                                    </View>
                                    <View className="flex-row gap-2">
                                        <Button
                                            size="sm"
                                            className="rounded-full px-3.5"
                                            onPress={() =>
                                                void handleDial(contact.phone)
                                            }
                                        >
                                            <Text className="text-xs font-bold text-primary-foreground">
                                                Gọi ngay
                                            </Text>
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onPress={() =>
                                                onRemoveEmergencyContact(
                                                    contact.id,
                                                )
                                            }
                                        >
                                            <Text className="text-xs font-bold text-destructive">
                                                Xóa
                                            </Text>
                                        </Button>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    <View className="gap-2 border-t border-border pt-4">
                        <Text className="text-xs font-extrabold uppercase tracking-wider text-primary">
                            Đường dây nóng chính thức Việt Nam
                        </Text>
                        {OFFICIAL_VN_HOTLINES.map((hotline) => (
                            <View
                                key={hotline.id}
                                className="flex-row items-center justify-between gap-2 rounded-2xl border border-border bg-secondary/35 px-3.5 py-2.5"
                            >
                                <View className="flex-1">
                                    <Text className="text-xs font-extrabold text-foreground">
                                        {hotline.name}
                                    </Text>
                                    <Text className="text-[11px] text-muted-foreground">
                                        {hotline.phone} • {hotline.note}
                                    </Text>
                                </View>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full px-3"
                                    onPress={() =>
                                        void handleDial(hotline.phone)
                                    }
                                >
                                    <Text className="text-xs font-bold text-primary">
                                        Gọi
                                    </Text>
                                </Button>
                            </View>
                        ))}
                    </View>
                </CardContent>
            </Card>

            <Card className="gap-0 rounded-[28px] border-border bg-card py-0">
                <CardHeader className="gap-1.5 px-6 pt-6">
                    <CardTitle className="text-xl font-bold text-foreground">
                        Sổ tài khoản ngân hàng tin cậy
                    </CardTitle>
                    <CardDescription className={bodyClass}>
                        Lưu sẵn STK người nhà để đối chiếu nhanh khi soi mã
                        VietQR.
                    </CardDescription>
                </CardHeader>
                <CardContent className="gap-4 px-6 pb-6 pt-4">
                    <View className="gap-2.5 rounded-2xl border border-border bg-secondary/40 p-3.5">
                        <Input
                            value={ownerName}
                            onChangeText={setOwnerName}
                            placeholder="Chủ tài khoản (VD: Nguyễn Văn Minh)"
                            className="h-11 rounded-xl bg-card"
                        />
                        <View className="flex-row gap-2">
                            <Input
                                value={bankName}
                                onChangeText={setBankName}
                                placeholder="Ngân hàng / Ví"
                                className="h-11 flex-1 rounded-xl bg-card"
                            />
                            <Input
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                keyboardType="number-pad"
                                placeholder="Số tài khoản"
                                className="h-11 flex-1 rounded-xl bg-card"
                            />
                        </View>
                        <Input
                            value={accountNote}
                            onChangeText={setAccountNote}
                            placeholder="Ghi chú (tùy chọn)"
                            className="h-11 rounded-xl bg-card"
                        />
                        <Button
                            onPress={handleAddAccount}
                            className="h-11 w-full rounded-xl"
                        >
                            <Text className="font-bold text-primary-foreground">
                                + Lưu tài khoản tin cậy
                            </Text>
                        </Button>
                    </View>

                    {trustedAccounts.length === 0 ? (
                        <Text className={`text-muted-foreground ${bodyClass}`}>
                            Chưa lưu tài khoản tin cậy nào (+15 điểm an toàn).
                        </Text>
                    ) : (
                        <View className="gap-2.5">
                            {trustedAccounts.map((acc) => (
                                <View
                                    key={acc.id}
                                    className="gap-2 rounded-2xl border border-border bg-background/70 p-3.5"
                                >
                                    <View className="flex-row items-start justify-between gap-2">
                                        <View className="flex-1">
                                            <Text
                                                className={`font-bold text-foreground ${bodyClass}`}
                                            >
                                                {acc.ownerName}
                                            </Text>
                                            <Text className="text-xs font-bold text-primary">
                                                {acc.bankName} •{' '}
                                                {acc.accountNumber}
                                            </Text>
                                            {acc.note.length > 0 && (
                                                <Text className="text-xs text-muted-foreground">
                                                    {acc.note}
                                                </Text>
                                            )}
                                        </View>
                                        <View className="flex-row gap-1.5">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onPress={() =>
                                                    void handleShareAccount(acc)
                                                }
                                            >
                                                <Text className="text-xs font-bold text-foreground">
                                                    Gửi
                                                </Text>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onPress={() =>
                                                    onRemoveTrustedAccount(
                                                        acc.id,
                                                    )
                                                }
                                            >
                                                <Text className="text-xs font-bold text-destructive">
                                                    Xóa
                                                </Text>
                                            </Button>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </CardContent>
            </Card>
        </View>
    );
}
