import { create } from "zustand";

interface ActiveRoomsStore {
  activeRooms: Record<string, boolean>;
  setRoomActive: (roomId: string, active: boolean) => void;
  setActiveRoomsList: (roomIds: string[]) => void;
  fetchActiveRooms: () => Promise<void>;
}

export const useActiveRooms = create<ActiveRoomsStore>((set) => ({
  activeRooms: {},
  setRoomActive: (roomId: string, active: boolean) =>
    set((state) => ({
      activeRooms: {
        ...state.activeRooms,
        [roomId]: active,
      },
    })),
  setActiveRoomsList: (roomIds: string[]) => {
    const map: Record<string, boolean> = {};
    for (const id of roomIds) {
      map[id] = true;
    }
    set({ activeRooms: map });
  },
  fetchActiveRooms: async () => {
    try {
      const res = await fetch("/api/channels/active");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activeRooms)) {
          const map: Record<string, boolean> = {};
          for (const id of data.activeRooms) {
            map[id] = true;
          }
          set({ activeRooms: map });
        }
      }
    } catch (e) {
      console.error("Failed to fetch active rooms:", e);
    }
  },
}));
