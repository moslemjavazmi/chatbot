
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  socket,
  ChatMessage,
} from "@/lib/socket";

/**
 * ---------------------------------------------------------
 * Temporary Current User
 * ---------------------------------------------------------
 *
 * Later this will come from JWT / auth store.
 */

const CURRENT_USER = {
  id: "tasker-1",
  role: "tasker" as const,
};

/**
 * ---------------------------------------------------------
 * Task
 * ---------------------------------------------------------
 */

const TASK_ID = "101";

export default function Home() {
  const [isConnected, setIsConnected] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  /**
   * -------------------------------------------------------
   * Socket lifecycle
   * -------------------------------------------------------
   */

  useEffect(() => {
    function handleConnect() {
      console.log(
        "Task socket connected:",
        socket.id
      );

      setIsConnected(true);
    }

    function handleDisconnect() {
      console.log(
        "Task socket disconnected"
      );

      setIsConnected(false);
    }

    function handleConnectError(
      error: Error
    ) {
      console.error(
        "Task socket connection error:",
        error.message
      );

      setIsConnected(false);
    }

    /**
     * -----------------------------------------------------
     * New real-time message
     * -----------------------------------------------------
     */

    function handleNewMessage(
      incomingMessage: ChatMessage
    ) {
      console.log(
        "TASK MESSAGE RECEIVED:",
        incomingMessage
      );

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
     * -----------------------------------------------------
     * Task history
     * -----------------------------------------------------
     */

    function handleTaskHistory(
      history: ChatMessage[]
    ) {
      console.log(
        "TASK HISTORY RECEIVED:",
        history
      );

      /**
       * Remove possible duplicates.
       */
      const uniqueMessages =
        history.filter(
          (
            message,
            index,
            array
          ) =>
            array.findIndex(
              (item) =>
                item.id === message.id
            ) === index
        );

      setMessages(uniqueMessages);
    }

    /**
     * -----------------------------------------------------
     * Register listeners
     * -----------------------------------------------------
     */

    socket.on(
      "connect",
      handleConnect
    );

    socket.on(
      "disconnect",
      handleDisconnect
    );

    socket.on(
      "connect_error",
      handleConnectError
    );

    socket.on(
      "message:new",
      handleNewMessage
    );

    socket.on(
      "task:history",
      handleTaskHistory
    );

    /**
     * -----------------------------------------------------
     * Temporary authentication
     * -----------------------------------------------------
     */

    socket.auth = {
      userId: CURRENT_USER.id,
      role: CURRENT_USER.role,
    };

    /**
     * -----------------------------------------------------
     * Connect
     * -----------------------------------------------------
     */

    socket.connect();

    /**
     * -----------------------------------------------------
     * Cleanup
     * -----------------------------------------------------
     */

    return () => {
      socket.off(
        "connect",
        handleConnect
      );

      socket.off(
        "disconnect",
        handleDisconnect
      );

      socket.off(
        "connect_error",
        handleConnectError
      );

      socket.off(
        "message:new",
        handleNewMessage
      );

      socket.off(
        "task:history",
        handleTaskHistory
      );

      socket.disconnect();
    };
  }, []);

  /**
   * ---------------------------------------------------------
   * Send message
   * ---------------------------------------------------------
   */

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text =
      message.trim();

    if (
      !text ||
      !isConnected
    ) {
      return;
    }

    socket.emit(
      "message:send",
      {
        text,
      },
      (response) => {
        if (!response.success) {
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

    setMessage("");
  }

  /**
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="flex w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow">

        {/* Header */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Task Chat
          </h1>

          <div className="mt-3 rounded-lg bg-gray-100 p-3">
            <p className="text-sm">
              Task ID:{" "}
              <strong>
                {TASK_ID}
              </strong>
            </p>

            <p className="text-sm">
              User ID:{" "}
              <strong>
                {CURRENT_USER.id}
              </strong>
            </p>

            <p className="text-sm">
              Role:{" "}
              <strong>
                {CURRENT_USER.role}
              </strong>
            </p>
          </div>

          <p className="mt-3 text-sm">
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

        {/* Messages */}

        <div className="mb-6 flex min-h-64 flex-col gap-3 overflow-y-auto rounded-lg border p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">
              No messages yet.
            </p>
          ) : (
            messages.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-gray-100 p-3"
                >
                  <p className="text-xs text-gray-500">
                    {item.senderId} (
                    {
                      item.senderRole
                    })
                  </p>

                  <p className="mt-1">
                    {item.text}
                  </p>

                  <p className="mt-1 text-[10px] text-gray-400">
                    {new Date(
                      item.createdAt
                    ).toLocaleTimeString()}
                  </p>
                </div>
              )
            )
          )}
        </div>

        {/* Input */}

        <form
          onSubmit={
            handleSubmit
          }
          className="flex gap-2"
        >
          <input
            type="text"
            value={message}
            onChange={(event) =>
              setMessage(
                event.target.value
              )
            }
            placeholder="Write a message..."
            className="flex-1 rounded-lg border px-4 py-3 outline-none"
          />

          <button
            type="submit"
            disabled={
              !isConnected ||
              !message.trim()
            }
            className="rounded-lg bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </form>

      </div>
    </main>
  );
}