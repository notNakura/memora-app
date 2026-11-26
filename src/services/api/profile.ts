// Profile routes of memora-api: preferences of Perfil (21) and Ajustes y cuenta (23), and
// leaving a section (RF-35). Both answer the refreshed { user }. Personal data reuses PUT /me/profile.
import { request, type Preferences, type User } from './client';

export type PreferencesPatch = Partial<Preferences>;

export const profileApi = {
  updatePreferences: (accessToken: string, patch: PreferencesPatch) =>
    request<{ user: User }>('/me/preferences', { method: 'PATCH', body: patch, token: accessToken }),
  leaveSection: (accessToken: string, sectionId: number) =>
    request<{ user: User }>(`/sections/${sectionId}/leave`, { method: 'POST', token: accessToken }),
};

export type ProfileApi = typeof profileApi;
