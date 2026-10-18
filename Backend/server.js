import express from "express";
import cors from "cors";
import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import connectDB from "./config/db.js";
import User from "./model/userModel.js";
import Chat from "./model/chat.model.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import propertyRouter from "./routes/property.routes.js";
import inquiryRouter from "./routes/inquiry.routes.js";
import WishlistRouter from "./routes/wishlist.routes.js";
import contactRoutes from "./routes/contact.routes.js";
import adminRouter from "./routes/admin.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import paymentRoutes from "./routes/payment.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// DB

connectDB();

// Middleware
const allowedOrigins = ["http://localhost:5173"].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);
// app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/property", propertyRouter);
app.use("/api/inquiry", inquiryRouter);
app.use("/api/wishlist", WishlistRouter);
app.use("/api/contact", contactRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("_id isBlock");
    if (!user || user.isBlock) return next(new Error("Unauthorized"));

    socket.userId = user._id.toString();
    return next();
  } catch {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`user:${socket.userId}`);

  socket.on("joinChat", async (chatId) => {
    try {
      const chat = await Chat.findOne({
        _id: chatId,
        $or: [{ buyer: socket.userId }, { seller: socket.userId }],
      }).select("_id");

      if (chat) socket.join(chatId);
      else socket.emit("chatError", "You cannot join this conversation");
    } catch {
      socket.emit("chatError", "Unable to join this conversation");
    }
  });

  socket.on("typing", (chatId) => {
    if (socket.rooms.has(chatId)) socket.to(chatId).emit("userTyping");
  });

  socket.on("stopTyping", (chatId) => {
    if (socket.rooms.has(chatId)) socket.to(chatId).emit("userStopTyping");
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on  http://localhost:${PORT}`);
});
