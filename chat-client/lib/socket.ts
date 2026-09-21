import { io, Socket } from "socket.io-client";

/**
 * ---------------------------------------------------------
 * Types
 * ---------------------------------------------------------
 */

export type ChatUserRole =
  | "user"
  | "tasker"
  | "admin";

export interface ChatMessage {
  id: string;

  /**
   * Task Chat:
   * conversationId = ChatSession.id
   *
   * Support Chat:
   * conversationId = SupportConversation.id
   */
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
   * Real-time new message
   */
  "message:new": (
    message: ChatMessage
  ) => void;

  /**
   * Task Chat history
   */
  "task:history": (
    messages: ChatMessage[]
  ) => void;
}

/**
 * ---------------------------------------------------------
 * Client -> Server
 * ---------------------------------------------------------
 */

interface ClientToServerEvents {
  /**
   * Send message
   *
   * For Task Chat conversationId is optional
   * because the backend knows the user's task session
   * in our current temporary architecture.
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
 * Socket
 * ---------------------------------------------------------
 */

export const socket: Socket<
  ServerToClientEvents,
  ClientToServerEvents
> = io(
  "http://localhost:4000",
  {
    autoConnect: false,
  }
);