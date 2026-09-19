import { create } from 'zustand';

interface ReminderPermissionBannerState {
  dismissed: boolean;
  dismiss: () => void;
}

export const useReminderPermissionBannerStore = create<ReminderPermissionBannerState>((set) => ({
  dismissed: false,
  dismiss: () => set({ dismissed: true }),
}));
