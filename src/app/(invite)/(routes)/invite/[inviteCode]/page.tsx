import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { db } from "@/lib/db";
import { initialProfile } from "@/lib/initial-profile";
import { InviteCard } from "@/components/invite/invite-card";
import { Button } from "@/components/ui/button";

interface InviteCodePageProps {
  params: Promise<{
    inviteCode: string;
  }>;
}

const InviteCodePage = async ({
  params,
}: InviteCodePageProps) => {
  const { inviteCode } = await params;

  if (!inviteCode) {
    return (
      <div className="h-full min-h-screen flex items-center justify-center bg-[#1e1f22] p-4">
        <div className="bg-[#313338] text-white rounded-2xl shadow-2xl border border-neutral-700/60 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-sm text-zinc-400 mb-6">No invite code was provided.</p>
          <Button asChild className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const server = await db.server.findUnique({
    where: {
      inviteCode: inviteCode,
    },
    include: {
      _count: {
        select: {
          members: true,
        },
      },
      profile: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!server) {
    return (
      <div className="h-full min-h-screen flex items-center justify-center bg-[#1e1f22] p-4">
        <div className="bg-[#313338] text-white rounded-2xl shadow-2xl border border-neutral-700/60 p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">Invite Invalid or Expired</h1>
          <p className="text-sm text-zinc-400 mb-6">
            This invite link may have expired, or you might not have permission to join.
          </p>
          <Button asChild className="w-full bg-[#5865F2] hover:bg-[#4752c4] text-white">
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { userId } = await auth();

  let isMember = false;
  let isSignedIn = false;

  if (userId) {
    isSignedIn = true;
    // Calling initialProfile ensures user profile row exists in the DB
    const profile = await initialProfile();

    const existingMember = await db.member.findFirst({
      where: {
        serverId: server.id,
        profileId: profile.id,
      },
    });

    isMember = !!existingMember;
  }

  return (
    <div className="h-full min-h-screen flex items-center justify-center bg-[#1e1f22] p-4">
      <InviteCard
        server={{
          id: server.id,
          name: server.name,
          imageUrl: server.imageUrl,
          memberCount: server._count.members,
          inviterName: server.profile?.name,
        }}
        inviteCode={inviteCode}
        isSignedIn={isSignedIn}
        isMember={isMember}
      />
    </div>
  );
};

export default InviteCodePage;