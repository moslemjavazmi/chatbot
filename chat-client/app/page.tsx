
"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { socket } from "@/lib/socket";

type UserRole =
  | "user"
  | "tasker"
  | "admin";

interface Message {
  id: string;
  senderId: string;
  senderRole: UserRole;
  text: string;
  createdAt: string;
}

/*
 * Temporary user.
 *
 * Change this value to test
 * different users.
 */

// const CURRENT_USER = {
//   id: "user-1",
//   role: "user" as const,
// };
const CURRENT_USER = {
  id: "user-1",
  role: "user" as const,
};
export default function Home() {
  const [isConnected, setIsConnected] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  useEffect(() => {
    function handleConnect() {
      setIsConnected(true);

      console.log(
        "Connected:",
        socket.id
      );
    }

    function handleDisconnect() {
      setIsConnected(false);

      console.log(
        "Disconnected"
      );
    }

    function handleConnectError(
      error: Error
    ) {
      console.error(
        "Connection error:",
        error.message
      );
    }

function handleNewMessage(message: Message) {
  console.log(
    "MESSAGE RECEIVED:",
    message.id,
    message.text,
    "socket:",
    socket.id
  );

  setMessages((previousMessages) => {
    const alreadyExists = previousMessages.some(
      (existingMessage) =>
        existingMessage.id === message.id
    );

    if (alreadyExists) {
      console.log(
        "DUPLICATE MESSAGE:",
        message.id
      );

      return previousMessages;
    }

    return [
      ...previousMessages,
      message,
    ];
  });
}

    /*
     * Register listeners
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

    /*
     * Send temporary identity
     */

    socket.auth = {
      userId: CURRENT_USER.id,
      role: CURRENT_USER.role,
    };

    /*
     * Connect to server
     */

    socket.connect();

    /*
     * Cleanup
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

      socket.disconnect();
    };
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const text = message.trim();

    if (!text || !isConnected) {
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div className="flex w-full max-w-lg flex-col rounded-xl bg-white p-6 shadow">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Task Chat
          </h1>

          <div className="mt-3 rounded-lg bg-gray-100 p-3">
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

        <div className="mb-6 flex min-h-64 flex-col gap-3 overflow-y-auto rounded-lg border p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-400">
              No messages yet.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="rounded-lg bg-gray-100 p-3"
              >
                <p className="text-xs text-gray-500">
                  {message.senderId} (
                  {message.senderRole})
                </p>

                <p className="mt-1">
                  {message.text}
                </p>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex gap-2"
        >
          <input
            type="text"
            value={message}
            onChange={(event) => {
              setMessage(
                event.target.value
              );
            }}
            placeholder="Write a message..."
            className="flex-1 rounded-lg border px-4 py-3 outline-none"
          />

          <button
            type="submit"
            disabled={!isConnected}
            className="rounded-lg bg-black px-5 py-3 text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Send
          </button>
        </form>

      </div>
    </main>
  );
}