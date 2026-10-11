"use client";

import qs from "query-string";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Video, VideoOff } from "lucide-react";
import axios from "axios";

import { ActionTooltip } from "@/components/action-tooltip";
import { useSocket } from "@/components/providers/socket-provider";

interface ChatVideoButtonProps {
  conversationId?: string;
  currentMember?: any;
  otherMember?: any;
  serverId?: string;
}

export const ChatVideoButton = ({
  conversationId,
  currentMember,
  otherMember,
  serverId,
}: ChatVideoButtonProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { socket } = useSocket();

  const isVideo = searchParams?.get("video");

  const onClick = async () => {
    const isStarting = !isVideo;

    // 1. Post a notification message into direct messages so both online and offline users see it
    if (conversationId) {
      try {
        const messageText = isStarting ? "📞 Started a video call" : "📞 Video call ended";
        await axios.post(`/api/socket/direct-messages?conversationId=${conversationId}`, {
          content: messageText,
        });
      } catch (err) {
        console.error("Failed to post call log message:", err);
      }
    }

    // 2. Real-time socket signaling for incoming call or call ended
    if (socket && conversationId) {
      if (isStarting) {
        socket.emit("call:initiate", {
          conversationId,
          serverId,
          callerMemberId: currentMember?.id,
          callerProfile: {
            id: currentMember?.profile?.id,
            name: currentMember?.profile?.name,
            imageUrl: currentMember?.profile?.imageUrl,
          },
          recipientProfileId: otherMember?.profileId || otherMember?.profile?.id,
          recipientMemberId: otherMember?.id,
        });
      } else {
        socket.emit("call:ended", {
          conversationId,
          recipientProfileId: otherMember?.profileId || otherMember?.profile?.id,
        });
      }
    }

    // 3. Toggle URL query param
    const url = qs.stringifyUrl(
      {
        url: pathname || "",
        query: {
          video: isVideo ? undefined : true,
        },
      },
      { skipNull: true }
    );

    router.push(url);
  };

  const Icon = isVideo ? VideoOff : Video;
  const tooltipLabel = isVideo ? "End video call" : "Start video call";

  return (
    <ActionTooltip side="bottom" label={tooltipLabel}>
      <button onClick={onClick} className="hover:opacity-75 transition mr-4">
        <Icon className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
      </button>
    </ActionTooltip>
  );
};