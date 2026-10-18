import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");
const EMPTY_MESSAGES = [];

const ChatsPage = () => {
  const { chatId } = useParams();
  const { token, user } = useAuth();
  const [chats, setChats] = useState([]);
  const [messageState, setMessageState] = useState({
    chatId: null,
    messages: [],
  });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messageEndRef = useRef(null);
  const messages =
    messageState.chatId === chatId ? messageState.messages : EMPTY_MESSAGES;

  useEffect(() => {
    const loadChats = async () => {
      try {
        const response = await axios.get(`${API_URL}/chat/user`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setChats(response.data.chats || []);
      } catch (err) {
        setError(err.response?.data?.message || "Unable to load chats.");
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [token]);

  useEffect(() => {
    if (!chatId || !token) {
      return undefined;
    }

    let active = true;
    const loadMessages = async () => {
      try {
        const response = await axios.get(`${API_URL}/chat/${chatId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) {
          setMessageState({
            chatId,
            messages: response.data.chat.messages || [],
          });
          await axios.patch(
            `${API_URL}/chat/${chatId}/read`,
            {},
            { headers: { Authorization: `Bearer ${token}` } },
          );
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || "Unable to load messages.");
        }
      }
    };

    loadMessages();
    return () => {
      active = false;
    };
  }, [chatId, token]);

  useEffect(() => {
    if (!chatId || !token) return undefined;

    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on("connect", () => socket.emit("joinChat", chatId));
    socket.on("newMessage", (message) => {
      setMessageState((current) => {
        const currentMessages =
          current.chatId === chatId ? current.messages : [];
        return currentMessages.some((item) => item._id === message._id)
          ? current
          : { chatId, messages: [...currentMessages, message] };
      });
      setChats((current) => {
        const updated = current.map((chat) =>
          chat._id === chatId
            ? {
                ...chat,
                messages: [...(chat.messages || []), message],
                updatedAt: message.createdAt,
              }
            : chat,
        );
        return updated.sort(
          (first, second) =>
            new Date(second.updatedAt).getTime() -
            new Date(first.updatedAt).getTime(),
        );
      });

      const senderId =
        typeof message.sender === "object"
          ? message.sender?._id
          : message.sender;
      if (String(senderId) !== String(user?._id || user?.id)) {
        axios.patch(
          `${API_URL}/chat/${chatId}/read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
    });
    socket.on("chatError", (message) => setError(message));

    return () => socket.disconnect();
  }, [chatId, token, user?._id, user?.id]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const activeChat = chats.find((chat) => chat._id === chatId);
  const otherParticipant = activeChat
    ? user?.role === "buyer"
      ? activeChat.seller
      : activeChat.buyer
    : null;

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !chatId || sending) return;

    setSending(true);
    setError("");
    try {
      const response = await axios.post(
        `${API_URL}/chat/send`,
        { chatId, text },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const message = response.data.data;
      setMessageState((current) => {
        const currentMessages =
          current.chatId === chatId ? current.messages : [];
        return currentMessages.some((item) => item._id === message._id)
          ? current
          : { chatId, messages: [...currentMessages, message] };
      });
      setDraft("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  const getOtherParticipant = (chat) =>
    user?.role === "buyer" ? chat.seller : chat.buyer;

  return (
    <section className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Buyer and seller conversations
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Chats</h1>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      <div className="grid min-h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-[300px_minmax(0,1fr)]">
        <aside
          className={`border-b border-slate-200 md:border-b-0 md:border-r ${
            chatId ? "hidden md:block" : ""
          }`}
        >
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold text-slate-900">Conversations</h2>
          </div>
          {loading ? (
            <p className="px-5 py-8 text-sm text-slate-500">Loading chats...</p>
          ) : chats.length === 0 ? (
            <p className="px-5 py-8 text-sm leading-6 text-slate-500">
              No conversations yet. Open a property listing and message its
              seller.
            </p>
          ) : (
            <nav className="max-h-[70vh] overflow-y-auto">
              {chats.map((chat) => {
                const participant = getOtherParticipant(chat);
                const latestMessage = chat.messages?.at(-1)?.text;
                return (
                  <Link
                    key={chat._id}
                    to={`/chats/${chat._id}`}
                    className={`block border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50 ${
                      chat._id === chatId ? "bg-emerald-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate font-semibold text-slate-900">
                        {participant?.name || "User"}
                      </span>
                      {chat.updatedAt && (
                        <time className="shrink-0 text-xs text-slate-500">
                          {new Date(chat.updatedAt).toLocaleDateString("en-IN")}
                        </time>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {chat.property?.title || "Property conversation"}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-600">
                      {latestMessage || "Start the conversation"}
                    </p>
                  </Link>
                );
              })}
            </nav>
          )}
        </aside>

        <div
          className={`flex min-w-0 flex-col ${chatId ? "" : "hidden md:flex"}`}
        >
          {chatId && activeChat ? (
            <>
              <header className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
                <Link
                  to="/chats"
                  className="text-sm font-medium text-emerald-700 md:hidden"
                >
                  Back
                </Link>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold text-slate-900">
                    {otherParticipant?.name || "Conversation"}
                  </h2>
                  <p className="truncate text-sm text-slate-500">
                    {activeChat.property?.title || "Property conversation"}
                  </p>
                </div>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-5 sm:px-6">
                {messages.length === 0 ? (
                  <div className="grid h-full min-h-64 place-items-center text-center text-slate-500">
                    <p>Send a message to start the conversation.</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    const senderId =
                      typeof message.sender === "object"
                        ? message.sender?._id
                        : message.sender;
                    const isOwnMessage =
                      String(senderId) === String(user?._id || user?.id);
                    return (
                      <div
                        key={message._id}
                        className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                      >
                        <article
                          className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[70%] ${
                            isOwnMessage
                              ? "rounded-br-md bg-emerald-600 text-white"
                              : "rounded-bl-md bg-white text-slate-900"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {message.text}
                          </p>
                          <time
                            className={`mt-1 block text-right text-xs ${
                              isOwnMessage
                                ? "text-emerald-100"
                                : "text-slate-400"
                            }`}
                          >
                            {new Date(message.createdAt).toLocaleTimeString(
                              "en-IN",
                              { hour: "numeric", minute: "2-digit" },
                            )}
                          </time>
                        </article>
                      </div>
                    );
                  })
                )}
                <div ref={messageEndRef} />
              </div>

              <form
                onSubmit={sendMessage}
                className="flex items-end gap-3 border-t border-slate-200 bg-white p-4 sm:p-5"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Write a message..."
                  aria-label="Write a message"
                  className="max-h-32 min-h-12 min-w-0 flex-1 resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  className="h-12 shrink-0 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {sending ? "Sending..." : "Send"}
                </button>
              </form>
            </>
          ) : chatId && loading ? (
            <div className="grid flex-1 place-items-center text-slate-500">
              Loading conversation...
            </div>
          ) : chatId ? (
            <div className="grid flex-1 place-items-center p-8 text-center text-slate-500">
              Conversation unavailable.
            </div>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-slate-500">
              Select a conversation to view messages.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ChatsPage;
