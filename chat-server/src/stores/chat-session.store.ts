import { randomUUID } from "node:crypto";

import {
  ChatParticipant,
  ChatSession,
} from "../types/socket";

export class ChatSessionStore {
  private sessions = new Map<
    string,
    ChatSession
  >();

  getById(
    sessionId: string
  ): ChatSession | undefined {
    return this.sessions.get(
      sessionId
    );
  }

  getByTaskId(
    taskId: string
  ): ChatSession | undefined {
    return Array.from(
      this.sessions.values()
    ).find(
      (session) =>
        session.taskId === taskId
    );
  }

  create(
    taskId: string,
    participants: ChatParticipant[]
  ): ChatSession {
    const existing =
      this.getByTaskId(taskId);

    if (existing) {
      return existing;
    }

    const now =
      new Date().toISOString();

    const session: ChatSession = {
      id: `chat-session-${randomUUID()}`,

      type: "task",

      taskId,

      participants,

      status: "active",

      createdAt: now,

      updatedAt: now,
    };

    this.sessions.set(
      session.id,
      session
    );

    return session;
  }

  close(
    sessionId: string
  ): ChatSession | undefined {
    const session =
      this.sessions.get(
        sessionId
      );

    if (!session) {
      return undefined;
    }

    session.status = "closed";

    session.updatedAt =
      new Date().toISOString();

    return session;
  }

  getAll(): ChatSession[] {
    return Array.from(
      this.sessions.values()
    );
  }
}