import {
  Collection,
} from "mongodb";

import {
  SupportConversation,
} from "../types/socket";

import {
  getMongoDB,
} from "../database/mongodb";

export class SupportConversationRepository {
  private get collection(): Collection<SupportConversation> {
    return getMongoDB().collection<SupportConversation>(
      "support_conversations"
    );
  }

  /**
   * -------------------------------------------------------
   * Indexes
   * -------------------------------------------------------
   */

  async createIndexes(): Promise<void> {
    await this.collection.createIndex(
      {
        customerId: 1,
        customerType: 1,
      },
      {
        unique: true,
        name:
          "customer_unique",
      }
    );
  }

  /**
   * -------------------------------------------------------
   * Create
   * -------------------------------------------------------
   */

  async create(
    conversation: SupportConversation
  ): Promise<void> {
    await this.collection.insertOne(
      conversation
    );
  }

  /**
   * -------------------------------------------------------
   * Find by ID
   * -------------------------------------------------------
   */

  async findById(
    conversationId: string
  ): Promise<SupportConversation | null> {
    return this.collection.findOne({
      id: conversationId,
    });
  }

  /**
   * -------------------------------------------------------
   * Find by customer
   * -------------------------------------------------------
   */

  async findByCustomer(
    customerId: string,
    customerType:
      | "user"
      | "tasker"
      | "guest"
  ): Promise<SupportConversation | null> {
    return this.collection.findOne({
      customerId,
      customerType,
    });
  }
}