import {
  io,
  Socket,
} from "socket.io-client";

/**
 * ---------------------------------------------------------
 * Support Presence
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
 * Support Conversation
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
 * Support Message
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
  /**
   * New message
   */
  "message:new": (
    message: SupportMessage
  ) => void;

  /**
   * Conversation history
   */
  "support:conversation:history": (
    messages: SupportMessage[]
  ) => void;

  /**
   * Presence list
   */
  "support:presence:list": (
    identities: SupportPresence[]
  ) => void;

  /**
   * Presence update
   */
  "support:presence:update": (
    presence: SupportPresence
  ) => void;
}

/**
 * ---------------------------------------------------------
 * Client -> Server
 * ---------------------------------------------------------
 */

interface ClientToServerEvents {
  /**
   * Get/create support conversation
   */
  "support:conversation:get": (
    acknowledgement: (response: {
      success: boolean;

      conversation?: SupportConversation;

      error?: string;
    }) => void
  ) => void;

  /**
   * Join support conversation
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
   * Send message
   */
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