"use client";

import { useEffect, useRef } from "react";
import { usePathname, useParams } from "next/navigation";

import { useSocket } from "@/components/providers/socket-provider";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useCallStore } from "@/hooks/use-call-store";
import { useActiveRooms } from "@/hooks/use-active-rooms";
import { useUnreadStore } from "@/hooks/use-unread-store";
import { IncomingCallModal } from "@/components/modals/incoming-call-modal";

export const CallNotificationProvider = () => {
  const pathname = usePathname();
  const params = useParams();
  const { socket, isConnected } = useSocket();
  const { profile, fetchProfile } = useCurrentProfile();
  const { setIncomingCall, clearIncomingCall, incomingCall } = useCallStore();
  const { setRoomActive, setActiveRoomsList, fetchActiveRooms } = useActiveRooms();
  const { incrementUnread, markAsRead, syncServerUnread } = useUnreadStore();
  const lastSyncedServerRef = useRef<string | null>(null);

  // 1. Fetch current profile on mount
  useEffect(() => {
    fetchProfile();
    fetchActiveRooms();
  }, [fetchProfile, fetchActiveRooms]);

  // 2. Register user to their personal socket room
  useEffect(() => {
    if (!socket || !isConnected || !profile?.id) return;

    socket.emit("user:join", profile.id);
    socket.emit("room:get-active");
  }, [socket, isConnected, profile?.id]);

  // 3. Mark current channel or conversation as read based on pathname
  useEffect(() => {
    if (!pathname) return;

    // Check if on a channel page
    const channelMatch = pathname.match(/\/channels\/([a-zA-Z0-9_-]+)/);
    if (channelMatch && channelMatch[1]) {
      markAsRead(channelMatch[1]);
    }

    // Check if on a conversation page
    const convMatch = pathname.match(/\/conversations\/([a-zA-Z0-9_-]+)/);
    if (convMatch && convMatch[1]) {
      markAsRead(convMatch[1]);
    }
  }, [pathname, markAsRead]);

  // 4. Initial and periodic sync of unread messages for current server
  const serverId = (params?.serverId as string) || null;
  useEffect(() => {
    if (!serverId) return;

    const syncUnreads = async () => {
      try {
        const res = await fetch(`/api/unread?serverId=${serverId}`);
        if (res.ok) {
          const data = await res.json();
          syncServerUnread(data);
        }
      } catch (e) {
        console.error("Failed to sync unread counts:", e);
      }
    };

    if (lastSyncedServerRef.current !== serverId) {
      lastSyncedServerRef.current = serverId;
      syncUnreads();
    }

    // Poll active rooms and unreads every 45s as a healthy fallback
    const interval = setInterval(() => {
      syncUnreads();
      fetchActiveRooms();
    }, 45000);

    return () => clearInterval(interval);
  }, [serverId, syncServerUnread, fetchActiveRooms]);

  // 5. Global socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Incoming call handler
    const onIncomingCall = (data: any) => {
      if (!data) return;
      if (profile && data.recipientProfileId === profile.id) {
        setIncomingCall(data);
      }
    };

    // Call ended / declined handlers
    const onCallEnded = (data: any) => {
      if (incomingCall && data?.conversationId === incomingCall.conversationId) {
        clearIncomingCall();
      }
    };

    const onCallDeclined = (data: any) => {
      if (incomingCall && data?.conversationId === incomingCall.conversationId) {
        clearIncomingCall();
      }
    };

    // Voice/Video presence status
    const onRoomStatus = ({ roomId, active }: { roomId: string; active: boolean }) => {
      if (roomId) {
        setRoomActive(roomId, active);
      }
    };

    const onActiveList = (rooms: string[]) => {
      if (Array.isArray(rooms)) {
        setActiveRoomsList(rooms);
      }
    };

    // Real-time unread messages
    const onChannelMessageNew = ({ channelId, message }: any) => {
      if (!channelId || !message) return;
      // If message is from someone else
      if (profile && message.member?.profileId !== profile.id) {
        // If current pathname is not viewing this channel
        if (!pathname?.includes(`/channels/${channelId}`)) {
          incrementUnread(channelId);
        }
      }
    };

    const onDirectMessageNew = ({ recipientProfileId, senderMemberId, message }: any) => {
      if (!recipientProfileId || !senderMemberId || !message) return;
      // If we are the recipient
      if (profile && recipientProfileId === profile.id) {
        // If current pathname is not viewing conversation with this member
        if (!pathname?.includes(`/conversations/${senderMemberId}`)) {
          incrementUnread(senderMemberId);
        }
      }
    };

    socket.on("call:incoming", onIncomingCall);
    if (profile?.id) {
      socket.on(`call:incoming:${profile.id}`, onIncomingCall);
    }
    socket.on("call:ended", onCallEnded);
    socket.on("call:declined", onCallDeclined);
    socket.on("room:status", onRoomStatus);
    socket.on("room:active-list", onActiveList);
    socket.on("channel-message:new", onChannelMessageNew);
    socket.on("direct-message:new", onDirectMessageNew);

    return () => {
      socket.off("call:incoming", onIncomingCall);
      if (profile?.id) {
        socket.off(`call:incoming:${profile.id}`, onIncomingCall);
      }
      socket.off("call:ended", onCallEnded);
      socket.off("call:declined", onCallDeclined);
      socket.off("room:status", onRoomStatus);
      socket.off("room:active-list", onActiveList);
      socket.off("channel-message:new", onChannelMessageNew);
      socket.off("direct-message:new", onDirectMessageNew);
    };
  }, [
    socket,
    isConnected,
    profile,
    pathname,
    incomingCall,
    setIncomingCall,
    clearIncomingCall,
    setRoomActive,
    setActiveRoomsList,
    incrementUnread,
  ]);

  return <IncomingCallModal />;
};
