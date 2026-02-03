const Message = require("../models/messageModel");
const User = require("../models/userModel");
const Chat = require("../models/chatModel");

const sendMessage = async (req, res) => {
    const { content, chatId } = req.body;
    const currentUserId = req.user.id || req.user._id;

    if (!content || !chatId) {
        return res.status(400).json({ message: "Invalid data passed into request" });
    }

    var newMessage = {
        sender: currentUserId,
        content: content,
        chat: chatId,
    };

    try {
        var message = await Message.create(newMessage);

        message = await message.populate("sender", "fullName pic username");
        message = await message.populate("chat");
        message = await User.populate(message, {
            path: "chat.users",
            select: "fullName pic email username",
        });

        await Chat.findByIdAndUpdate(req.body.chatId, { latestMessage: message });

        res.json(message);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const allMessages = async (req, res) => {
    try {
        const messages = await Message.find({ chat: req.params.chatId })
            .populate("sender", "fullName pic email username")
            .populate("chat");
        res.json(messages);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const markAsRead = async (req, res) => {
    const { chatId } = req.body;
    const userId = req.user.id || req.user._id;

    if (!chatId) {
        return res.status(400).json({ message: "Chat ID is required" });
    }

    try {
        await Message.updateMany(
            { chat: chatId, readBy: { $ne: userId } },
            { $addToSet: { readBy: userId } }
        );
        res.status(200).json({ message: "Messages marked as read" });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const getUnreadCount = async (req, res) => {
    const userId = req.user.id || req.user._id;

    try {
        // Count messages where:
        // 1. The chat includes the user
        // 2. The message sender is NOT the user
        // 3. The user is NOT in the readBy array

        // First find all chats the user is part of
        const userChats = await Chat.find({ users: { $elemMatch: { $eq: userId } } });
        const chatIds = userChats.map(c => c._id);

        const count = await Message.countDocuments({
            chat: { $in: chatIds },
            sender: { $ne: userId },
            readBy: { $ne: userId }
        });

        res.status(200).json({ count });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = { sendMessage, allMessages, markAsRead, getUnreadCount };
