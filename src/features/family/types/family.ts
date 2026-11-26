// Hợp đồng HTTP cho danh sách gia đình, vai trò và mã mời.
export type FamilyRole = 'PARENT' | 'GUARDIAN';

export type FamilySummary = {
    id: string;
    name: string;
    viewerRole: FamilyRole;
};

export type FamilyMember = {
    id: string;
    userId: string;
    displayName: string;
    role: FamilyRole;
    joinedAt: string;
};

export type FamilyDetails = FamilySummary & {
    thresholdVnd: number;
    members: FamilyMember[];
};

export type FamilyInvitation = {
    id: string;
    familyId: string;
    code: string;
    expiresAt: string;
};

export type FamilyFormAction = { kind: 'create' | 'accept'; value: string };
export type ManageFamilyAction =
    | { kind: 'invite' }
    | { kind: 'threshold'; thresholdVnd: number }
    | { kind: 'remove'; membershipId: string };
