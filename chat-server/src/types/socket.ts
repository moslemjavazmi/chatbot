import { Socket } from "socket.io";

/**
 * ---------------------------------------------------------
 * User roles
 * ---------------------------------------------------------
 */

export type UserRole =
  | "user"
  | "tasker"
  | "admin";

/**
 * ---------------------------------------------------------
 * Support identity
 * ---------------------------------------------------------
 */

export type SupportIdentityType =
  | "user"
  | "tasker"
  | "guest"
  | "admin";

export interface ChatUser {
  id: string;
  role: UserRole;
}

export interface SupportIdentity {
  id: string;
  type: SupportIdentityType;
}

export interface SupportPresence {
  id: string;
  type: SupportIdentityType;
  online: boolean;
  lastSeen: string | null;
}

/**
 * ---------------------------------------------------------
 * Support conversation
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
 * Chat message
 * ---------------------------------------------------------
 */

export interface ChatMessage {
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
 * Socket data
 * ---------------------------------------------------------
 */

export interface SocketData {
  user?: ChatUser;

  supportIdentity: SupportIdentity;

  /**
   * The support conversation currently joined
   * by this socket.
   */
  supportConversationId?: string;
}

/**
 * ---------------------------------------------------------
 * Client -> Server
 * ---------------------------------------------------------
 */

export interface ClientToServerEvents {
  /**
   * General message event.
   *
   * Task Chat:
   * {
   *   text: "hello"
   * }
   *
   * Support Chat:
   * {
   *   text: "hello",
   *   conversationId: "support-conv-..."
   * }
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

  /**
   * Customer gets/creates their support conversation.
   */
  "support:conversation:get": (
    acknowledgement: (response: {
      success: boolean;
      conversation?: SupportConversation;
      error?: string;
    }) => void
  ) => void;

  /**
   * Admin joins a support conversation.
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
   * Admin finds a conversation by customer.
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
}

/**
 * ---------------------------------------------------------
 * Server -> Client
 * ---------------------------------------------------------
 */

export interface ServerToClientEvents {
  /**
   * New message.
   */
  "message:new": (
    message: ChatMessage
  ) => void;

  /**
   * Support conversation history.
   */
  "support:conversation:history": (
    messages: ChatMessage[]
  ) => void;

  /**
   * Presence.
   */
  "support:presence:list": (
    identities: SupportPresence[]
  ) => void;

  "support:presence:update": (
    presence: SupportPresence
  ) => void;
}

/**
 * ---------------------------------------------------------
 * Inter-server events
 * ---------------------------------------------------------
 */

export interface InterServerEvents {}

/**
 * ---------------------------------------------------------
 * Typed Socket
 * ---------------------------------------------------------
 */

export type ChatSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;


/**
 * ---------------------------------------------------------
 * for chat session
 * ---------------------------------------------------------
 */

export type ChatSessionStatus =
  | "active"
  | "closed";

export interface ChatParticipant {
  id: string;
  role: "user" | "tasker";
}

export interface ChatSession {
  id: string;
  type: "task";
  taskId: string;
  participants: ChatParticipant[];
  status: ChatSessionStatus;
  createdAt: string;
  updatedAt: string;
}