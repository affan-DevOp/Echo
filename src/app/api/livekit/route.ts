import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const room = req.nextUrl.searchParams.get("room");
    const rawUsername = req.nextUrl.searchParams.get("username");
    const rawUserId = req.nextUrl.searchParams.get("userId");

    if (!room) {
      return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
    }

    const username = rawUsername?.trim() || "User";
    const userId = rawUserId && rawUserId !== "undefined" && rawUserId !== "null"
      ? rawUserId
      : crypto.randomUUID();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      console.error("LiveKit misconfigured. Missing apiKey, apiSecret, or wsUrl.");
      return NextResponse.json({ error: "Server misconfigured: LiveKit credentials missing" }, { status: 500 });
    }

    const at = new AccessToken(apiKey, apiSecret, { identity: userId, name: username });

    at.addGrant({ room, roomJoin: true, canPublish: true, canSubscribe: true });
    const token = await at.toJwt();

    return NextResponse.json({ token, wsUrl });
  } catch (error: any) {
    console.error("Error generating LiveKit token:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}