import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { MessageSquare, X, Send, ChevronLeft, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const ChatWidget = () => {
    const { user } = useAuth();
    const { socket, onlineUsers, unreadCount, fetchUnreadCount } = useChat();
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState('list'); // 'list' | 'chat'
    const [widgetChats, setWidgetChats] = useState([]);
    const [selectedWidgetChat, setSelectedWidgetChat] = useState(null);
    const [widgetMessages, setWidgetMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [widgetMessages, activeView]);

    // Fetch chats when widget opens or view changes to list
    useEffect(() => {
        if (isOpen && activeView === 'list') {
            fetchWidgetChats();
        }
    }, [isOpen, activeView]);

    const fetchWidgetChats = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('http://localhost:7005/api/chat');
            setWidgetChats(data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to load chats", error);
            setLoading(false);
        }
    };

    const openChat = async (chat) => {
        setSelectedWidgetChat(chat);
        setActiveView('chat');
        setLoading(true);
        try {
            const { data } = await api.get(`http://localhost:7005/api/message/${chat._id}`);
            setWidgetMessages(data);
            setLoading(false);

            // Mark read
            await api.put('http://localhost:7005/api/message/read', { chatId: chat._id });
            fetchUnreadCount();

            socket.emit('join_chat', chat._id);
        } catch (error) {
            console.error("Failed to load messages", error);
            setLoading(false);
        }
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedWidgetChat) return;

        try {
            const { data } = await api.post('http://localhost:7005/api/message', {
                content: newMessage,
                chatId: selectedWidgetChat._id,
            });

            socket.emit('new_message', data);
            setWidgetMessages([...widgetMessages, data]);
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
            toast.error("Failed to send");
        }
    };

    // Listen for incoming messages
    useEffect(() => {
        if (!socket) return;

        socket.on('message_recieved', (newMessage) => {
            // If viewing this chat, append message
            if (isOpen && selectedWidgetChat && selectedWidgetChat._id === newMessage.chat._id) {
                setWidgetMessages(prev => [...prev, newMessage]);

                // Mark as read immediately
                // socket.emit('mark_read', { chatId: selectedWidgetChat._id, userId: user.id || user._id });
            }
            // If in list view, refresh list to show latest message/unread count
            else if (isOpen && activeView === 'list') {
                fetchWidgetChats();
            }
        });

        return () => {
            socket.off('message_recieved');
        };
    }, [socket, isOpen, selectedWidgetChat, activeView]);

    // Helpers from Chat.js
    const getChatName = (chat) => {
        if (chat.isGroupChat) return chat.chatName;
        const currentUserId = user.id || user._id;
        const otherUser = chat.users.find(u => u._id !== currentUserId);
        return otherUser?.fullName || otherUser?.username || 'Unknown';
    };

    if (!user) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Widget Window */}
            {isOpen && (
                <div className="mb-4 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom-5 fade-in duration-200">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 p-4 shrink-0">
                        <div className="flex items-center justify-between text-white">
                            {activeView === 'chat' ? (
                                <button onClick={() => setActiveView('list')} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                    <ChevronLeft size={20} />
                                </button>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={18} />
                                    <span className="font-bold text-sm">Valid Messaging</span>
                                </div>
                            )}

                            {activeView === 'chat' && (
                                <span className="font-bold text-sm truncate max-w-[150px]">
                                    {getChatName(selectedWidgetChat)}
                                </span>
                            )}

                            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto bg-gray-50 flex flex-col">

                        {/* List View */}
                        {activeView === 'list' && (
                            <div className="divide-y divide-gray-100">
                                {loading ? (
                                    <div className="p-4 text-center text-xs text-gray-500">Loading chats...</div>
                                ) : widgetChats.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 text-sm">No conversations yet</div>
                                ) : (
                                    widgetChats.map(chat => (
                                        <div
                                            key={chat._id}
                                            onClick={() => openChat(chat)}
                                            className="p-3 hover:bg-white cursor-pointer transition-colors flex items-center gap-3"
                                        >
                                            <div className="relative w-10 h-10 shrink-0 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                                                {getChatName(chat)[0]}
                                                {chat.unreadCount > 0 && (
                                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[9px] text-white">
                                                        {chat.unreadCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-baseline">
                                                    <p className="font-bold text-sm text-gray-900 truncate">{getChatName(chat)}</p>
                                                    {chat.latestMessage && (
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(chat.latestMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 truncate">
                                                    {chat.latestMessage ? (
                                                        <>
                                                            {chat.latestMessage.sender._id === (user.id || user._id) ? 'You: ' : ''}
                                                            {chat.latestMessage.content}
                                                        </>
                                                    ) : 'Start chatting'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Chat View */}
                        {activeView === 'chat' && (
                            <>
                                <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                                    {loading ? (
                                        <div className="text-center text-xs text-gray-500 mt-4">Loading messages...</div>
                                    ) : widgetMessages.map((msg, idx) => {
                                        const isMine = msg.sender._id === (user.id || user._id);
                                        return (
                                            <div key={idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${isMine ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
                                                    }`}>
                                                    {!isMine && selectedWidgetChat.isGroupChat && (
                                                        <p className="text-[10px] font-bold opacity-75 mb-0.5">{msg.sender.fullName}</p>
                                                    )}
                                                    <p>{msg.content}</p>
                                                    <p className={`text-[9px] mt-1 text-right ${isMine ? 'text-primary-100' : 'text-gray-400'}`}>
                                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                <form onSubmit={sendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="flex-1 bg-gray-50 border-0 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!newMessage.trim()}
                                        className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                                    >
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* FAB */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative w-14 h-14 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-full shadow-xl hover:scale-105 hover:shadow-2xl transition-all flex items-center justify-center group"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}

                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>
        </div>
    );
};

export default ChatWidget;
