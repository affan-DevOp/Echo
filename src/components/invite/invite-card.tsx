"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Loader2, Users, CheckCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteCardProps {
  server: {
    id: string;
    name: string;
    imageUrl: string;
    memberCount: number;
    inviterName?: string;
  };
  inviteCode: string;
  isSignedIn: boolean;
  isMember: boolean;
}

export const InviteCard = ({
  server,
  inviteCode,
  isSignedIn,
  isMember,
}: InviteCardProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  };

  const onAccept = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await axios.post(`/api/invite/${inviteCode}`);
      const serverId = response.data?.serverId || server.id;

      router.push(`/servers/${serverId}`);
      router.refresh();
    } catch (err: any) {
      console.error("Failed to join server:", err);
      setError(err?.response?.data || "Failed to join server. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md">
      {/* Background ambient glow */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[#5865F2]/30 via-indigo-500/20 to-purple-500/30 blur-xl opacity-75" />

      <div className="relative bg-[#313338] text-white rounded-2xl shadow-2xl border border-neutral-700/60 p-8 flex flex-col items-center text-center">
        {/* Server Icon */}
        <div className="relative mb-5">
          {server.imageUrl ? (
            <div className="relative w-24 h-24 rounded-[28px] overflow-hidden shadow-xl border-4 border-[#2b2d31]">
              <Image
                src={server.imageUrl}
                alt={server.name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-[28px] bg-gradient-to-br from-[#5865F2] to-indigo-700 flex items-center justify-center text-2xl font-bold shadow-xl border-4 border-[#2b2d31]">
              {getInitials(server.name)}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-[#23a55a] rounded-full p-1 border-2 border-[#313338]">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* Subtitle / Inviter Header */}
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
          {server.inviterName ? (
            <>
              <span className="text-zinc-300 font-bold">{server.inviterName}</span> invited you to join
            </>
          ) : (
            "You've been invited to join a server"
          )}
        </p>

        {/* Server Name */}
        <h1 className="text-2xl font-bold text-white mb-3 break-words max-w-full">
          {server.name}
        </h1>

        {/* Member Count & Online Indicators */}
        <div className="flex items-center justify-center gap-x-4 text-xs font-medium text-zinc-300 mb-6 bg-[#2b2d31] px-4 py-2 rounded-full border border-neutral-700/40">
          <div className="flex items-center gap-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#23a55a]" />
            <span>Online</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-zinc-600" />
          <div className="flex items-center gap-x-1.5 text-zinc-400">
            <Users className="w-3.5 h-3.5" />
            <span>{server.memberCount} {server.memberCount === 1 ? "Member" : "Members"}</span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="w-full mb-4 p-2.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="w-full space-y-3">
          {isMember ? (
            <>
              <div className="flex items-center justify-center gap-x-1.5 text-xs text-emerald-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span>You are already a member of this server</span>
              </div>
              <Button
                onClick={() => router.push(`/servers/${server.id}`)}
                className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-6 text-base rounded-md transition shadow-md"
              >
                Enter Server
              </Button>
            </>
          ) : isSignedIn ? (
            <Button
              onClick={onAccept}
              disabled={isLoading}
              className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-6 text-base rounded-md transition shadow-md disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-x-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Joining Server...</span>
                </div>
              ) : (
                "Accept Invite"
              )}
            </Button>
          ) : (
            <>
              <Button
                asChild
                className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white font-medium py-6 text-base rounded-md transition shadow-md"
              >
                <Link href={`/sign-in?redirect_url=/invite/${inviteCode}`}>
                  Log In to Accept Invite
                </Link>
              </Button>
              <p className="text-xs text-zinc-400">
                Don't have an account?{" "}
                <Link
                  href={`/sign-up?redirect_url=/invite/${inviteCode}`}
                  className="text-[#5865F2] hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
