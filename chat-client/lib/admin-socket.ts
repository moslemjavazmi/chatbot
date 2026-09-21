import {
  io,
  Socket,
} from "socket.io-client";

/**
 * ---------------------------------------------------------
 * Presence
 * ---------------------------------------------------------
 */

interface SupportPresence {
  id: string;

  type:
    | "user"
    | "tasker"
    | "guest"
    | "admin";

  online: boolean;

  lastSeen: string | null;
}

/**
 * ---------------------------------------------------------
 * Conversation
 * ---------------------------------------------------------
 */

export interface SupportConversation {
  id: string;

  customerId: string;

  customerType:
    | "user"
    | "tasker"
    | "guest";
}

/**
 * ---------------------------------------------------------
 * Message
 * ---------------------------------------------------------
 */

export interface SupportMessage {
  id: string;

  conversationId: string;

  senderId: string;

  senderRole:
    | "user"
    | "tasker"
    | "guest"
    | "admin";

  text: string;

  createdAt: string;
}

/**
 * ---------------------------------------------------------
 * Server -> Client
 * ---------------------------------------------------------
 */

interface ServerToClientEvents {
  "support:presence:list": (
    identities: SupportPresence[]
  ) => void;

  "support:presence:update": (
    presence: SupportPresence
  ) => void;

  "support:conversation:history": (
    messages: SupportMessage[]
  ) => void;

  "message:new": (
    message: SupportMessage
  ) => void;
}

/**
 * ---------------------------------------------------------
 * Client -> Server
 * ---------------------------------------------------------
 */

interface ClientToServerEvents {
  "support:conversation:get-by-customer": (
    payload: {
      customerId: string;

      customerType:
        | "user"
        | "tasker"
        | "guest";
    },
    acknowledgement: (response: {
      success: boolean;

      conversation?: SupportConversation;

      error?: string;
    }) => void
  ) => void;

  "support:conversation:join": (
    payload: {
      conversationId: string;
    },
    acknowledgement: (response: {
      success: boolean;

      error?: string;
    }) => void
  ) => void;

  "message:send": (
    payload: {
      text: string;

      conversationId: string;
    },
    acknowledgement: (response: {
      success: boolean;

      messageId?: string;

      error?: string;
    }) => void
  ) => void;
}

/**
 * ---------------------------------------------------------
 * Admin Socket
 * ---------------------------------------------------------
 */

export const adminSocket: Socket<
  ServerToClientEvents,
  ClientToServerEvents
> = io(
  "http://localhost:4000",
  {
    autoConnect: false,
  }
);