import {
  Collection,
} from "mongodb";

import {
  ChatSession,
} from "../types/socket";

import {
  getMongoDB,
} from "../database/mongodb";

export class ChatSessionRepository {
  private get collection(): Collection<ChatSession> {
    return getMongoDB().collection<ChatSession>(
      "chat_sessions"
    );
  }

  /**
   * -------------------------------------------------------
   * Create
   * -------------------------------------------------------
   */

  async create(
    session: ChatSession
  ): Promise<void> {
    await this.collection.insertOne(
      session
    );
  }

  /**
   * -------------------------------------------------------
   * Indexes
   * -------------------------------------------------------
   */

  async createIndexes(): Promise<void> {
    /**
     * A task should have only one
     * chat session.
     */
    await this.collection.createIndex(
      {
        taskId: 1,
      },
      {
        unique: true,
        name: "taskId_unique",
      }
    );

    /**
     * Useful when querying active
     * sessions.
     */
    await this.collection.createIndex(
      {
        taskId: 1,
        status: 1,
      },
      {
        name:
          "taskId_status",
      }
    );
  }

  /**
   * -------------------------------------------------------
   * Find by ID
   * -------------------------------------------------------
   */

  async findById(
    sessionId: string
  ): Promise<ChatSession | null> {
    return this.collection.findOne({
      id: sessionId,
    });
  }

  /**
   * -------------------------------------------------------
   * Find by Task
   * -------------------------------------------------------
   */

  async findByTaskId(
    taskId: string
  ): Promise<ChatSession | null> {
    return this.collection.findOne({
      taskId,
    });
  }

  /**
   * -------------------------------------------------------
   * Find active session
   * -------------------------------------------------------
   */

  async findActiveByTaskId(
    taskId: string
  ): Promise<ChatSession | null> {
    return this.collection.findOne({
      taskId,
      status: "active",
    });
  }

  /**
   * -------------------------------------------------------
   * Close
   * -------------------------------------------------------
   */

  async close(
    sessionId: string
  ): Promise<void> {
    await this.collection.updateOne(
      {
        id: sessionId,
      },
      {
        $set: {
          status: "closed",
          updatedAt:
            new Date().toISOString(),
        },
      }
    );
  }
}