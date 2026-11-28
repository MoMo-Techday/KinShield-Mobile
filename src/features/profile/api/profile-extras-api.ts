// Client đồng bộ hồ sơ phụ & ảnh đại diện với KinShield-Core (/api/profile/extras).
import { apiClient } from '@/lib/api/client';
import {
    fromProfileExtrasResponse,
    toUpdateProfileExtrasPayload,
    type ProfileExtrasApiResponse,
} from '@/features/profile/api/profile-extras-mapper';
import type { UserProfileExtras } from '@/features/profile/types/profile-extras';

export const mobileProfileExtrasApi = {
    async getExtras(displayName: string): Promise<UserProfileExtras> {
        const { data } =
            await apiClient.get<ProfileExtrasApiResponse>('/profile/extras');
        return fromProfileExtrasResponse(data, displayName);
    },

    async updateExtras(
        extras: UserProfileExtras,
        displayName: string,
    ): Promise<UserProfileExtras> {
        const payload = toUpdateProfileExtrasPayload(extras);
        const { data } = await apiClient.put<ProfileExtrasApiResponse>(
            '/profile/extras',
            payload,
        );
        return fromProfileExtrasResponse(data, displayName);
    },

    async resetExtras(displayName: string): Promise<UserProfileExtras> {
        const { data } =
            await apiClient.delete<ProfileExtrasApiResponse>('/profile/extras');
        return fromProfileExtrasResponse(data, displayName);
    },
};
