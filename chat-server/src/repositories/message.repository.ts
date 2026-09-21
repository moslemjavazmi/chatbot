import { Collection } from "mongodb";

import {
  ChatMessage,
} from "../types/socket";

import {
  getMongoDB,
} from "../database/mongodb";

export class MessageRepository {
  private get collection(): Collection<ChatMessage> {
    return getMongoDB().collection<ChatMessage>(
      "messages"
    );
  }

  /**
   * -------------------------------------------------------
   * Create
   * -------------------------------------------------------
   */

  async create(
    message: ChatMessage
  ): Promise<void> {
    await this.collection.insertOne(
      message
    );
  }

  /**
   * -------------------------------------------------------
   * Create indexes
   * -------------------------------------------------------
   */

  async createIndexes(): Promise<void> {
    await this.collection.createIndex(
      {
        conversationId: 1,
        createdAt: 1,
        id: 1,
      },
      {
        name:
          "conversation_createdAt_id",
      }
    );
  }

  /**
   * -------------------------------------------------------
   * Get conversation history
   * -------------------------------------------------------
   *
   * Current simple version.
   *
   * Pagination will be added in the
   * next method.
   */

  async findByConversationId(
    conversationId: string
  ): Promise<ChatMessage[]> {
    return this.collection
      .find({
        conversationId,
      })
      .sort({
        createdAt: 1,
        id: 1,
      })
      .toArray();
  }

  async findPage(
  conversationId: string,
  limit: number = 50,
  before?: {
    createdAt: string;
    id: string;
  }
): Promise<ChatMessage[]> {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    100
  );

  const query: any = {
    conversationId,
  };

  /**
   * If cursor exists,
   * fetch older messages.
   */
  if (before) {
    query.$or = [
      {
        createdAt: {
          $lt: before.createdAt,
        },
      },
      {
        createdAt:
          before.createdAt,
        id: {
          $lt: before.id,
        },
      },
    ];
  }

  const messages =
    await this.collection
      .find(query)
      .sort({
        createdAt: -1,
        id: -1,
      })
      .limit(safeLimit)
      .toArray();

  /**
   * Database returns newest -> oldest.
   *
   * UI wants oldest -> newest.
   */
  return messages.reverse();
}
}