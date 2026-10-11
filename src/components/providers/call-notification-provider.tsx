"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useParams, useRouter, useSearchParams } from "next/navigation";
import { PhoneOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSocket } from "@/components/providers/socket-provider";
import { useCurrentProfile } from "@/hooks/use-current-profile";
import { useCallStore } from "@/hooks/use-call-store";
import { useActiveRooms } from "@/hooks/use-active-rooms";
import { useUnreadStore } from "@/hooks/use-unread-store";
import { IncomingCallModal } from "@/components/modals/incoming-call-modal";

export const CallNotificationProvider = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();

  const { socket, isConnected } = useSocket();
  const { profile, fetchProfile } = useCurrentProfile();
  const { setIncomingCall, clearIncomingCall, incomingCall } = useCallStore();
  const { setRoomActive, setActiveRoomsList, fetchActiveRooms } = useActiveRooms();
  const { incrementUnread, markAsRead, syncServerUnread } = useUnreadStore();
  const lastSyncedServerRef = useRef<string | null>(null);

  // Floating banner for call declined / call ended
  const [callToast, setCallToast] = useState<{
    type: "declined" | "ended";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!callToast) return;
    const timer = setTimeout(() => {
      setCallToast(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [callToast]);

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

    const channelMatch = pathname.match(/\/channels\/([a-zA-Z0-9_-]+)/);
    if (channelMatch && channelMatch[1]) {
      markAsRead(channelMatch[1]);
    }

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

    // When someone ends the call
    const onCallEnded = (data: any) => {
      if (incomingCall && data?.conversationId === incomingCall.conversationId) {
        clearIncomingCall();
      }

      // If current user is in video call room, transport back to chatting page
      if (searchParams?.get("video")) {
        setCallToast({
          type: "ended",
          message: "Call ended - returned to chat",
        });
        router.push(pathname || "");
      }
    };

    // When the recipient declines the call
    const onCallDeclined = (data: any) => {
      if (incomingCall && data?.conversationId === incomingCall.conversationId) {
        clearIncomingCall();
      }

      // If caller is waiting in video call room, transport back to chatting page
      if (searchParams?.get("video")) {
        setCallToast({
          type: "declined",
          message: "Call has been declined",
        });
        router.push(pathname || "");
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
      if (profile && message.member?.profileId !== profile.id) {
        if (!pathname?.includes(`/channels/${channelId}`)) {
          incrementUnread(channelId);
        }
      }
    };

    const onDirectMessageNew = ({ recipientProfileId, senderMemberId, message }: any) => {
      if (!recipientProfileId || !senderMemberId || !message) return;
      if (profile && recipientProfileId === profile.id) {
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
    searchParams,
    router,
    incomingCall,
    setIncomingCall,
    clearIncomingCall,
    setRoomActive,
    setActiveRoomsList,
    incrementUnread,
  ]);

  return (
    <>
      <IncomingCallModal />

      {/* Floating alert banner for call declined / call ended */}
      {callToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-none">
          <div
            className={cn(
              "px-5 py-3 rounded-full shadow-2xl flex items-center gap-x-3 text-sm font-semibold border backdrop-blur-md",
              callToast.type === "declined"
                ? "bg-rose-600/95 text-white border-rose-400/60 shadow-rose-950/50"
                : "bg-zinc-800/95 text-zinc-100 border-zinc-600/80 shadow-black/60"
            )}
          >
            <div
              className={cn(
                "p-1.5 rounded-full",
                callToast.type === "declined" ? "bg-rose-700/80" : "bg-zinc-700/80"
              )}
            >
              <PhoneOff className="w-4 h-4 text-white" />
            </div>
            <span>{callToast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};
