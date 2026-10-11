import { create } from "zustand";

export interface IncomingCallData {
  conversationId: string;
  serverId: string;
  callerMemberId: string;
  callerProfile: {
    id: string;
    name: string;
    imageUrl: string;
  };
  recipientProfileId: string;
  recipientMemberId?: string;
}

interface CallStore {
  incomingCall: IncomingCallData | null;
  setIncomingCall: (call: IncomingCallData | null) => void;
  clearIncomingCall: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  incomingCall: null,
  setIncomingCall: (call) => set({ incomingCall: call }),
  clearIncomingCall: () => set({ incomingCall: null }),
}));
