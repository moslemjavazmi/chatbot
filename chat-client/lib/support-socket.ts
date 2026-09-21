import {
  io,
  Socket,
} from "socket.io-client";

/**
 * ---------------------------------------------------------
 * Types
 * ---------------------------------------------------------
 */

export type SupportIdentityType =
  | "user"
  | "tasker"
  | "guest"
  | "admin";

export type SupportCustomerType =
  | "user"
  | "tasker"
  | "guest";

export type SupportSenderRole =
  | "user"
  | "tasker"
  | "guest"
  | "admin";

/**
 * ---------------------------------------------------------
 * Presence
 * ---------------------------------------------------------
 */

export interface SupportPresence {
  id: string;

  type: SupportIdentityType;

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

  senderRole: SupportSenderRole;

  text: string;

  createdAt: string;
}

/**
 * ---------------------------------------------------------
 * Server -> Client
 * ---------------------------------------------------------
 */

interface ServerToClientEvents {
  "message:new": (
    message: SupportMessage
  ) => void;

  "support:conversation:history": (
    messages: SupportMessage[]
  ) => void;
}

/**
 * ---------------------------------------------------------
 * Client -> Server
 * ---------------------------------------------------------
 */

interface ClientToServerEvents {
  /**
   * Get/create current user's
   * support conversation.
   */
  "support:conversation:get": (
    acknowledgement: (response: {
      success: boolean;

      conversation?: SupportConversation;

      error?: string;
    }) => void
  ) => void;

  /**
   * Join an existing support
   * conversation.
   */
  "support:conversation:join": (
    payload: {
      conversationId: string;
    },
    acknowledgement: (response: {
      success: boolean;

      error?: string;
    }) => void
  ) => void;

  /**
   * Send support message.
   */
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

/**
 * ---------------------------------------------------------
 * Support Socket
 * ---------------------------------------------------------
 */

export const supportSocket: Socket<
  ServerToClientEvents,
  ClientToServerEvents
> = io(
  "http://localhost:4000",
  {
    autoConnect: false,
  }
);