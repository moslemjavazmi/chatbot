import { io, Socket } from "socket.io-client";

interface Message {
  id: string;
  senderId: string;
  senderRole:
    | "user"
    | "tasker"
    | "admin"
    | "guest";
  text: string;
  createdAt: string;
}

interface ServerToClientEvents {
  "message:new": (
    message: Message
  ) => void;
}

interface ClientToServerEvents {
  "message:send": (
    payload: {
      text: string;
      conversationId?: string;
    },
    acknowledgement: (response: {
      success: boolean;
      messageId?: string;
      error?: string;
    }) => void
  ) => void;
}

export const socket: Socket<
  ServerToClientEvents,
  ClientToServerEvents
> = io("http://localhost:4000", {
  autoConnect: false,
});