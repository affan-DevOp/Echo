"use client";

import { 
  Channel, 
  ChannelType, 
  MemberRole,
  Server
} from "@prisma/client";
import { Edit, Hash, Lock, Mic, Trash, Video } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { ActionTooltip } from "@/components/action-tooltip";
import { ModalType, useModal } from "@/hooks/use-modal-store";
import { useActiveRooms } from "@/hooks/use-active-rooms";
import { useUnreadStore } from "@/hooks/use-unread-store";

interface ServerChannelProps {
  channel: Channel;
  server: Server;
  role?: MemberRole;
}

const iconMap = {
  [ChannelType.TEXT]: Hash,
  [ChannelType.AUDIO]: Mic,
  [ChannelType.VIDEO]: Video,
}

export const ServerChannel = ({
  channel,
  server,
  role
}: ServerChannelProps) => {
  const { onOpen } = useModal();
  const params = useParams();
  const router = useRouter();
  const { activeRooms } = useActiveRooms();
  const { unreadCounts, markAsRead } = useUnreadStore();

  const isCallActive =
    (channel.type === ChannelType.AUDIO || channel.type === ChannelType.VIDEO) &&
    !!activeRooms[channel.id];

  const unreadCount =
    params?.channelId === channel.id ? 0 : unreadCounts[channel.id] || 0;
  const hasUnread = unreadCount > 0;

  const Icon = iconMap[channel.type];

  const onClick = () => {
    markAsRead(channel.id);
    router.push(`/servers/${params?.serverId}/channels/${channel.id}`);
  }

  const onAction = (e: React.MouseEvent, action: ModalType) => {
    e.stopPropagation();
    onOpen(action, { channel, server });
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "group px-2 py-2 rounded-md flex items-center gap-x-2 w-full hover:bg-zinc-700/10 dark:hover:bg-zinc-700/50 transition mb-1",
        params?.channelId === channel.id && "bg-zinc-700/20 dark:bg-zinc-700"
      )}
    >
      <Icon className={cn(
        "flex-shrink-0 w-5 h-5 text-zinc-500 dark:text-zinc-400",
        hasUnread && "text-zinc-800 dark:text-zinc-200"
      )} />
      <p className={cn(
        "line-clamp-1 font-semibold text-sm text-zinc-500 group-hover:text-zinc-600 dark:text-zinc-400 dark:group-hover:text-zinc-300 transition text-left",
        params?.channelId === channel.id && "text-primary dark:text-zinc-200 dark:group-hover:text-white",
        hasUnread && "font-bold text-zinc-900 dark:text-white"
      )}>
        {channel.name}
      </p>

      {/* Green dot indicator for active voice/video channel call */}
      {isCallActive && (
        <ActionTooltip label="Call in progress">
          <span className="relative flex h-2.5 w-2.5 ml-1 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
        </ActionTooltip>
      )}

      {/* Unread message count badge */}
      {hasUnread && (
        <span className="ml-auto mr-1 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-tight shadow-sm flex-shrink-0">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}

      {channel.name !== "general" && role !== MemberRole.GUEST && (
        <div className={cn(
          "flex items-center gap-x-2",
          !hasUnread && "ml-auto"
        )}>
          <ActionTooltip label="Edit">
            <Edit
              onClick={(e) => onAction(e, "editChannel")}
              className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
            />
          </ActionTooltip>
          <ActionTooltip label="Delete">
            <Trash
              onClick={(e) => onAction(e, "deleteChannel")}
              className="hidden group-hover:block w-4 h-4 text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition"
            />
          </ActionTooltip>
        </div>
      )}
      {channel.name === "general" && (
        <Lock
          className={cn(
            "w-4 h-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0",
            !hasUnread && "ml-auto"
          )}
        />
      )}
    </button>
  )
}