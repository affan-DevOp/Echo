"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Phone, PhoneOff, Video } from "lucide-react";
import axios from "axios";

import { useCallStore } from "@/hooks/use-call-store";
import { useSocket } from "@/components/providers/socket-provider";
import { UserAvatar } from "@/components/user-avatar";

export const IncomingCallModal = () => {
  const router = useRouter();
  const { socket } = useSocket();
  const { incomingCall, clearIncomingCall } = useCallStore();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ringIntervalRef = useRef<any>(null);

  // Synthesize pleasant Discord-style incoming call chime using Web Audio API
  useEffect(() => {
    if (!incomingCall) {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    const playChime = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;

        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new AudioCtx();
        }

        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const notes = [440, 554.37, 659.25]; // A4, C#5, E5 major triad
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + idx * 0.12);

          gain.gain.setValueAtTime(0.001, now + idx * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.12, now + idx * 0.12 + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now + idx * 0.12);
          osc.stop(now + idx * 0.12 + 0.36);
        });
      } catch (err) {
        // Non-blocking if audio blocked by autoplay policies
      }
    };

    playChime();
    ringIntervalRef.current = setInterval(playChime, 2500);

    return () => {
      if (ringIntervalRef.current) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const onAccept = () => {
    const call = incomingCall;
    clearIncomingCall();
    router.push(`/servers/${call.serverId}/conversations/${call.callerMemberId}?video=true`);
  };

  const onDecline = async () => {
    const call = incomingCall;
    clearIncomingCall();

    if (call) {
      if (socket) {
        socket.emit("call:decline", {
          conversationId: call.conversationId,
          callerProfileId: call.callerProfile?.id,
        });
      }

      try {
        await axios.post(`/api/socket/direct-messages?conversationId=${call.conversationId}`, {
          content: "📞 Call declined",
        });
      } catch (err) {
        console.error("Failed to post declined log:", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-700/80 p-6 shadow-2xl text-center flex flex-col items-center">
        {/* Pulsing ring around avatar */}
        <div className="relative mb-4 mt-2">
          <div className="absolute -inset-2 rounded-full bg-emerald-500/30 animate-ping opacity-75" />
          <div className="absolute -inset-1 rounded-full bg-emerald-500/40 animate-pulse" />
          <UserAvatar
            src={incomingCall.callerProfile?.imageUrl}
            className="h-20 w-20 relative ring-4 ring-emerald-500 shadow-xl"
          />
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-emerald-500 text-white shadow-lg">
            <Video className="w-4 h-4" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-white mb-1">
          {incomingCall.callerProfile?.name}
        </h3>
        <p className="text-sm text-zinc-400 mb-6 flex items-center gap-1.5 justify-center">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
          Incoming personal video call...
        </p>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-x-6 w-full mt-2">
          {/* Decline */}
          <div className="flex flex-col items-center gap-y-1.5">
            <button
              onClick={onDecline}
              className="h-14 w-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
              aria-label="Decline call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <span className="text-xs text-zinc-400 font-medium">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-y-1.5">
            <button
              onClick={onAccept}
              className="h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 animate-bounce"
              aria-label="Accept call"
            >
              <Phone className="w-6 h-6" />
            </button>
            <span className="text-xs text-emerald-400 font-medium">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
