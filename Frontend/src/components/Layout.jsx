import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

const navItems = [
  { to: "/", label: "Home" },
  { to: "/properties", label: "Properties" },
  { to: "/sell", label: "Sell" },
];

const Layout = ({ children }) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const currentPath = useRef(location.pathname);
  const [unreadChats, setUnreadChats] = useState({});
  const [notification, setNotification] = useState(null);
  const unreadTotal = Object.values(unreadChats).reduce(
    (total, count) => total + count,
    0,
  );
  const canListProperty = !user || user.role === "seller";

  useEffect(() => {
    currentPath.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!token || !["buyer", "seller"].includes(user?.role)) return undefined;

    let active = true;
    axios
      .get(`${API_URL}/chat/user`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        if (!active) return;
        const counts = {};
        (response.data.chats || []).forEach((chat) => {
          if (chat.unreadCount > 0) counts[chat._id] = chat.unreadCount;
        });
        setUnreadChats(counts);
      })
      .catch(() => {});

    const socket = io(SOCKET_URL, { auth: { token } });
    socket.on("newMessageNotification", (incoming) => {
      if (currentPath.current === `/chats/${incoming.chatId}`) return;

      setUnreadChats((current) => ({
        ...current,
        [incoming.chatId]: (current[incoming.chatId] || 0) + 1,
      }));
      setNotification(incoming);
    });
    socket.on("chatRead", ({ chatId }) => {
      setUnreadChats((current) => {
        const updated = { ...current };
        delete updated[chatId];
        return updated;
      });
    });

    return () => {
      active = false;
      socket.disconnect();
    };
  }, [token, user?.role]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 font-bold text-white">
              E
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">EstateHub</div>
              <div className="text-xs text-slate-500">
                Smart property marketplace
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems
              .filter((item) => item.to !== "/sell" || canListProperty)
              .map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            {user?.role === "seller" && (
              <>
                <NavLink
                  to="/my-properties"
                  className={({ isActive }) =>
                    `text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"}`
                  }
                >
                  My Properties
                </NavLink>
                <NavLink
                  to="/chats"
                  className={({ isActive }) =>
                    `text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"}`
                  }
                >
                  Chats
                  {unreadTotal > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
                      {unreadTotal}
                    </span>
                  )}
                </NavLink>
              </>
            )}
            {user?.role === "buyer" && (
              <>
                <NavLink
                  to="/chats"
                  className={({ isActive }) =>
                    `text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"}`
                  }
                >
                  Chats
                  {unreadTotal > 0 && (
                    <span className="ml-1 rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs text-white">
                      {unreadTotal}
                    </span>
                  )}
                </NavLink>
                <NavLink
                  to="/buyer/wishlist"
                  className={({ isActive }) =>
                    `text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"}`
                  }
                >
                  Wishlist
                </NavLink>
              </>
            )}
            {user?.role === "admin" && (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `text-sm font-medium transition ${isActive ? "text-emerald-600" : "text-slate-600 hover:text-slate-900"}`
                }
              >
                Admin
              </NavLink>
            )}
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm sm:flex">
                  <span className="font-semibold text-slate-800">
                    {user.name}
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {notification && (
        <aside
          role="status"
          className="fixed right-4 top-20 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                New message from {notification.senderName || "a user"}
              </p>
              <p className="mt-1 truncate text-sm text-slate-500">
                {notification.propertyTitle}
              </p>
              <Link
                to={`/chats/${notification.chatId}`}
                onClick={() => setNotification(null)}
                className="mt-2 inline-block text-sm font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Open conversation
              </Link>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              aria-label="Dismiss notification"
              className="text-slate-500 hover:text-slate-900"
            >
              ×
            </button>
          </div>
        </aside>
      )}

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>© 2026 EstateHub. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/properties" className="hover:text-slate-900">
              Browse listings
            </Link>
            {canListProperty && (
              <Link to="/sell" className="hover:text-slate-900">
                Sell property
              </Link>
            )}
            
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
