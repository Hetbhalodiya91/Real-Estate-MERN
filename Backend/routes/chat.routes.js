import express from "express";
import Chat from "../model/chat.model.js";
import Property from "../model/property.model.js";
import { protect } from "../middleware/auth.middleware.js";

const chatRoutes = express.Router();

chatRoutes.use(protect);

chatRoutes.post("/start", async (req, res) => {
  try {
    if (req.user.role !== "buyer") {
      return res.status(403).json({ message: "Only buyers can start a chat" });
    }

    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ message: "Property is required" });
    }

    const property = await Property.findOne({
      _id: propertyId,
      verificationStatus: "APPROVED",
      status: "sale",
    }).select("seller");
    if (!property) {
      return res.status(404).json({
        message: "This property is not available for buyer conversations",
      });
    }

    const buyerId = req.user._id;
    const sellerId = property.seller;
    if (!buyerId || !sellerId) {
      return res.status(400).json({
        message: "The property or buyer account is missing an owner ID",
      });
    }
    if (buyerId.toString() === sellerId.toString()) {
      return res.status(400).json({ message: "You cannot message yourself" });
    }

    let chat = await Chat.findOne({
      buyer: buyerId,
      seller: sellerId,
      property: propertyId,
    });

    if (!chat) {
      chat = await Chat.create({
        property: propertyId,
        buyer: buyerId,
        seller: sellerId,
        messages: [],
      });
    }

    chat = await Chat.findById(chat._id)
      .populate("buyer", "name email profilePic")
      .populate("seller", "name email profilePic")
      .populate("property", "title price images");

    return res.status(200).json({ success: true, chat });
  } catch (error) {
    return res.status(500).json({
      message: "Unable to start chat",
      error: error.message,
    });
  }
});

chatRoutes.post("/send", async (req, res) => {
  try {
    const { chatId, text } = req.body;
    const messageText = text?.trim();
    const userId = req.user._id.toString();

    if (!messageText || messageText.length > 2000) {
      return res.status(400).json({
        success: false,
        message: "Messages must contain 1 to 2000 characters",
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (chat.buyer.toString() !== userId && chat.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to send messages in this chat",
      });
    }

    const newMessage = {
      sender: userId,
      text: messageText,
      createdAt: new Date(),
      readBy: [userId],
    };

    chat.messages.push(newMessage);

    await chat.save();

    const savedMessage = chat.messages[chat.messages.length - 1];
    await chat.populate("property", "title");
    const io = req.app.get("io");
    io?.to(chatId).emit("newMessage", savedMessage);

    const recipientId =
      chat.buyer.toString() === userId ? chat.seller : chat.buyer;
    io?.to(`user:${recipientId.toString()}`).emit("newMessageNotification", {
      chatId,
      messageId: savedMessage._id,
      senderName: req.user.name,
      propertyTitle: chat.property?.title || "Property conversation",
      text: messageText,
    });

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: savedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
});

// Get all chats for logged-in user
chatRoutes.get("/user", async (req, res) => {
  try {
    const userId = req.user.id;

    const chats = await Chat.find({
      $or: [{ buyer: userId }, { seller: userId }],
    })
      .populate("buyer", "name email profilePic")
      .populate("seller", "name email profilePic")
      .populate("property", "title price images")
      .sort({ updatedAt: -1 });

    const chatsWithUnreadCounts = chats.map((chat) => {
      const unreadCount = chat.messages.filter(
        (message) =>
          message.sender.toString() !== userId &&
          !message.readBy.some((readerId) => readerId.toString() === userId),
      ).length;

      return { ...chat.toObject(), unreadCount };
    });

    res.status(200).json({
      success: true,
      count: chatsWithUnreadCounts.length,
      chats: chatsWithUnreadCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch chats",
      error: error.message,
    });
  }
});

chatRoutes.patch("/:chatId/read", async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    if (chat.buyer.toString() !== userId && chat.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this chat",
      });
    }

    chat.messages.forEach((message) => {
      if (
        message.sender.toString() !== userId &&
        !message.readBy.some((readerId) => readerId.toString() === userId)
      ) {
        message.readBy.push(userId);
      }
    });

    await chat.save();
    req.app.get("io")?.to(`user:${userId}`).emit("chatRead", {
      chatId: req.params.chatId,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to mark chat as read",
      error: error.message,
    });
  }
});

// Get chat messages
chatRoutes.get("/:chatId", async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const userId = req.user._id.toString();

    // Check if user belongs to this chat
    if (chat.buyer.toString() !== userId && chat.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this chat",
      });
    }

    await chat.populate("messages.sender", "name profilePic");
    await chat.populate("property", "title price images");

    res.status(200).json({
      success: true,
      chat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch chat messages",
      error: error.message,
    });
  }
});

// Delete an entire chat
chatRoutes.delete("/:chatId", async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    // Check authorization
    if (chat.buyer.toString() !== userId && chat.seller.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this chat",
      });
    }

    await Chat.findByIdAndDelete(req.params.chatId);

    res.status(200).json({
      success: true,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete chat",
      error: error.message,
    });
  }
});

chatRoutes.delete("/:chatId/message/:messageId", async (req, res) => {
  try {
    const userId = req.user._id.toString();

    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: "Chat not found",
      });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only sender can delete the message
    if (message.sender.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    message.deleteOne();

    await chat.save();

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
});

export default chatRoutes;
