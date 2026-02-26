import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { useAuth } from './AuthContext';

import { api } from '../services/api';

const ChatContext = createContext();

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [notification, setNotification] = useState([]);
    const [typing, setTyping] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch unread count
    const fetchUnreadCount = async () => {
        if (!user) return;
        try {
            const { data } = await api.get('http://localhost:7005/api/message/unread/count');
            setUnreadCount(data.count);
        } catch (error) {
            console.error("Error fetching unread count:", error);
        }
    };

    // Initialize socket connection
    useEffect(() => {
        if (user) {
            fetchUnreadCount(); // Fetch initial count

            const newSocket = io('http://localhost:7005');
            setSocket(newSocket);

            newSocket.emit('setup', user);
            newSocket.on('connected', () => {
                console.log('Connected to socket.io');
            });

            newSocket.on('get_online_users', (users) => {
                setOnlineUsers(users);
            });

            return () => {
                newSocket.disconnect();
            };
        }
    }, [user]);

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        socket.on('message_recieved', (newMessage) => {
            if (!selectedChat || selectedChat._id !== newMessage.chat._id) {
                // Notification
                if (!notification.includes(newMessage)) {
                    setNotification([newMessage, ...notification]);
                    setUnreadCount(prev => prev + 1); // Increment unread count
                }
            } else {
                setMessages([...messages, newMessage]);
            }
        });

        socket.on('message_read_status', ({ chatId, userId }) => {
            if (selectedChat && selectedChat._id === chatId) {
                // Update messages in current chat to show read status
                // This is a simplified approach; ideally we update specific messages
                // For now, we can trigger a re-fetch or update local state if we had readBy field in UI
                // We'll implemented UI updates in Chat.js
            }
        });

        socket.on('typing', () => setTyping(true));
        socket.on('stop_typing', () => setTyping(false));
    });

    const value = {
        socket,
        onlineUsers,
        selectedChat,
        setSelectedChat,
        chats,
        setChats,
        messages,
        setMessages,
        notification,
        setNotification,
        typing,
        unreadCount,
        setUnreadCount,
        fetchUnreadCount
    };

    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
