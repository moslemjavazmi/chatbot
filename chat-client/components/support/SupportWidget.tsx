"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  supportSocket,
  SupportMessage,
  SupportConversation,
} from "@/lib/support-socket";

export default function SupportWidget() {
  /**
   * -------------------------------------------------------
   * UI state
   * -------------------------------------------------------
   */

  const [open, setOpen] =
    useState(false);

  const [message, setMessage] =
    useState("");

  /**
   * -------------------------------------------------------
   * Messages
   * -------------------------------------------------------
   */

  const [messages, setMessages] =
    useState<SupportMessage[]>([]);

  /**
   * -------------------------------------------------------
   * Conversation
   * -------------------------------------------------------
   */

  const [
    conversation,
    setConversation,
  ] =
    useState<SupportConversation | null>(
      null
    );

  /**
   * -------------------------------------------------------
   * Connection
   * -------------------------------------------------------
   */

  const [
    isConnected,
    setIsConnected,
  ] = useState(false);

  /**
   * -------------------------------------------------------
   * Socket lifecycle
   * -------------------------------------------------------
   */

  useEffect(() => {
    /**
     * IMPORTANT
     *
     * For now we are pretending that
     * this browser belongs to user-1.
     *
     * Later JWT will replace this.
     */

    supportSocket.auth = {
      userId: "user-1",
      role: "user",
    };

    /**
     * -----------------------------------------------------
     * Connected
     * -----------------------------------------------------
     */

    function handleConnect() {
      console.log(
        "Support connected:",
        supportSocket.id
      );

      setIsConnected(true);

      /**
       * Ask server for this user's
       * support conversation.
       */
      supportSocket.emit(
        "support:conversation:get",
        (response) => {
          if (!response.success) {
            console.error(
              "Conversation error:",
              response.error
            );

            return;
          }

          if (
            response.conversation
          ) {
            console.log(
              "Support conversation:",
              response.conversation
            );

            setConversation(
              response.conversation
            );
          }
        }
      );
    }

    /**
     * -----------------------------------------------------
     * Disconnected
     * -----------------------------------------------------
     */

    function handleDisconnect() {
      console.log(
        "Support disconnected"
      );

      setIsConnected(false);
    }

    /**
     * -----------------------------------------------------
     * Connection error
     * -----------------------------------------------------
     */

    function handleConnectError(
      error: Error
    ) {
      console.error(
        "Support connection error:",
        error.message
      );
    }

    /**
     * -----------------------------------------------------
     * Conversation history
     * -----------------------------------------------------
     */

    function handleConversationHistory(
      history: SupportMessage[]
    ) {
      console.log(
        "Support history:",
        history
      );

      setMessages(history);
    }

    /**
     * -----------------------------------------------------
     * New message
     * -----------------------------------------------------
     */

    function handleMessage(
      incomingMessage: SupportMessage
    ) {
      console.log(
        "Support new message:",
        incomingMessage
      );

      setMessages(
        (previousMessages) => {
          /**
           * If we already have this message,
           * don't add it again.
           */
          const alreadyExists =
            previousMessages.some(
              (existingMessage) =>
                existingMessage.id ===
                incomingMessage.id
            );

          if (alreadyExists) {
            return previousMessages;
          }

          /**
           * Ignore messages belonging
           * to another conversation.
           */
          if (
            conversation &&
            incomingMessage.conversationId !==
              conversation.id
          ) {
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
     * -----------------------------------------------------
     * Register listeners
     * -----------------------------------------------------
     */

    supportSocket.on(
      "connect",
      handleConnect
    );

    supportSocket.on(
      "disconnect",
      handleDisconnect
    );

    supportSocket.on(
      "connect_error",
      handleConnectError
    );

    supportSocket.on(
      "support:conversation:history",
      handleConversationHistory
    );

    supportSocket.on(
      "message:new",
      handleMessage
    );

    /**
     * -----------------------------------------------------
     * Connect
     * -----------------------------------------------------
     */

    supportSocket.connect();

    /**
     * -----------------------------------------------------
     * Cleanup
     * -----------------------------------------------------
     */

    return () => {
      supportSocket.off(
        "connect",
        handleConnect
      );

      supportSocket.off(
        "disconnect",
        handleDisconnect
      );

      supportSocket.off(
        "connect_error",
        handleConnectError
      );

      supportSocket.off(
        "support:conversation:history",
        handleConversationHistory
      );

      supportSocket.off(
        "message:new",
        handleMessage
      );

      supportSocket.disconnect();
    };
  }, []);

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
     * Validation
     */
    if (
      !text ||
      !isConnected ||
      !conversation
    ) {
      return;
    }

    /**
     * Send message to server.
     */
    supportSocket.emit(
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
          "Message sent:",
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
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 flex h-[500px] w-[350px] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl">

          {/* --------------------------------------------- */}
          {/* Header */}
          {/* --------------------------------------------- */}

          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="font-semibold">
                Support
              </h2>

              <p className="text-xs text-gray-500">
                {isConnected
                  ? "Online"
                  : "Connecting..."}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setOpen(false)
              }
              className="text-gray-500"
            >
              ×
            </button>
          </div>

          {/* --------------------------------------------- */}
          {/* Messages */}
          {/* --------------------------------------------- */}

          <div className="flex-1 space-y-3 overflow-y-auto p-4">

            {messages.length ===
            0 ? (
              <p className="text-sm text-gray-400">
                How can we help you?
              </p>
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
                          ? "justify-start"
                          : "justify-end"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          isAdmin
                            ? "bg-gray-100"
                            : "bg-black text-white"
                        }`}
                      >
                        <p className="text-xs opacity-60">
                          {
                            item.senderRole
                          }
                        </p>

                        <p className="mt-1">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* --------------------------------------------- */}
          {/* Input */}
          {/* --------------------------------------------- */}

          <form
            onSubmit={
              handleSubmit
            }
            className="flex gap-2 border-t p-3"
          >
            <input
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Write a message..."
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 outline-none"
            />

            <button
              type="submit"
              disabled={
                !isConnected ||
                !conversation ||
                !message.trim()
              }
              className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* ----------------------------------------------- */}
      {/* Floating button */}
      {/* ----------------------------------------------- */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (value) => !value
          )
        }
        className="flex h-14 w-14 items-center justify-center rounded-full bg-black text-xl text-white shadow-lg"
      >
        💬
      </button>
    </div>
  );
}