"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  adminSocket,
  SupportConversation,
  SupportMessage,
} from "@/lib/admin-socket";

/**
 * ---------------------------------------------------------
 * Presence
 * ---------------------------------------------------------
 */

interface SupportPresence {
  id: string;

  type:
    | "user"
    | "tasker"
    | "guest"
    | "admin";

  online: boolean;

  lastSeen: string | null;
}

/**
 * ---------------------------------------------------------
 * Admin Page
 * ---------------------------------------------------------
 */

export default function AdminPage() {
  /**
   * Visitors
   */
  const [identities, setIdentities] =
    useState<SupportPresence[]>(
      []
    );

  /**
   * Selected visitor
   */
  const [selectedVisitor, setSelectedVisitor] =
    useState<SupportPresence | null>(
      null
    );

  /**
   * Selected conversation
   */
  const [conversation, setConversation] =
    useState<SupportConversation | null>(
      null
    );



    const conversationIdRef =
  useRef<string | null>(null);
  /**
   * Messages
   */
  const [messages, setMessages] =
    useState<SupportMessage[]>(
      []
    );

  /**
   * Input
   */
  const [message, setMessage] =
    useState("");

  /**
   * Connection
   */
  const [isConnected, setIsConnected] =
    useState(false);

  /**
   * Loading conversation
   */
  const [isLoadingConversation, setIsLoadingConversation] =
    useState(false);

  /**
   * -------------------------------------------------------
   * Socket lifecycle
   * -------------------------------------------------------
   */

useEffect(() => {
  /**
   * Socket connected
   */
  function handleConnect() {
    console.log(
      "Admin connected:",
      adminSocket.id
    );

    setIsConnected(true);
  }

  /**
   * Socket disconnected
   */
  function handleDisconnect() {
    console.log(
      "Admin disconnected"
    );

    setIsConnected(false);
  }

  /**
   * Connection error
   */
  function handleConnectError(
    error: Error
  ) {
    console.error(
      "Admin connection error:",
      error.message
    );
  }

  /**
   * Presence list
   */
  function handlePresenceList(
    identities: SupportPresence[]
  ) {
    console.log(
      "Presence list:",
      identities
    );

    setIdentities(identities);
  }

  /**
   * Presence update
   */
  function handlePresenceUpdate(
    presence: SupportPresence
  ) {
    console.log(
      "Presence update:",
      presence
    );

    setIdentities(
      (previousIdentities) => {
        const existing =
          previousIdentities.find(
            (identity) =>
              identity.id ===
                presence.id &&
              identity.type ===
                presence.type
          );

        if (!existing) {
          return [
            ...previousIdentities,
            presence,
          ];
        }

        return previousIdentities.map(
          (identity) =>
            identity.id ===
                presence.id &&
              identity.type ===
                presence.type
              ? presence
              : identity
        );
      }
    );
  }

  /**
   * Conversation history
   */
  function handleConversationHistory(
    history: SupportMessage[]
  ) {
    console.log(
      "Conversation history:",
      history
    );

    const currentConversationId =
      conversationIdRef.current;

    /**
     * Only accept history for
     * the currently selected conversation.
     */
    const filteredHistory =
      history.filter(
        (item) =>
          item.conversationId ===
          currentConversationId
      );

    setMessages(filteredHistory);
  }

  /**
   * New message
   */
  function handleNewMessage(
    incomingMessage: SupportMessage
  ) {
    console.log(
      "Admin received message:",
      incomingMessage
    );

    const currentConversationId =
      conversationIdRef.current;

    /**
     * Ignore messages belonging
     * to another conversation.
     */
    if (
      currentConversationId !==
      incomingMessage.conversationId
    ) {
      return;
    }

    setMessages(
      (previousMessages) => {
        const alreadyExists =
          previousMessages.some(
            (existingMessage) =>
              existingMessage.id ===
              incomingMessage.id
          );

        if (alreadyExists) {
          return previousMessages;
        }

        return [
          ...previousMessages,
          incomingMessage,
        ];
      }
    );
  }

  /**
   * Register events
   */
  adminSocket.on(
    "connect",
    handleConnect
  );

  adminSocket.on(
    "disconnect",
    handleDisconnect
  );

  adminSocket.on(
    "connect_error",
    handleConnectError
  );

  adminSocket.on(
    "support:presence:list",
    handlePresenceList
  );

  adminSocket.on(
    "support:presence:update",
    handlePresenceUpdate
  );

  adminSocket.on(
    "support:conversation:history",
    handleConversationHistory
  );

  adminSocket.on(
    "message:new",
    handleNewMessage
  );

  /**
   * Temporary admin identity.
   */
  adminSocket.auth = {
    userId: "admin-1",
    role: "admin",
  };

  /**
   * Connect only once.
   */
  adminSocket.connect();

  /**
   * Cleanup only when
   * AdminPage is unmounted.
   */
  return () => {
    adminSocket.off(
      "connect",
      handleConnect
    );

    adminSocket.off(
      "disconnect",
      handleDisconnect
    );

    adminSocket.off(
      "connect_error",
      handleConnectError
    );

    adminSocket.off(
      "support:presence:list",
      handlePresenceList
    );

    adminSocket.off(
      "support:presence:update",
      handlePresenceUpdate
    );

    adminSocket.off(
      "support:conversation:history",
      handleConversationHistory
    );

    adminSocket.off(
      "message:new",
      handleNewMessage
    );

    adminSocket.disconnect();
  };
}, []);

  /**
   * -------------------------------------------------------
   * Visitor click
   * -------------------------------------------------------
   */

function handleVisitorClick(
  identity: SupportPresence
) {
  /**
   * Admin cannot have
   * customer support conversation.
   */
  if (
    identity.type === "admin"
  ) {
    return;
  }

  /**
   * Start loading.
   */
  setIsLoadingConversation(
    true
  );

  /**
   * Clear previous messages.
   */
  setMessages([]);

  /**
   * Get customer's conversation.
   */
  adminSocket.emit(
    "support:conversation:get-by-customer",
    {
      customerId:
        identity.id,

      customerType:
        identity.type,
    },
    (response) => {
      /**
       * Stop loading.
       */
      setIsLoadingConversation(
        false
      );

      /**
       * Error.
       */
      if (!response.success) {
        console.error(
          response.error
        );

        return;
      }

      /**
       * Conversation not found.
       */
      if (
        !response.conversation
      ) {
        console.error(
          "Conversation not found"
        );

        return;
      }

      const selectedConversation =
        response.conversation;

      console.log(
        "Customer conversation:",
        selectedConversation
      );

      /**
       * Set selected visitor.
       */
      setSelectedVisitor(
        identity
      );

      /**
       * IMPORTANT:
       * Update ref immediately.
       */
      conversationIdRef.current =
        selectedConversation.id;

      /**
       * Update React state.
       */
      setConversation(
        selectedConversation
      );

      /**
       * Join conversation.
       */
      adminSocket.emit(
        "support:conversation:join",
        {
          conversationId:
            selectedConversation.id,
        },
        (joinResponse) => {
          if (
            !joinResponse.success
          ) {
            console.error(
              joinResponse.error
            );

            return;
          }

          console.log(
            "Admin joined conversation:",
            selectedConversation.id
          );
        }
      );
    }
  );
}

  /**
   * -------------------------------------------------------
   * Send message
   * -------------------------------------------------------
   */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text =
      message.trim();

    /**
     * Validation.
     */
    if (
      !text ||
      !conversation ||
      !isConnected
    ) {
      return;
    }

    /**
     * Send support message.
     */
    adminSocket.emit(
      "message:send",
      {
        text,

        conversationId:
          conversation.id,
      },
      (response) => {
        if (
          !response.success
        ) {
          console.error(
            "Message failed:",
            response.error
          );

          return;
        }

        console.log(
          "Admin message sent:",
          response.messageId
        );
      }
    );

    /**
     * Clear input.
     */
    setMessage("");
  }

  /**
   * -------------------------------------------------------
   * Render
   * -------------------------------------------------------
   */

  return (
    <main className="min-h-screen bg-gray-100 p-8 text-black">
      <div className="mx-auto max-w-7xl">
        {/* ------------------------------------------------ */}
        {/* Header */}
        {/* ------------------------------------------------ */}

        <div className="mb-8 rounded-xl bg-white p-6 shadow">
          <h1 className="text-2xl font-bold">
            Support Dashboard
          </h1>

          <p className="mt-2 text-sm">
            Admin:{" "}
            <strong>
              admin-1
            </strong>
          </p>

          <p className="mt-2 text-sm">
            Status:{" "}
            <span
              className={
                isConnected
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {isConnected
                ? "Connected"
                : "Disconnected"}
            </span>
          </p>
        </div>

        {/* ------------------------------------------------ */}
        {/* Main layout */}
        {/* ------------------------------------------------ */}

        <div className="grid gap-6 lg:grid-cols-[350px_1fr]">
          {/* ---------------------------------------------- */}
          {/* Visitors */}
          {/* ---------------------------------------------- */}

          <div className="rounded-xl bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold">
              Visitors
            </h2>

            {identities.length ===
            0 ? (
              <p className="text-sm text-gray-500">
                No visitors.
              </p>
            ) : (
              <div className="space-y-3">
                {identities.map(
                  (identity) => {
                    const isSelected =
                      selectedVisitor
                        ?.id ===
                        identity.id &&
                      selectedVisitor
                        ?.type ===
                        identity.type;

                    return (
                      <button
                        key={`${identity.type}:${identity.id}`}
                        type="button"
                        onClick={() =>
                          handleVisitorClick(
                            identity
                          )
                        }
                        className={`w-full rounded-lg border p-4 text-left transition ${
                          isSelected
                            ? "border-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {identity.id}
                            </p>

                            <p className="text-sm text-gray-500">
                              Type:{" "}
                              {
                                identity.type
                              }
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`h-3 w-3 rounded-full ${
                                identity.online
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />

                            <span className="text-xs">
                              {identity.online
                                ? "Online"
                                : "Offline"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* ---------------------------------------------- */}
          {/* Conversation */}
          {/* ---------------------------------------------- */}

          <div className="flex min-h-[600px] flex-col rounded-xl bg-white shadow">
            {/* Conversation header */}
            <div className="border-b p-6">
              {!selectedVisitor ? (
                <div>
                  <h2 className="text-lg font-semibold">
                    Support Conversation
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Select a visitor to open
                    their conversation.
                  </p>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedVisitor.id}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Type:{" "}
                    {
                      selectedVisitor.type
                    }
                  </p>

                  {conversation && (
                    <p className="mt-1 text-xs text-gray-400">
                      Conversation:{" "}
                      {conversation.id}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto p-6">
              {!selectedVisitor ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-500">
                    Select a visitor.
                  </p>
                </div>
              ) : isLoadingConversation ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-500">
                    Loading conversation...
                  </p>
                </div>
              ) : messages.length ===
                0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-gray-500">
                    No messages yet.
                  </p>
                </div>
              ) : (
                messages.map(
                  (item) => {
                    const isAdmin =
                      item.senderRole ===
                      "admin";

                    return (
                      <div
                        key={item.id}
                        className={`flex ${
                          isAdmin
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[75%] rounded-xl px-4 py-3 ${
                            isAdmin
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <p className="mb-1 text-xs opacity-70">
                            {item.senderRole}
                          </p>

                          <p className="break-words text-sm">
                            {item.text}
                          </p>

                          <p className="mt-1 text-[10px] opacity-60">
                            {new Date(
                              item.createdAt
                            ).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>

            {/* Message input */}
            {conversation && (
              <form
                onSubmit={
                  handleSubmit
                }
                className="border-t p-4"
              >
                <div className="flex gap-3">
                  <input
                    value={message}
                    onChange={(event) =>
                      setMessage(
                        event.target.value
                      )
                    }
                    placeholder="Type a message..."
                    className="flex-1 rounded-lg border px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />

                  <button
                    type="submit"
                    disabled={
                      !isConnected ||
                      !message.trim()
                    }
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}