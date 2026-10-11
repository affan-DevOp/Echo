import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { initialProfile } from "@/lib/initial-profile";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ inviteCode: string }> }
) {
  try {
    const user = await currentUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { inviteCode } = await params;

    if (!inviteCode) {
      return new NextResponse("Invite code missing", { status: 400 });
    }

    const profile = await initialProfile();

    const server = await db.server.findUnique({
      where: {
        inviteCode,
      },
      include: {
        members: {
          where: {
            profileId: profile.id,
          },
        },
      },
    });

    if (!server) {
      return new NextResponse("Server not found", { status: 404 });
    }

    // If user is already a member, return the server ID directly
    if (server.members && server.members.length > 0) {
      return NextResponse.json({ serverId: server.id });
    }

    // Add user as a member
    const updatedServer = await db.server.update({
      where: {
        inviteCode,
      },
      data: {
        members: {
          create: [
            {
              profileId: profile.id,
            },
          ],
        },
      },
    });

    return NextResponse.json({ serverId: updatedServer.id });
  } catch (error) {
    console.error("[INVITE_CODE_JOIN]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
