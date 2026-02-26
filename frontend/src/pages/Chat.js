import React, { useEffect, useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Search, Send, ArrowLeft, Phone, Video, Info, MoreVertical, Plus, Users, MessageSquare, X } from 'lucide-react';
import GroupChatModal from '../components/miscellaneous/GroupChatModal';
import UpdateGroupChatModal from '../components/miscellaneous/UpdateGroupChatModal';
import toast from 'react-hot-toast';

const Chat = () => {
    const { user } = useAuth();
    const { socket, onlineUsers, selectedChat, setSelectedChat, chats, setChats, messages, setMessages, typing, fetchUnreadCount } = useChat();
    const [loadingChats, setLoadingChats] = useState(false);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isUpdateGroupModalOpen, setIsUpdateGroupModalOpen] = useState(false);

    // Check if a user is online
    const isUserOnline = (userId) => {
        return onlineUsers.some(u => u.userId === userId);
    };

    // Fetch all chats
    const fetchChats = async () => {
        setLoadingChats(true);
        try {
            // First sync user
            await api.post('http://localhost:7005/api/user/sync');

            const response = await api.get('http://localhost:7005/api/chat');
            setChats(response.data);
        } catch (error) {
            console.error('Error fetching chats:', error);
            toast.error('Failed to load chats');
        } finally {
            setLoadingChats(false);
        }
    };

    // Fetch messages for selected chat
    const fetchMessages = async (chatId) => {
        setLoadingMessages(true);
        try {
            const response = await api.get(`http://localhost:7005/api/message/${chatId}`);
            setMessages(response.data);

            // Mark messages as read in DB
            await api.put('http://localhost:7005/api/message/read', { chatId });

            // Refresh unread count
            fetchUnreadCount();

            // Optimistically update chats list to remove unread indicator if we had one
            // (Optional, but good UX if we had per-chat unread counts in the list)

            if (socket) {
                socket.emit('join_chat', chatId);
                // Real-time read receipt
                socket.emit('mark_read', { chatId, userId: user.id || user._id });
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load messages');
        } finally {
            setLoadingMessages(false);
        }
    };

    // Search users
    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            const response = await api.get(`http://localhost:7005/api/user?search=${query}`);
            setSearchResults(response.data);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    // Access or create chat with user
    const accessChat = async (userId) => {
        try {
            const response = await api.post('http://localhost:7005/api/chat', { userId });

            // Add to chats if not already there
            if (!chats.find(c => c._id === response.data._id)) {
                setChats([response.data, ...chats]);
            }

            setSelectedChat(response.data);
            setSearchQuery('');
            setSearchResults([]);
            fetchMessages(response.data._id);
        } catch (error) {
            console.error('Error accessing chat:', error);
            toast.error('Failed to open chat');
        }
    };

    // Send message
    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        try {
            const response = await api.post('http://localhost:7005/api/message', {
                content: newMessage,
                chatId: selectedChat._id,
            });

            if (socket) {
                socket.emit('new_message', response.data);
            }

            setMessages([...messages, response.data]);
            setNewMessage('');

            // Update latest message in chat list
            setChats(chats.map(c =>
                c._id === selectedChat._id
                    ? { ...c, latestMessage: response.data }
                    : c
            ));
        } catch (error) {
            console.error('Error sending message:', error);
            toast.error('Failed to send message');
        }
    };

    // Handle typing indicator
    const typingHandler = (e) => {
        setNewMessage(e.target.value);

        if (!socket) return;

        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', selectedChat._id);
        }

        let lastTypingTime = new Date().getTime();
        const timerLength = 3000;

        setTimeout(() => {
            const timeNow = new Date().getTime();
            const timeDiff = timeNow - lastTypingTime;

            if (timeDiff >= timerLength && isTyping) {
                socket.emit('stop_typing', selectedChat._id);
                setIsTyping(false);
            }
        }, timerLength);
    };

    // Get chat name
    const getChatName = (chat) => {
        if (chat.isGroupChat) {
            return chat.chatName;
        }
        // Auth user object has 'id', but chat users have '_id'
        const currentUserId = user.id || user._id;
        const otherUser = chat.users.find(u => u._id !== currentUserId);
        return otherUser?.fullName || otherUser?.username || 'Unknown';
    };

    // Get other user ID for online check
    const getOtherUserId = (chat) => {
        if (chat.isGroupChat) return null;
        const currentUserId = user.id || user._id;
        const otherUser = chat.users.find(u => u._id !== currentUserId);
        return otherUser?._id;
    };

    useEffect(() => {
        fetchChats();
    }, []);

    // Listen for new messages and read status
    useEffect(() => {
        if (!socket) return;

        socket.on('message_recieved', (newMessageRecieved) => {
            if (!selectedChat || selectedChat._id !== newMessageRecieved.chat._id) {
                // Notification - update chat list unread count
                setChats(prevChats => prevChats.map(c =>
                    c._id === newMessageRecieved.chat._id
                        ? { ...c, unreadCount: (c.unreadCount || 0) + 1, latestMessage: newMessageRecieved }
                        : c
                ));
                toast.info(`New message from ${newMessageRecieved.sender.fullName}`);
            } else {
                setMessages([...messages, newMessageRecieved]);
                // Mark as read immediately if we are viewing this chat
                socket.emit('mark_read', { chatId: selectedChat._id, userId: user.id || user._id });
            }
        });

        socket.on('message_read_status', ({ chatId }) => {
            if (selectedChat && selectedChat._id === chatId) {
                // Update local messages state to show 'read'
                setMessages(prev => prev.map(msg => ({ ...msg, readBy: [...(msg.readBy || []), "other"] })));
                // Note: Ideally we'd fetch updated messages or have precise user ID in readBy
            }
        });
    }, [socket, selectedChat, messages]);

    return (
        <div className="h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100">
            <div className="grid grid-cols-12 h-full">
                {/* Sidebar - Chat List */}
                <div className="col-span-12 md:col-span-4 border-r border-gray-200 flex flex-col">
                    {/* Header ... (keep same) */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-6 border-b-4 border-primary-800">
                        {/* ... keep header content ... */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                <MessageSquare className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Messages</h2>
                                <p className="text-xs text-white/80 font-semibold">
                                    {onlineUsers.length > 1 ? `${onlineUsers.length - 1} Online` : 'Fleet Communication'}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsGroupModalOpen(true)}
                                className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                                title="New Group Chat"
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        {/* Search Bar */}
                        <div className="px-4 pb-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search chats..."
                                    className="w-full pl-10 pr-4 py-2 bg-white/20 border-none text-white placeholder-blue-100 rounded-xl focus:ring-2 focus:ring-white/50"
                                    value={searchQuery}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Search Results ... (keep same) */}

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto">
                        {loadingChats ? (
                            <div className="p-8 text-center">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto"></div>
                            </div>
                        ) : chats.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <MessageSquare className="h-8 w-8 text-gray-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-600">No conversations yet</p>
                                <p className="text-xs text-gray-400 mt-1">Search for users to start chatting</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {chats.map((chat) => {
                                    const otherId = getOtherUserId(chat);
                                    const isOnline = isUserOnline(otherId);

                                    return (
                                        <button
                                            key={chat._id}
                                            onClick={() => {
                                                setSelectedChat(chat);
                                                // Optimistically clear unread count for this chat
                                                setChats(prev => prev.map(c => c._id === chat._id ? { ...c, unreadCount: 0 } : c));
                                                fetchMessages(chat._id);
                                            }}
                                            className={`w-full flex items-start gap-3 p-4 transition-all text-left ${selectedChat?._id === chat._id
                                                ? 'bg-primary-50 border-l-4 border-l-primary-600'
                                                : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                                }`}
                                        >
                                            <div className="relative w-12 h-12 flex-shrink-0">
                                                <div className="w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold">
                                                    {getChatName(chat)[0]}
                                                </div>
                                                {isOnline && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <p className="text-sm font-bold text-gray-900 truncate">{getChatName(chat)}</p>
                                                    <div className="flex flex-col items-end">
                                                        {chat.latestMessage && (
                                                            <span className="text-xs text-gray-400 mb-1">
                                                                {new Date(chat.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                        {chat.unreadCount > 0 && selectedChat?._id !== chat._id && (
                                                            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm">
                                                                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {chat.latestMessage?.content || 'No messages yet'}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="col-span-12 md:col-span-8 flex flex-col">
                    {!selectedChat ? (
                        <div className="flex-1 flex items-center justify-center bg-gray-50">
                            <div className="text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                                    <MessageSquare className="h-12 w-12 text-white" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 mb-2">Fleet Chat</h3>
                                <p className="text-gray-500 font-medium">Select a conversation to start messaging</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Chat Header */}
                            <div className="bg-white border-b-2 border-gray-200 p-4 flex items-center justify-between">
                                <div
                                    className={`flex items-center gap-3 ${selectedChat.isGroupChat ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors' : ''}`}
                                    onClick={() => selectedChat.isGroupChat && setIsUpdateGroupModalOpen(true)}
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center text-white font-bold">
                                            {getChatName(selectedChat)[0]}
                                        </div>
                                        {isUserOnline(getOtherUserId(selectedChat)) && (
                                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                            {getChatName(selectedChat)}
                                            {selectedChat.isGroupChat && <Info className="h-4 w-4 text-gray-400" />}
                                        </h3>
                                        {typing ? (
                                            <p className="text-xs text-primary-600 font-semibold">Typing...</p>
                                        ) : isUserOnline(getOtherUserId(selectedChat)) ? (
                                            <p className="text-xs text-green-600 font-medium">Online</p>
                                        ) : selectedChat.isGroupChat ? (
                                            <p className="text-xs text-gray-500 font-medium">{selectedChat.users.length} members</p>
                                        ) : (
                                            <p className="text-xs text-gray-400">Offline</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setSelectedChat(null)}
                                        className="md:hidden p-2 rounded-lg hover:bg-gray-100"
                                    >
                                        <X className="h-5 w-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                                {loadingMessages ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-gray-500 font-medium">No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map((msg, idx) => {
                                        const currentUserId = user.id || user._id;
                                        const isMine = msg.sender._id === currentUserId;
                                        const isRead = msg.readBy && msg.readBy.length > 0; // Simple check for now

                                        return (
                                            <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[70%] ${isMine ? 'order-2' : 'order-1'}`}>
                                                    {!isMine && selectedChat.isGroupChat && (
                                                        <p className="text-xs text-gray-500 ml-1 mb-1 font-bold">
                                                            {msg.sender.fullName || msg.sender.username}
                                                        </p>
                                                    )}
                                                    <div
                                                        className={`px-4 py-2.5 rounded-2xl ${isMine
                                                            ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-br-sm'
                                                            : 'bg-white text-gray-900 rounded-bl-sm border border-gray-200'
                                                            }`}
                                                    >
                                                        <p className="text-sm font-medium">{msg.content}</p>
                                                    </div>
                                                    <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                        <p className="text-xs text-gray-400">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {isMine && (
                                                            <span className="text-xs font-bold ml-1">
                                                                {isRead ? (
                                                                    <span className="text-primary-600">Read</span>
                                                                ) : (
                                                                    <span className="text-gray-400">Sent</span>
                                                                )}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            {/* ... (keep message input) */}
                            <form onSubmit={sendMessage} className="bg-white border-t-2 border-gray-200 p-4">
                                <div className="flex gap-3">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={typingHandler}
                                        placeholder="Type a message..."
                                        className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary-600 outline-none font-medium transition-all"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Send
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </div>
            {/* Modals */}
            <GroupChatModal isOpen={isGroupModalOpen} onClose={() => setIsGroupModalOpen(false)} />
            <UpdateGroupChatModal
                isOpen={isUpdateGroupModalOpen}
                onClose={() => setIsUpdateGroupModalOpen(false)}
                fetchMessages={() => fetchMessages(selectedChat._id)}
            />
        </div>
    );
};

export default Chat;
