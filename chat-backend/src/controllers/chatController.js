const Chat = require("../models/chatModel");
const User = require("../models/userModel");
const Message = require("../models/messageModel");

const accessChat = async (req, res) => {
    const { userId } = req.body;
    const currentUserId = req.user.id || req.user._id;

    if (!userId) {
        return res.status(400).json({ message: "UserId param not sent with request" });
    }

    var isChat = await Chat.find({
        isGroupChat: false,
        $and: [
            { users: { $elemMatch: { $eq: currentUserId } } },
            { users: { $elemMatch: { $eq: userId } } },
        ],
    })
        .populate("users", "-password")
        .populate("latestMessage");

    isChat = await User.populate(isChat, {
        path: "latestMessage.sender",
        select: "fullName pic email username",
    });

    if (isChat.length > 0) {
        res.send(isChat[0]);
    } else {
        var chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [currentUserId, userId],
        };

        try {
            const createdChat = await Chat.create(chatData);
            const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
                "users",
                "-password"
            );
            res.status(200).json(FullChat);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    }
};

const fetchChats = async (req, res) => {
    const currentUserId = req.user.id || req.user._id;

    try {
        Chat.find({ users: { $elemMatch: { $eq: currentUserId } } })
            .populate("users", "-password")
            .populate("groupAdmin", "-password")
            .populate("latestMessage")
            .sort({ updatedAt: -1 })
            .then(async (results) => {
                results = await User.populate(results, {
                    path: "latestMessage.sender",
                    select: "fullName pic email username",
                });

                // Add unread count for each chat
                const chatsWithUnread = await Promise.all(results.map(async (chat) => {
                    const unreadCount = await Message.countDocuments({
                        chat: chat._id,
                        sender: { $ne: currentUserId },
                        readBy: { $ne: currentUserId }
                    });
                    return { ...chat._doc, unreadCount };
                }));

                res.status(200).send(chatsWithUnread);
            });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const createGroupChat = async (req, res) => {
    const currentUserId = req.user.id || req.user._id;

    if (!req.body.users || !req.body.name) {
        return res.status(400).send({ message: "Please Fill all the fields" });
    }

    var users = JSON.parse(req.body.users);

    if (users.length < 2) {
        return res
            .status(400)
            .send("More than 2 users are required to form a group chat");
    }

    users.push(currentUserId);

    try {
        const groupChat = await Chat.create({
            chatName: req.body.name,
            users: users,
            isGroupChat: true,
            groupAdmin: currentUserId,
        });

        const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
            .populate("users", "-password")
            .populate("groupAdmin", "-password");

        res.status(200).json(fullGroupChat);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const renameGroup = async (req, res) => {
    const { chatId, chatName } = req.body;

    const updatedChat = await Chat.findByIdAndUpdate(
        chatId,
        {
            chatName: chatName,
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!updatedChat) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(updatedChat);
    }
};

const addToGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    // check if the requester is admin
    const chat = await Chat.findById(chatId);
    if (chat.groupAdmin.toString() !== req.user.id && chat.groupAdmin.toString() !== req.user._id) {
        return res.status(403).json({ message: "Only admin can add user" });
    }

    const added = await Chat.findByIdAndUpdate(
        chatId,
        {
            $push: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!added) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(added);
    }
};

const removeFromGroup = async (req, res) => {
    const { chatId, userId } = req.body;

    // check if the requester is admin or if they are removing themselves
    const chat = await Chat.findById(chatId);
    if (!chat) {
        return res.status(404).json({ message: "Chat Not Found" });
    }

    // Only admin can remove others, but anyone can remove themselves (leave group)
    const currentUserId = req.user.id || req.user._id;
    if (userId !== currentUserId && chat.groupAdmin.toString() !== currentUserId) {
        return res.status(403).json({ message: "Only admin can remove users" });
    }

    const removed = await Chat.findByIdAndUpdate(
        chatId,
        {
            $pull: { users: userId },
        },
        {
            new: true,
        }
    )
        .populate("users", "-password")
        .populate("groupAdmin", "-password");

    if (!removed) {
        res.status(404);
        throw new Error("Chat Not Found");
    } else {
        res.json(removed);
    }
};

module.exports = {
    accessChat,
    fetchChats,
    createGroupChat,
    renameGroup,
    addToGroup,
    removeFromGroup,
};
