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
  /**
   * All visitors/users/taskers/guests
   * currently known to presence manager.
   */
  "support:presence:list": (
    identities: SupportPresence[]
  ) => void;

  /**
   * Presence changed.
   */
  "support:presence:update": (
    presence: SupportPresence
  ) => void;

  /**
   * Selected conversation history.
   */
  "support:conversation:history": (
    messages: SupportMessage[]
  ) => void;

  /**
   * New support message.
   */
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
  /**
   * Admin finds/creates customer's
   * support conversation.
   */
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

  /**
   * Admin joins selected conversation.
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
   * Admin sends support message.
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