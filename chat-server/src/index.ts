import express from "express";
import cors from "cors";

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { Server } from "socket.io";

import {
  ChatSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  UserRole,
  SupportIdentity,
  ChatMessage,
} from "./types/socket";

import {
  SupportConversationStore,
} from "./support/conversation-store";

import {
  PresenceManager,
} from "./presence/presence-manager";

/**
 * ---------------------------------------------------------
 * Express
 * ---------------------------------------------------------
 */

const app = express();

app.use(
  cors({
    origin: "http://localhost:3000",
  })
);

/**
 * ---------------------------------------------------------
 * HTTP Server
 * ---------------------------------------------------------
 */

const httpServer = createServer(app);

/**
 * ---------------------------------------------------------
 * Socket.IO
 * ---------------------------------------------------------
 */

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  {
    user?: {
      id: string;
      role: UserRole;
    };

    supportIdentity: SupportIdentity;

    supportConversationId?: string;
  }
>(httpServer, {
  cors: {
    origin: "http://localhost:3000",
  },
});

/**
 * ---------------------------------------------------------
 * HTTP routes
 * ---------------------------------------------------------
 */

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
  });
});

app.get("/", (_req, res) => {
  res.json({
    message: "Chat server is running",
  });
});

/**
 * ---------------------------------------------------------
 * Temporary fixed identities
 * ---------------------------------------------------------
 *
 * These are temporary.
 *
 * Later:
 * JWT will replace this section.
 */

const TASK_ID = "101";

const TASK_OWNER_ID = "user-1";

const TASKER_ID = "tasker-1";

const ADMIN_ID = "admin-1";

const TASK_ROOM =
  `task:${TASK_ID}`;

/**
 * ---------------------------------------------------------
 * Temporary users
 * ---------------------------------------------------------
 */

const users = {
  "user-1": {
    id: TASK_OWNER_ID,
    role: "user" as const,
  },

  "tasker-1": {
    id: TASKER_ID,
    role: "tasker" as const,
  },

  "admin-1": {
    id: ADMIN_ID,
    role: "admin" as const,
  },
};

/**
 * ---------------------------------------------------------
 * Managers / Stores
 * ---------------------------------------------------------
 */

const presenceManager =
  new PresenceManager();

const conversationStore =
  new SupportConversationStore();

/**
 * ---------------------------------------------------------
 * Temporary message history
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 *
 * This is only in memory.
 *
 * Server restart => messages disappear.
 *
 * Later:
 * MongoDB will replace this.
 */

const supportMessages =
  new Map<string, ChatMessage[]>();

/**
 * ---------------------------------------------------------
 * Helper: get conversation room
 * ---------------------------------------------------------
 */

function getSupportRoom(
  conversationId: string
) {
  return `support:conversation:${conversationId}`;
}

/**
 * ---------------------------------------------------------
 * Helper: save support message
 * ---------------------------------------------------------
 */

function saveSupportMessage(
  message: ChatMessage
) {
  const existing =
    supportMessages.get(
      message.conversationId
    ) ?? [];

  existing.push(message);

  supportMessages.set(
    message.conversationId,
    existing
  );
}

/**
 * ---------------------------------------------------------
 * Helper: get support messages
 * ---------------------------------------------------------
 */

function getSupportMessages(
  conversationId: string
): ChatMessage[] {
  return (
    supportMessages.get(
      conversationId
    ) ?? []
  );
}

/**
 * ---------------------------------------------------------
 * Socket authentication
 * ---------------------------------------------------------
 *
 * Temporary authentication.
 *
 * Later:
 * JWT.
 */

io.use((socket, next) => {
  console.log(
    "Incoming socket auth:",
    socket.handshake.auth
  );

  const userId =
    socket.handshake.auth?.userId;

  const role =
    socket.handshake.auth?.role;

  const anonymousId =
    socket.handshake.auth?.anonymousId;

  /**
   * -------------------------------------------------------
   * Guest
   * -------------------------------------------------------
   */

  if (anonymousId) {
    if (
      typeof anonymousId !== "string" ||
      !anonymousId.startsWith("guest-")
    ) {
      return next(
        new Error(
          "Invalid anonymous identity"
        )
      );
    }

    socket.data.supportIdentity = {
      id: anonymousId,
      type: "guest",
    };

    console.log(
      "Guest connected:",
      anonymousId
    );

    return next();
  }

  /**
   * -------------------------------------------------------
   * Authenticated temporary user
   * -------------------------------------------------------
   */

  if (!userId || !role) {
    return next(
      new Error(
        "userId/role or anonymousId is required"
      )
    );
  }

  const user =
    users[
      userId as keyof typeof users
    ];

  if (!user) {
    return next(
      new Error(
        "User does not exist"
      )
    );
  }

  if (user.role !== role) {
    return next(
      new Error(
        "Invalid user role"
      )
    );
  }

  socket.data.user = user;

  socket.data.supportIdentity = {
    id: user.id,
    type: user.role,
  };

  console.log(
    "Authenticated:",
    socket.data.supportIdentity
  );

  next();
});

/**
 * ---------------------------------------------------------
 * Socket connection
 * ---------------------------------------------------------
 */

io.on(
  "connection",
  (socket: ChatSocket) => {
    const supportIdentity =
      socket.data.supportIdentity;

    console.log(
      `Socket connected: ${socket.id}`
    );

    console.log(
      "Support identity:",
      supportIdentity
    );

    /**
     * -----------------------------------------------------
     * Presence
     * -----------------------------------------------------
     */

    const presence =
      presenceManager.addConnection(
        supportIdentity,
        socket.id
      );

    console.log(
      "Presence:",
      presence
    );

    /**
     * -----------------------------------------------------
     * Task Chat
     * -----------------------------------------------------
     *
     * Only task owner and tasker
     * can join task room.
     */

    if (
      supportIdentity.id ===
      TASK_OWNER_ID
    ) {
      socket.join(TASK_ROOM);

      console.log(
        `${supportIdentity.id} joined ${TASK_ROOM}`
      );
    }

    if (
      supportIdentity.id ===
      TASKER_ID
    ) {
      socket.join(TASK_ROOM);

      console.log(
        `${supportIdentity.id} joined ${TASK_ROOM}`
      );
    }

    /**
     * -----------------------------------------------------
     * Admin presence list
     * -----------------------------------------------------
     */

    if (
      supportIdentity.type ===
      "admin"
    ) {
      socket.emit(
        "support:presence:list",
        presenceManager.getAll()
      );
    }

    /**
     * -----------------------------------------------------
     * Customer gets support conversation
     * -----------------------------------------------------
     */

    socket.on(
      "support:conversation:get",
      (acknowledgement) => {
        const identity =
          socket.data.supportIdentity;

        /**
         * Admin cannot create customer
         * conversation.
         */
        if (
          identity.type === "admin"
        ) {
          return acknowledgement({
            success: false,
            error:
              "Admin cannot create a customer conversation",
          });
        }

        /**
         * Get/create conversation.
         */
        const conversation =
          conversationStore.getOrCreate(
            identity
          );

        /**
         * Conversation room.
         */
        const room =
          getSupportRoom(
            conversation.id
          );

        /**
         * Join conversation.
         */
        socket.join(room);

        /**
         * Remember conversation
         * on socket.
         */
        socket.data.supportConversationId =
          conversation.id;

        console.log(
          `${identity.id} joined ${room}`
        );

        /**
         * Send history to customer.
         */
        socket.emit(
          "support:conversation:history",
          getSupportMessages(
            conversation.id
          )
        );

        /**
         * Response.
         */
        acknowledgement({
          success: true,
          conversation,
        });
      }
    );

    /**
     * -----------------------------------------------------
     * Admin finds customer conversation
     * -----------------------------------------------------
     */

    socket.on(
      "support:conversation:get-by-customer",
      (
        {
          customerId,
          customerType,
        },
        acknowledgement
      ) => {
        /**
         * Only admin.
         */
        if (
          socket.data.supportIdentity
            .type !== "admin"
        ) {
          return acknowledgement({
            success: false,
            error:
              "Only admin can access this",
          });
        }

        /**
         * Try to find existing conversation.
         */
        let conversation =
          conversationStore.getByCustomer(
            customerId,
            customerType
          );

        /**
         * If it does not exist,
         * create it.
         */
        if (!conversation) {
          conversation =
            conversationStore.getOrCreate({
              id: customerId,
              type: customerType,
            });
        }

        console.log(
          "Admin requested conversation:",
          conversation
        );

        /**
         * IMPORTANT:
         * We MUST acknowledge.
         */
        return acknowledgement({
          success: true,
          conversation,
        });
      }
    );

    /**
     * -----------------------------------------------------
     * Admin joins support conversation
     * -----------------------------------------------------
     */

    socket.on(
      "support:conversation:join",
      (
        { conversationId },
        acknowledgement
      ) => {
        /**
         * Only admin.
         */
        if (
          socket.data.supportIdentity
            .type !== "admin"
        ) {
          return acknowledgement({
            success: false,
            error:
              "Only admin can join support conversations",
          });
        }

        /**
         * Find conversation.
         *
         * IMPORTANT:
         * conversationStore
         * not SupportConversationStore.
         */
        const conversation =
          conversationStore.getById(
            conversationId
          );

        if (!conversation) {
          return acknowledgement({
            success: false,
            error:
              "Conversation not found",
          });
        }

        /**
         * Leave previous support
         * conversation rooms.
         *
         * This prevents an admin from
         * receiving messages from
         * multiple selected visitors.
         */
        for (
          const room of socket.rooms
        ) {
          if (
            room.startsWith(
              "support:conversation:"
            )
          ) {
            socket.leave(room);
          }
        }

        /**
         * Join selected conversation.
         */
        const room =
          getSupportRoom(
            conversation.id
          );

        socket.join(room);

        socket.data.supportConversationId =
          conversation.id;

        console.log(
          `Admin ${socket.data.supportIdentity.id} joined ${room}`
        );

        /**
         * Send previous messages
         * to admin.
         */
        socket.emit(
          "support:conversation:history",
          getSupportMessages(
            conversation.id
          )
        );

        /**
         * Acknowledge.
         */
        return acknowledgement({
          success: true,
        });
      }
    );

    /**
     * -----------------------------------------------------
     * Message
     * -----------------------------------------------------
     */

    socket.on(
      "message:send",
      (
        payload,
        acknowledgement
      ) => {
        const text =
          payload.text.trim();

        /**
         * Empty message.
         */
        if (!text) {
          return acknowledgement({
            success: false,
            error:
              "Message cannot be empty",
          });
        }

        const senderRole =
          supportIdentity.type ===
          "guest"
            ? "guest"
            : supportIdentity.type;

        /**
         * -------------------------------------------------
         * SUPPORT CHAT
         * -------------------------------------------------
         *
         * If conversationId exists,
         * this is a support message.
         */

        if (
          payload.conversationId
        ) {
          const conversation =
            conversationStore.getById(
              payload.conversationId
            );

          if (!conversation) {
            return acknowledgement({
              success: false,
              error:
                "Conversation not found",
            });
          }

          /**
           * Security:
           *
           * Customer can only send to
           * their own conversation.
           *
           * Admin can send to any conversation.
           */
          if (
            supportIdentity.type !==
              "admin" &&
            (
              conversation.customerId !==
                supportIdentity.id ||
              conversation.customerType !==
                supportIdentity.type
            )
          ) {
            return acknowledgement({
              success: false,
              error:
                "You cannot send to this conversation",
            });
          }

          /**
           * Create support message.
           */
          const message: ChatMessage = {
            id: randomUUID(),

            conversationId:
              conversation.id,

            senderId:
              supportIdentity.id,

            senderRole,

            text,

            createdAt:
              new Date().toISOString(),
          };

          /**
           * Save in temporary memory.
           */
          saveSupportMessage(message);

          /**
           * Send to everyone inside
           * this conversation.
           */
          const room =
            getSupportRoom(
              conversation.id
            );

          io.to(room).emit(
            "message:new",
            message
          );

          console.log(
            "Support message:",
            message
          );

          return acknowledgement({
            success: true,
            messageId: message.id,
          });
        }

        /**
         * -------------------------------------------------
         * TASK CHAT
         * -------------------------------------------------
         *
         * No conversationId means
         * Task Chat.
         */

        const isTaskParticipant =
          supportIdentity.id ===
            TASK_OWNER_ID ||
          supportIdentity.id ===
            TASKER_ID;

        if (!isTaskParticipant) {
          return acknowledgement({
            success: false,
            error:
              "You are not allowed to send a task message",
          });
        }

        const taskMessage: ChatMessage = {
          id: randomUUID(),

          conversationId:
            TASK_ROOM,

          senderId:
            supportIdentity.id,

          senderRole,

          text,

          createdAt:
            new Date().toISOString(),
        };

        /**
         * Send to Task room.
         */
        io.to(TASK_ROOM).emit(
          "message:new",
          taskMessage
        );

        console.log(
          "Task message:",
          taskMessage
        );

        return acknowledgement({
          success: true,
          messageId:
            taskMessage.id,
        });
      }
    );

    /**
     * -----------------------------------------------------
     * Notify admins about presence
     * -----------------------------------------------------
     */

    if (
      supportIdentity.type !==
      "admin"
    ) {
      io.sockets.sockets.forEach(
        (connectedSocket) => {
          const connectedIdentity =
            connectedSocket.data
              .supportIdentity;

          if (
            connectedIdentity?.type ===
            "admin"
          ) {
            connectedSocket.emit(
              "support:presence:update",
              presence
            );
          }
        }
      );
    }

    /**
     * -----------------------------------------------------
     * Disconnect
     * -----------------------------------------------------
     */

    socket.on(
      "disconnect",
      () => {
        const updatedPresence =
          presenceManager.removeConnection(
            supportIdentity,
            socket.id
          );

        console.log(
          `${supportIdentity.id} disconnected`
        );

        console.log(
          "Presence:",
          updatedPresence
        );

        /**
         * Notify admins.
         */
        if (
          supportIdentity.type !==
          "admin"
        ) {
          io.sockets.sockets.forEach(
            (connectedSocket) => {
              const connectedIdentity =
                connectedSocket.data
                  .supportIdentity;

              if (
                connectedIdentity?.type ===
                "admin"
              ) {
                connectedSocket.emit(
                  "support:presence:update",
                  updatedPresence
                );
              }
            }
          );
        }
      }
    );
  }
);

/**
 * ---------------------------------------------------------
 * Start server
 * ---------------------------------------------------------
 */

const PORT = 4000;

httpServer.listen(
  PORT,
  () => {
    console.log(
      `🚀 Chat server running on http://localhost:${PORT}`
    );
  }
);