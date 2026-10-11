"use client";

import { useEffect, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { MediaConference } from "@/components/media/media-conference";

import { useSocket } from "@/components/providers/socket-provider";

interface MediaRoomProps {
  chatId: string;
  video: boolean;
  audio: boolean;
};

export const MediaRoom = ({
  chatId,
  video,
  audio
}: MediaRoomProps) => {
  const { user, isLoaded } = useUser();
  const { socket } = useSocket();
  const [token, setToken] = useState("");
  const [liveKitUrl, setLiveKitUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Track room presence for green dot indicator across users
  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit("room:join", { roomId: chatId });

    return () => {
      socket.emit("room:leave", { roomId: chatId });
    };
  }, [socket, chatId]);

  useEffect(() => {
    if (!isLoaded || !user) return;

    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    const name = fullName || user.username || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

    let isMounted = true;

    (async () => {
      try {
        const query = new URLSearchParams({
          room: chatId,
          username: name,
          userId: user.id
        });

        const resp = await fetch(`/api/livekit?${query.toString()}`);
        const data = await resp.json();

        if (!resp.ok || !data.token) {
          throw new Error(data.error || "Failed to obtain room token");
        }

        if (isMounted) {
          setToken(data.token);
          if (data.wsUrl) {
            setLiveKitUrl(data.wsUrl);
          }
          setError(null);
        }
      } catch (e: any) {
        console.error("LiveKit connection error:", e);
        if (isMounted) {
          setError(e?.message || "Failed to connect to voice/video room");
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user, isLoaded, chatId]);

  if (error) {
    return (
      <div className="flex flex-col flex-1 justify-center items-center gap-y-2 p-4">
        <p className="text-sm text-rose-500 dark:text-rose-400 text-center">
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            setToken("");
          }}
          className="text-xs text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (token === "") {
    return (
      <div className="flex flex-col flex-1 justify-center items-center">
        <Loader2
          className="h-7 w-7 text-zinc-500 animate-spin my-4"
        />
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Loading...
        </p>
      </div>
    );
  }

  const serverUrl = liveKitUrl || process.env.NEXT_PUBLIC_LIVEKIT_URL;

  return (
    <LiveKitRoom
      data-lk-theme="default"
      serverUrl={serverUrl}
      token={token}
      connect={true}
      video={video}
      audio={audio}
      onError={(err) => console.error("LiveKit room error:", err)}
      className="flex-1 flex flex-col h-full"
    >
      <MediaConference video={video} />
    </LiveKitRoom>
  );
};