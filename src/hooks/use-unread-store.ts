import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UnreadStore {
  unreadCounts: Record<string, number>;
  lastReadTimestamps: Record<string, number>;
  markAsRead: (id: string) => void;
  incrementUnread: (id: string) => void;
  setUnread: (id: string, count: number) => void;
  syncServerUnread: (data: {
    channels: Record<string, { latestMessageId: string; latestMessageAt: string; isFromSelf: boolean }>;
    directMessages: Record<string, { conversationId: string; latestMessageId: string; latestMessageAt: string; isFromSelf: boolean }>;
  }) => void;
}

export const useUnreadStore = create<UnreadStore>()(
  persist(
    (set, get) => ({
      unreadCounts: {},
      lastReadTimestamps: {},
      markAsRead: (id: string) => {
        if (!id) return;
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [id]: 0,
          },
          lastReadTimestamps: {
            ...state.lastReadTimestamps,
            [id]: Date.now(),
          },
        }));
      },
      incrementUnread: (id: string) => {
        if (!id) return;
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [id]: (state.unreadCounts[id] || 0) + 1,
          },
        }));
      },
      setUnread: (id: string, count: number) => {
        if (!id) return;
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [id]: count,
          },
        }));
      },
      syncServerUnread: ({ channels, directMessages }) => {
        const { lastReadTimestamps, unreadCounts } = get();
        const updatedCounts: Record<string, number> = { ...unreadCounts };

        // Process server channels
        if (channels) {
          for (const [channelId, info] of Object.entries(channels)) {
            if (!info || info.isFromSelf) continue;
            const messageTime = new Date(info.latestMessageAt).getTime();
            const lastRead = lastReadTimestamps[channelId] || 0;
            if (messageTime > lastRead) {
              if (!updatedCounts[channelId] || updatedCounts[channelId] === 0) {
                updatedCounts[channelId] = 1;
              }
            }
          }
        }

        // Process direct messages (keyed by otherMemberId)
        if (directMessages) {
          for (const [memberId, info] of Object.entries(directMessages)) {
            if (!info || info.isFromSelf) continue;
            const messageTime = new Date(info.latestMessageAt).getTime();
            const lastRead = lastReadTimestamps[memberId] || 0;
            if (messageTime > lastRead) {
              if (!updatedCounts[memberId] || updatedCounts[memberId] === 0) {
                updatedCounts[memberId] = 1;
              }
            }
          }
        }

        set({ unreadCounts: updatedCounts });
      },
    }),
    {
      name: "discord-unread-storage",
    }
  )
);
