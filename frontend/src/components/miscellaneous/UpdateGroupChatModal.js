import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { X, UserPlus, LogOut, Edit2, Search } from 'lucide-react';

const UpdateGroupChatModal = ({ isOpen, onClose, fetchMessages }) => {
    const [groupChatName, setGroupChatName] = useState("");
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [renameLoading, setRenameLoading] = useState(false);

    const { selectedChat, setSelectedChat, user } = useChat();
    const { user: currentUser } = useAuth();

    const handleRename = async () => {
        if (!groupChatName) return;

        try {
            setRenameLoading(true);
            const { data } = await api.put("http://localhost:7005/api/chat/rename", {
                chatId: selectedChat._id,
                chatName: groupChatName,
            });

            setSelectedChat(data);
            setRenameLoading(false);
            setGroupChatName("");
            toast.success("Group renamed successfully!");
        } catch (error) {
            console.error(error);
            setRenameLoading(false);
            toast.error("Failed to rename group");
        }
    };

    const handleSearch = async (query) => {
        setSearch(query);
        if (!query) {
            setSearchResults([]);
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.get(`http://localhost:7005/api/user?search=${query}`);
            setLoading(false);
            setSearchResults(data);
        } catch (error) {
            console.error(error);
            setLoading(false);
            toast.error("Failed to load search results");
        }
    };

    const handleAddUser = async (user1) => {
        if (selectedChat.users.find((u) => u._id === user1._id)) {
            toast.error("User already in group!");
            return;
        }

        if (selectedChat.groupAdmin._id !== (currentUser.id || currentUser._id)) {
            toast.error("Only admins can add someone!");
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.put("http://localhost:7005/api/chat/groupadd", {
                chatId: selectedChat._id,
                userId: user1._id,
            });

            setSelectedChat(data);
            setLoading(false);
        } catch (error) {
            toast.error(error.response?.data?.message || "Error Occurred");
            setLoading(false);
        }
    };

    const handleRemove = async (user1) => {
        if (selectedChat.groupAdmin._id !== (currentUser.id || currentUser._id) && user1._id !== (currentUser.id || currentUser._id)) {
            toast.error("Only admins can remove someone!");
            return;
        }

        try {
            setLoading(true);
            const { data } = await api.put("http://localhost:7005/api/chat/groupremove", {
                chatId: selectedChat._id,
                userId: user1._id,
            });

            user1._id === (currentUser.id || currentUser._id) ? setSelectedChat() : setSelectedChat(data);
            fetchMessages();
            setLoading(false);
            if (user1._id === (currentUser.id || currentUser._id)) {
                onClose(); // Close modal if user left
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Error Occurred");
            setLoading(false);
        }
    };

    if (!isOpen || !selectedChat) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{selectedChat.chatName}</h3>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded p-1 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Members List */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {selectedChat.users.map((u) => (
                            <div key={u._id} className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${selectedChat.groupAdmin._id === u._id ? 'bg-purple-100 text-purple-700' : 'bg-primary-100 text-primary-700'}`}>
                                {u.fullName || u.username}
                                {(selectedChat.groupAdmin._id === (currentUser.id || currentUser._id) || u._id === (currentUser.id || currentUser._id)) && (
                                    <button onClick={() => handleRemove(u)} className="hover:text-red-600 ml-1">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Rename Group - Admin Only */}
                    {selectedChat.groupAdmin._id === (currentUser.id || currentUser._id) && (
                        <div className="mb-6">
                            <label className="block text-xs font-black text-gray-600 uppercase mb-2">Rename Group</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="New Chat Name"
                                    className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary-500"
                                    value={groupChatName}
                                    onChange={(e) => setGroupChatName(e.target.value)}
                                />
                                <button
                                    onClick={handleRename}
                                    disabled={renameLoading}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {renameLoading ? '...' : <Edit2 size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Add Users - Admin Only */}
                    {selectedChat.groupAdmin._id === (currentUser.id || currentUser._id) && (
                        <div className="mb-4">
                            <label className="block text-xs font-black text-gray-600 uppercase mb-2">Add Member</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search users to add..."
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary-500"
                                    value={search}
                                    onChange={(e) => handleSearch(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Search Results */}
                    {loading ? (
                        <div className="text-center py-4"><div className="animate-spin h-6 w-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto"></div></div>
                    ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {searchResults?.slice(0, 4).map((user) => (
                                <div
                                    key={user._id}
                                    onClick={() => handleAddUser(user)}
                                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 text-xs font-bold">
                                        {(user.fullName || user.username).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">{user.fullName || user.username}</p>
                                        <p className="text-xs text-gray-500">{user.email}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Leave Group Button */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button
                        onClick={() => handleRemove(currentUser)}
                        className="px-6 py-2 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors flex items-center gap-2"
                    >
                        <LogOut size={16} />
                        Leave Group
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateGroupChatModal;
