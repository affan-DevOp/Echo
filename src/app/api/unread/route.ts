import { NextRequest, NextResponse } from "next/server";
import { currentProfile } from "@/lib/current-profile";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const profile = await currentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serverId = req.nextUrl.searchParams.get("serverId");
    if (!serverId) {
      return NextResponse.json({ error: "Missing serverId" }, { status: 400 });
    }

    const channels = await db.channel.findMany({
      where: { serverId },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            member: {
              select: {
                profileId: true,
              },
            },
          },
        },
      },
    });

    const currentMember = await db.member.findFirst({
      where: {
        serverId,
        profileId: profile.id,
      },
    });

    const conversations = currentMember
      ? await db.conversation.findMany({
          where: {
            OR: [
              { memberOneId: currentMember.id },
              { memberTwoId: currentMember.id },
            ],
          },
          include: {
            directMessages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                member: {
                  select: {
                    profileId: true,
                  },
                },
              },
            },
          },
        })
      : [];

    const channelData: Record<string, { latestMessageId: string; latestMessageAt: string; isFromSelf: boolean }> = {};
    for (const channel of channels) {
      const latest = channel.messages[0];
      if (latest) {
        channelData[channel.id] = {
          latestMessageId: latest.id,
          latestMessageAt: latest.createdAt.toISOString(),
          isFromSelf: latest.member.profileId === profile.id,
        };
      }
    }

    const dmData: Record<string, { conversationId: string; latestMessageId: string; latestMessageAt: string; isFromSelf: boolean }> = {};
    if (currentMember) {
      for (const conv of conversations) {
        const latest = conv.directMessages[0];
        const otherMemberId = conv.memberOneId === currentMember.id ? conv.memberTwoId : conv.memberOneId;
        if (latest) {
          dmData[otherMemberId] = {
            conversationId: conv.id,
            latestMessageId: latest.id,
            latestMessageAt: latest.createdAt.toISOString(),
            isFromSelf: latest.member.profileId === profile.id,
          };
        }
      }
    }

    return NextResponse.json({
      channels: channelData,
      directMessages: dmData,
    });
  } catch (error) {
    console.error("[UNREAD_GET]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
