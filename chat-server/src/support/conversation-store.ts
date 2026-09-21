import { randomUUID } from "node:crypto";

import {
  SupportConversation,
  SupportIdentity,
} from "../types/socket";

export class SupportConversationStore {
  private conversations = new Map<
    string,
    SupportConversation
  >();

  /**
   * Get existing conversation for a customer
   * or create a new one.
   */
  getOrCreate(
    identity: SupportIdentity
  ): SupportConversation {
    /**
     * Admin does not have a customer conversation.
     */
    if (identity.type === "admin") {
      throw new Error(
        "Admin cannot have a customer support conversation"
      );
    }

    const existing =
      Array.from(
        this.conversations.values()
      ).find(
        (conversation) =>
          conversation.customerId ===
            identity.id &&
          conversation.customerType ===
            identity.type
      );

    if (existing) {
      return existing;
    }

    const conversation: SupportConversation = {
      id: `support-conv-${randomUUID()}`,

      customerId: identity.id,

      customerType: identity.type,
    };

    this.conversations.set(
      conversation.id,
      conversation
    );

    return conversation;
  }

  /**
   * Find conversation by ID.
   */
  getById(
    conversationId: string
  ): SupportConversation | undefined {
    return this.conversations.get(
      conversationId
    );
  }

  /**
   * Get all conversations.
   */
  getAll(): SupportConversation[] {
    return Array.from(
      this.conversations.values()
    );
  }

  /**
   * Find conversation by customer ID/type.
   */
  getByCustomer(
    customerId: string,
    customerType:
      | "user"
      | "tasker"
      | "guest"
  ): SupportConversation | undefined {
    return Array.from(
      this.conversations.values()
    ).find(
      (conversation) =>
        conversation.customerId ===
          customerId &&
        conversation.customerType ===
          customerType
    );
  }
}