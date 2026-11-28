// Hook quản lý thông tin phụ hồ sơ người dùng trên Mobile (đồng bộ KinShield-Core + cache offline trên máy).
import { useCallback, useEffect, useRef, useState } from 'react';
import { mobileProfileExtrasApi } from '@/features/profile/api/profile-extras-api';
import {
    loadMobileProfileExtras,
    saveMobileProfileExtras,
} from '@/features/profile/storage/profile-storage';
import {
    appendActivityLog,
    buildEmergencyContact,
    buildTrustedAccount,
    createDefaultUserProfileExtras,
    formatVnd,
} from '@/features/profile/utils/profile-extras';
import type {
    AvatarFrameTone,
    AvatarPresetId,
    FamilyRole,
    SafetyPreferences,
    UserProfileExtras,
} from '@/features/profile/types/profile-extras';

type ProfileSyncStatus = 'syncing' | 'synced' | 'offline';

export function useMobileProfileExtras(userId: string, displayName: string) {
    const [extras, setExtras] = useState<UserProfileExtras>(() =>
        createDefaultUserProfileExtras(displayName),
    );
    const [syncStatus, setSyncStatus] = useState<ProfileSyncStatus>('syncing');

    const extrasRef = useRef<UserProfileExtras>(extras);
    const hasLocalMutationRef = useRef(false);
    const syncSeqRef = useRef(0);

    // Tải cache trên máy ngay lập tức, sau đó đồng bộ hồ sơ từ KinShield-Core.
    useEffect(() => {
        let cancelled = false;
        hasLocalMutationRef.current = false;

        void loadMobileProfileExtras(userId, displayName).then((loaded) => {
            if (cancelled || hasLocalMutationRef.current) return;
            extrasRef.current = loaded;
            setExtras(loaded);
        });

        void mobileProfileExtrasApi
            .getExtras(displayName)
            .then((serverExtras) => {
                if (cancelled || hasLocalMutationRef.current) return;
                extrasRef.current = serverExtras;
                setExtras(serverExtras);
                void saveMobileProfileExtras(userId, serverExtras);
                setSyncStatus('synced');
            })
            .catch(() => {
                if (cancelled || hasLocalMutationRef.current) return;
                setSyncStatus('offline');
            });

        return () => {
            cancelled = true;
        };
    }, [displayName, userId]);

    const syncToBackend = useCallback(
        (next: UserProfileExtras) => {
            const seq = ++syncSeqRef.current;
            setSyncStatus('syncing');

            void mobileProfileExtrasApi
                .updateExtras(next, displayName)
                .then((saved) => {
                    if (syncSeqRef.current !== seq) return;
                    // Giữ lại ảnh file:// cục bộ nếu thiết bị không trả base64.
                    const merged =
                        !saved.avatarCustomUri &&
                        next.avatarCustomUri?.startsWith('file://')
                            ? { ...saved, avatarCustomUri: next.avatarCustomUri }
                            : saved;
                    extrasRef.current = merged;
                    setExtras(merged);
                    void saveMobileProfileExtras(userId, merged);
                    setSyncStatus('synced');
                })
                .catch(() => {
                    if (syncSeqRef.current !== seq) return;
                    setSyncStatus('offline');
                });
        },
        [displayName, userId],
    );

    const commit = useCallback(
        (updater: (prev: UserProfileExtras) => UserProfileExtras) => {
            hasLocalMutationRef.current = true;
            const next = updater(extrasRef.current);
            extrasRef.current = next;
            setExtras(next);
            void saveMobileProfileExtras(userId, next);
            syncToBackend(next);
        },
        [syncToBackend, userId],
    );

    const setCustomAvatarUri = useCallback(
        (uri: string) => {
            commit((prev) => ({
                ...prev,
                avatarCustomUri: uri,
                avatarPresetId: null,
                activityLog: appendActivityLog(
                    prev.activityLog,
                    'Cập nhật ảnh đại diện cá nhân',
                ),
            }));
        },
        [commit],
    );

    const selectAvatarPreset = useCallback(
        (presetId: AvatarPresetId) => {
            commit((prev) => ({
                ...prev,
                avatarCustomUri: null,
                avatarPresetId: presetId,
                activityLog: appendActivityLog(
                    prev.activityLog,
                    'Đổi biểu tượng đại diện gia đình',
                ),
            }));
        },
        [commit],
    );

    const clearAvatar = useCallback(() => {
        commit((prev) => ({
            ...prev,
            avatarCustomUri: null,
            avatarPresetId: null,
            activityLog: appendActivityLog(
                prev.activityLog,
                'Chuyển đại diện về chữ cái đầu',
            ),
        }));
    }, [commit]);

    const setAvatarFrame = useCallback(
        (frame: AvatarFrameTone) => {
            commit((prev) => ({ ...prev, avatarFrame: frame }));
        },
        [commit],
    );

    const updateIdentity = useCallback(
        (input: {
            nickname: string;
            familyRole: FamilyRole;
            phone: string;
            safetyNote: string;
        }) => {
            commit((prev) => ({
                ...prev,
                nickname: input.nickname.trim() || displayName,
                familyRole: input.familyRole,
                phone: input.phone.trim(),
                safetyNote: input.safetyNote.trim(),
                activityLog: appendActivityLog(
                    prev.activityLog,
                    'Cập nhật thông tin hồ sơ gia đình',
                ),
            }));
        },
        [commit, displayName],
    );

    const updatePreferences = useCallback(
        (patch: Partial<SafetyPreferences>) => {
            commit((prev) => {
                const nextPrefs = { ...prev.preferences, ...patch };
                let logMsg = 'Cập nhật tùy chọn bảo vệ';
                if (typeof patch.largeTextMode === 'boolean') {
                    logMsg = patch.largeTextMode
                        ? 'Bật chế độ Chữ lớn cho ông bà'
                        : 'Chuyển về cỡ chữ tiêu chuẩn';
                } else if (typeof patch.coSignThresholdVnd === 'number') {
                    logMsg = `Đặt ngưỡng hỏi ý con: ${formatVnd(patch.coSignThresholdVnd)}`;
                }
                return {
                    ...prev,
                    preferences: nextPrefs,
                    activityLog: appendActivityLog(prev.activityLog, logMsg),
                };
            });
        },
        [commit],
    );

    const addEmergencyContact = useCallback(
        (input: { name: string; relation: string; phone: string }) => {
            const contact = buildEmergencyContact(input);
            commit((prev) => ({
                ...prev,
                emergencyContacts: [contact, ...prev.emergencyContacts],
                activityLog: appendActivityLog(
                    prev.activityLog,
                    `Thêm số khẩn cấp: ${contact.name} (${contact.relation})`,
                ),
            }));
        },
        [commit],
    );

    const removeEmergencyContact = useCallback(
        (contactId: string) => {
            commit((prev) => ({
                ...prev,
                emergencyContacts: prev.emergencyContacts.filter(
                    (c) => c.id !== contactId,
                ),
                activityLog: appendActivityLog(
                    prev.activityLog,
                    'Xóa một liên hệ khẩn cấp',
                ),
            }));
        },
        [commit],
    );

    const addTrustedAccount = useCallback(
        (input: {
            ownerName: string;
            bankName: string;
            accountNumber: string;
            note: string;
        }) => {
            const account = buildTrustedAccount(input);
            commit((prev) => ({
                ...prev,
                trustedAccounts: [account, ...prev.trustedAccounts],
                activityLog: appendActivityLog(
                    prev.activityLog,
                    `Lưu STK tin cậy: ${account.ownerName} (${account.bankName})`,
                ),
            }));
        },
        [commit],
    );

    const removeTrustedAccount = useCallback(
        (accountId: string) => {
            commit((prev) => ({
                ...prev,
                trustedAccounts: prev.trustedAccounts.filter(
                    (a) => a.id !== accountId,
                ),
                activityLog: appendActivityLog(
                    prev.activityLog,
                    'Xóa một tài khoản tin cậy',
                ),
            }));
        },
        [commit],
    );

    const toggleGoldenRule = useCallback(
        (ruleId: string) => {
            commit((prev) => {
                const exists = prev.acknowledgedRuleIds.includes(ruleId);
                const acknowledgedRuleIds = exists
                    ? prev.acknowledgedRuleIds.filter((id) => id !== ruleId)
                    : [...prev.acknowledgedRuleIds, ruleId];
                return {
                    ...prev,
                    acknowledgedRuleIds,
                    activityLog: exists
                        ? prev.activityLog
                        : appendActivityLog(
                              prev.activityLog,
                              'Đánh dấu đã nhớ một nguyên tắc chống lừa đảo',
                          ),
                };
            });
        },
        [commit],
    );

    const resetExtras = useCallback(() => {
        hasLocalMutationRef.current = true;
        const next = {
            ...createDefaultUserProfileExtras(displayName),
            activityLog: appendActivityLog(
                [],
                'Khôi phục thiết lập hồ sơ mặc định',
            ),
        };
        extrasRef.current = next;
        setExtras(next);
        void saveMobileProfileExtras(userId, next);

        const seq = ++syncSeqRef.current;
        setSyncStatus('syncing');
        void mobileProfileExtrasApi
            .resetExtras(displayName)
            .then((serverDefault) => {
                if (syncSeqRef.current !== seq) return;
                extrasRef.current = serverDefault;
                setExtras(serverDefault);
                void saveMobileProfileExtras(userId, serverDefault);
                setSyncStatus('synced');
            })
            .catch(() => {
                if (syncSeqRef.current !== seq) return;
                setSyncStatus('offline');
            });
    }, [displayName, userId]);

    return {
        extras,
        syncStatus,
        setCustomAvatarUri,
        selectAvatarPreset,
        clearAvatar,
        setAvatarFrame,
        updateIdentity,
        updatePreferences,
        addEmergencyContact,
        removeEmergencyContact,
        addTrustedAccount,
        removeTrustedAccount,
        toggleGoldenRule,
        resetExtras,
    };
}
