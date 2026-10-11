import { Server as NetServer } from "http";
import { NextApiRequest } from "next";
import { Server as ServerIO } from "socket.io";

import { NextApiResponseServerIo } from "@/types";

export const config = {
  api: {
    bodyParser: false,
  },
};

// Global active rooms tracking map
const globalAny: any = global;
if (!globalAny.__activeRooms) {
  globalAny.__activeRooms = new Map<string, Set<string>>();
}
const activeRooms: Map<string, Set<string>> = globalAny.__activeRooms;

const ioHandler = (req: NextApiRequest, res: NextApiResponseServerIo) => {
  if (!res.socket.server.io) {
    const path = "/api/socket/io";
    const httpServer: NetServer = res.socket.server as any;
    const io = new ServerIO(httpServer, {
      path: path,
      // @ts-ignore
      addTrailingSlash: false,
    });

    io.on("connection", (socket) => {
      // User joins their profile-specific socket room
      socket.on("user:join", (profileId: string) => {
        if (profileId) {
          socket.join(`user:${profileId}`);
        }
      });

      // Direct call initiation
      socket.on("call:initiate", (data: any) => {
        if (!data) return;
        if (data.recipientProfileId) {
          io.to(`user:${data.recipientProfileId}`).emit("call:incoming", data);
          socket.broadcast.emit(`call:incoming:${data.recipientProfileId}`, data);
        }
      });

      // Direct call decline
      socket.on("call:decline", (data: any) => {
        if (!data) return;
        if (data.callerProfileId) {
          io.to(`user:${data.callerProfileId}`).emit("call:declined", data);
        }
        if (data.conversationId) {
          socket.broadcast.emit(`call:declined:${data.conversationId}`, data);
        }
        socket.broadcast.emit("call:declined", data);
      });

      // Direct call ended
      socket.on("call:ended", (data: any) => {
        if (!data) return;
        if (data.conversationId) {
          socket.broadcast.emit(`call:ended:${data.conversationId}`, data);
        }
        if (data.recipientProfileId) {
          io.to(`user:${data.recipientProfileId}`).emit("call:ended", data);
        }
        socket.broadcast.emit("call:ended", data);
      });

      // Voice/Video channel presence tracking
      socket.on("room:join", ({ roomId }: { roomId: string }) => {
        if (!roomId) return;
        if (!activeRooms.has(roomId)) {
          activeRooms.set(roomId, new Set());
        }
        activeRooms.get(roomId)!.add(socket.id);
        io.emit("room:status", {
          roomId,
          active: true,
          count: activeRooms.get(roomId)!.size,
        });
      });

      socket.on("room:leave", ({ roomId }: { roomId: string }) => {
        if (!roomId || !activeRooms.has(roomId)) return;
        const set = activeRooms.get(roomId)!;
        set.delete(socket.id);
        const count = set.size;
        if (count === 0) {
          activeRooms.delete(roomId);
        }
        io.emit("room:status", {
          roomId,
          active: count > 0,
          count,
        });
      });

      // Request list of active rooms
      socket.on("room:get-active", () => {
        const activeList = Array.from(activeRooms.entries())
          .filter(([_, set]) => set.size > 0)
          .map(([roomId]) => roomId);
        socket.emit("room:active-list", activeList);
      });

      // Handle socket disconnect
      socket.on("disconnect", () => {
        for (const [roomId, socketIds] of activeRooms.entries()) {
          if (socketIds.has(socket.id)) {
            socketIds.delete(socket.id);
            const count = socketIds.size;
            if (count === 0) {
              activeRooms.delete(roomId);
            }
            io.emit("room:status", {
              roomId,
              active: count > 0,
              count,
            });
          }
        }
      });
    });

    res.socket.server.io = io;
  }

  res.end();
}

export default ioHandler;
