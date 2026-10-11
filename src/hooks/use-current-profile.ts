import { create } from "zustand";
import { Profile } from "@prisma/client";

interface CurrentProfileStore {
  profile: Profile | null;
  isLoading: boolean;
  setProfile: (profile: Profile | null) => void;
  fetchProfile: () => Promise<Profile | null>;
}

export const useCurrentProfile = create<CurrentProfileStore>((set, get) => ({
  profile: null,
  isLoading: false,
  setProfile: (profile) => set({ profile }),
  fetchProfile: async () => {
    const existing = get().profile;
    if (existing) return existing;

    set({ isLoading: true });
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        set({ profile: data, isLoading: false });
        return data;
      }
    } catch (e) {
      console.error("Error fetching current profile:", e);
    }
    set({ isLoading: false });
    return null;
  },
}));
