const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const dbConnect = require("./config/dbConnect");
const { Server } = require("socket.io");
const http = require("http");

dbConnect();

const app = express();
const port = process.env.PORT || 7005;

app.use(express.json());
app.use(cors());

const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// Basic route to check status
app.get("/", (req, res) => {
    res.send("Chat Backend is running");
});

const server = http.createServer(app);
const io = new Server(server, {
    pingTimeout: 60000,
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Basic online user tracking
let activeUsers = [];

io.on("connection", (socket) => {
    console.log("Connected to socket.io");

    socket.on("setup", (userData) => {
        socket.join(userData._id);
        console.log("User connected:", userData._id);

        // Add to active users if not exists
        if (!activeUsers.some((user) => user.userId === userData._id)) {
            activeUsers.push({
                userId: userData._id,
                socketId: socket.id
            });
        }

        socket.emit("connected");
        // Broadcast online users
        io.emit("get_online_users", activeUsers);
    });

    socket.on("join_chat", (room) => {
        socket.join(room);
        console.log("User Joined Room: " + room);
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop_typing", (room) => socket.in(room).emit("stop_typing"));

    socket.on("new_message", (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id == newMessageRecieved.sender._id) return;

            socket.in(user._id).emit("message_recieved", newMessageRecieved);
        });
    });

    // Mark message as read (real-time notification)
    socket.on("mark_read", (details) => {
        const { chatId, userId } = details;
        if (!chatId || !userId) return;

        // Notify others in the chat (sender specifically)
        socket.to(chatId).emit("message_read_status", { chatId, userId });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
        activeUsers = activeUsers.filter((user) => user.socketId !== socket.id);
        io.emit("get_online_users", activeUsers);
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
