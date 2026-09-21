import express from "express";
import cors from "cors";

import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { Server } from "socket.io";

import {
  connectMongoDB,
} from "./database/mongodb";

import {
  ChatSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  UserRole,
  SupportIdentity,
  ChatMessage,
  ChatSession,
} from "./types/socket";

import {
  SupportConversationStore,
} from "./support/conversation-store";

import {
  PresenceManager,
} from "./presence/presence-manager";

import {
  MessageRepository,
} from "./repositories/message.repository";

import {
  ChatSessionRepository,
} from "./repositories/chat-session.repository";

import {
  SupportConversationRepository,
} from "./repositories/SupportConversationRepository";
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

app.get(
  "/health",
  (_req, res) => {
    res.json({
      status: "ok",
    });
  }
);

app.get(
  "/",
  (_req, res) => {
    res.json({
      message:
        "Chat server is running",
    });
  }
);

/**
 * ---------------------------------------------------------
 * Temporary fixed identities
 * ---------------------------------------------------------
 *
 * These are temporary.
 *
 * Later:
 * JWT will replace this.
 */

const TASK_ID = "101";

const TASK_OWNER_ID =
  "user-1";

const TASKER_ID =
  "tasker-1";

const ADMIN_ID =
  "admin-1";

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
 * Managers / Repositories
 * ---------------------------------------------------------
 */

const presenceManager =
  new PresenceManager();

const conversationStore =
  new SupportConversationStore();

const messageRepository =
  new MessageRepository();

const sessionRepository =
  new ChatSessionRepository();



const supportConversationRepository =
  new SupportConversationRepository();
/**
 * ---------------------------------------------------------
 * Current temporary Task Chat Session
 * ---------------------------------------------------------
 *
 * MongoDB is the source of truth.
 *
 * This variable only keeps the current
 * session in memory after server startup.
 */

let taskChatSession:
  | ChatSession
  | null = null;

/**
 * ---------------------------------------------------------
 * Task Chat Room
 * ---------------------------------------------------------
 */

function getTaskChatRoom(
  sessionId: string
) {
  return `chat:session:${sessionId}`;
}

/**
 * ---------------------------------------------------------
 * Support Chat Room
 * ---------------------------------------------------------
 */

function getSupportRoom(
  conversationId: string
) {
  return `support:conversation:${conversationId}`;
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

io.use(
  (socket, next) => {
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
        typeof anonymousId !==
          "string" ||
        !anonymousId.startsWith(
          "guest-"
        )
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

    socket.data.user =
      user;

    socket.data.supportIdentity = {
      id: user.id,
      type: user.role,
    };

    console.log(
      "Authenticated:",
      socket.data.supportIdentity
    );

    next();
  }
);

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
     * Only participants can join.
     */

    if (taskChatSession) {
      const isTaskParticipant =
        taskChatSession.participants.some(
          (participant) =>
            participant.id ===
              supportIdentity.id &&
            participant.role ===
              supportIdentity.type
        );

      if (isTaskParticipant) {
        const taskChatRoom =
          getTaskChatRoom(
            taskChatSession.id
          );

        socket.join(
          taskChatRoom
        );

        console.log(
          `${supportIdentity.id} joined ${taskChatRoom}`
        );

        /**
         * -------------------------------------------------
         * Task Chat History
         * -------------------------------------------------
         */

        void messageRepository
          .findByConversationId(
            taskChatSession.id
          )
          .then(
            (messages) => {
              socket.emit(
                "task:history",
                messages
              );
            }
          )
          .catch(
            (error) => {
              console.error(
                "Failed to load task history:",
                error
              );
            }
          );
      }
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
      async (
        acknowledgement
      ) => {
        const identity =
          socket.data.supportIdentity;

        /**
         * Admin cannot create
         * customer conversation.
         */

        if (
          identity.type ===
          "admin"
        ) {
          return acknowledgement({
            success: false,
            error:
              "Admin cannot create a customer conversation",
          });
        }

        /**
         * Get/create conversation.
         *
         * NOTE:
         * Conversation metadata is still
         * temporarily stored in memory.
         *
         * Later this will move to MongoDB.
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

        socket.data.supportConversationId =
          conversation.id;

        console.log(
          `${identity.id} joined ${room}`
        );

        /**
         * Load history from MongoDB.
         */

        try {
          const messages =
            await messageRepository
              .findByConversationId(
                conversation.id
              );

          socket.emit(
            "support:conversation:history",
            messages
          );
        } catch (error) {
          console.error(
            "Failed to load support history:",
            error
          );

          return acknowledgement({
            success: false,
            error:
              "Failed to load conversation history",
          });
        }

        /**
         * Acknowledge.
         */

        return acknowledgement({
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
         * Try to find existing
         * conversation.
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
      async (
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
         * Load history from MongoDB.
         */

        try {
          const messages =
            await messageRepository
              .findByConversationId(
                conversation.id
              );

          socket.emit(
            "support:conversation:history",
            messages
          );
        } catch (error) {
          console.error(
            "Failed to load support history:",
            error
          );

          return acknowledgement({
            success: false,
            error:
              "Failed to load conversation history",
          });
        }

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
      async (
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
         * conversationId exists
         * => Support Chat
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
           * Customer can only send
           * to their own conversation.
           *
           * Admin can send to any
           * conversation.
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

          const message:
            ChatMessage = {
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
           * Persist in MongoDB.
           */

          try {
            await messageRepository.create(
              message
            );
          } catch (error) {
            console.error(
              "Failed to save support message:",
              error
            );

            return acknowledgement({
              success: false,
              error:
                "Failed to save message",
            });
          }

          /**
           * Send to everyone
           * inside conversation.
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
            messageId:
              message.id,
          });
        }

        /**
         * -------------------------------------------------
         * TASK CHAT
         * -------------------------------------------------
         *
         * No conversationId
         * => Task Chat
         */

        if (!taskChatSession) {
          return acknowledgement({
            success: false,
            error:
              "Task chat session not found",
          });
        }

        /**
         * Check participant.
         */

        const participant =
          taskChatSession.participants.some(
            (participant) =>
              participant.id ===
                supportIdentity.id &&
              participant.role ===
                supportIdentity.type
          );

        if (!participant) {
          return acknowledgement({
            success: false,
            error:
              "You are not a participant of this chat",
          });
        }

        /**
         * Session must be active.
         */

        if (
          taskChatSession.status !==
          "active"
        ) {
          return acknowledgement({
            success: false,
            error:
              "Task chat session is closed",
          });
        }

        /**
         * Task Chat room.
         */

        const taskChatRoom =
          getTaskChatRoom(
            taskChatSession.id
          );

        /**
         * Create Task message.
         */

        const taskMessage:
          ChatMessage = {
            id: randomUUID(),

            conversationId:
              taskChatSession.id,

            senderId:
              supportIdentity.id,

            senderRole,

            text,

            createdAt:
              new Date().toISOString(),
          };

        /**
         * Persist Task message
         * in MongoDB.
         */

        try {
          await messageRepository.create(
            taskMessage
          );
        } catch (error) {
          console.error(
            "Failed to save task message:",
            error
          );

          return acknowledgement({
            success: false,
            error:
              "Failed to save message",
          });
        }

        /**
         * Send Task message
         * to Task Chat room.
         */

        io.to(taskChatRoom).emit(
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

async function startServer() {
  try {
    /**
     * Connect MongoDB first.
     */

    await connectMongoDB();



    await messageRepository.createIndexes();

    await sessionRepository.createIndexes();

     await supportConversationRepository
    .createIndexes();
    /**
     * -----------------------------------------------------
     * Load existing Task Chat Session
     * -----------------------------------------------------
     */

    taskChatSession =
      await sessionRepository.findByTaskId(
        TASK_ID
      );

    /**
     * -----------------------------------------------------
     * Create Task Chat Session
     * if it does not exist.
     *
     * Later Kafka will do this.
     * -----------------------------------------------------
     */

    if (!taskChatSession) {
      const now =
        new Date().toISOString();

      taskChatSession = {
        id: `chat-session-${randomUUID()}`,

        type: "task",

        taskId: TASK_ID,

        participants: [
          {
            id: TASK_OWNER_ID,
            role: "user",
          },
          {
            id: TASKER_ID,
            role: "tasker",
          },
        ],

        status: "active",

        createdAt: now,

        updatedAt: now,
      };

      await sessionRepository.create(
        taskChatSession
      );

      console.log(
        "💾 New Task Chat Session created:",
        taskChatSession
      );
    } else {
      console.log(
        "💾 Existing Task Chat Session loaded:",
        taskChatSession
      );
    }

    /**
     * -----------------------------------------------------
     * Start HTTP + Socket.IO server
     * -----------------------------------------------------
     */

    httpServer.listen(
      PORT,
      () => {
        console.log(
          `🚀 Chat server running on http://localhost:${PORT}`
        );
      }
    );
  } catch (error) {
    console.error(
      "❌ Failed to start server:",
      error
    );

    process.exit(1);
  }
}

startServer();