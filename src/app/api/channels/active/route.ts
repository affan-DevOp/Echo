import { NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";

export async function GET() {
  try {
    const activeSet = new Set<string>();

    // 1. Check socket memory active rooms
    const globalAny: any = global;
    if (globalAny.__activeRooms) {
      for (const [roomId, socketIds] of (globalAny.__activeRooms as Map<string, Set<string>>).entries()) {
        if (socketIds && socketIds.size > 0) {
          activeSet.add(roomId);
        }
      }
    }

    // 2. Check LiveKit server active rooms if configured
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL;

    if (apiKey && apiSecret && wsUrl) {
      try {
        const httpHost = wsUrl.replace("wss://", "https://").replace("ws://", "http://");
        const svc = new RoomServiceClient(httpHost, apiKey, apiSecret);
        const rooms = await svc.listRooms();
        if (Array.isArray(rooms)) {
          for (const room of rooms) {
            if (room.numParticipants > 0) {
              activeSet.add(room.name);
            }
          }
        }
      } catch (lkErr) {
        // Fallback to socket tracking if LiveKit API fails
      }
    }

    return NextResponse.json({ activeRooms: Array.from(activeSet) });
  } catch (error) {
    console.error("[CHANNELS_ACTIVE_GET]", error);
    return NextResponse.json({ activeRooms: [] });
  }
}
