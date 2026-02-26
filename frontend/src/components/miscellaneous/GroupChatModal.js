import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { X, Search } from 'lucide-react';

const GroupChatModal = ({ isOpen, onClose }) => {
    const [groupChatName, setGroupChatName] = useState("");
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const { user } = useAuth();
    const { chats, setChats } = useChat();

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

    const handleGroup = (userToAdd) => {
        if (selectedUsers.includes(userToAdd)) {
            toast.error("User already added");
            return;
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    };

    const handleDelete = (delUser) => {
        setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
    };

    const handleSubmit = async () => {
        if (!groupChatName || !selectedUsers) {
            toast.error("Please fill all the fields");
            return;
        }

        try {
            const { data } = await api.post("http://localhost:7005/api/chat/group", {
                name: groupChatName,
                users: JSON.stringify(selectedUsers.map((u) => u._id)),
            });
            setChats([data, ...chats]);
            onClose();
            toast.success("New Group Chat Created!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to create the chat!");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Create Group Chat</h3>
                    <button onClick={onClose} className="text-white hover:bg-white/20 rounded p-1 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    {/* Chat Name Input */}
                    <div className="mb-4">
                        <label className="block text-xs font-black text-gray-600 uppercase mb-2">Chat Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Maintenance Team"
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary-500 transition-all"
                            value={groupChatName}
                            onChange={(e) => setGroupChatName(e.target.value)}
                        />
                    </div>

                    {/* Add Users Input */}
                    <div className="mb-4">
                        <label className="block text-xs font-black text-gray-600 uppercase mb-2">Add Users</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search users to add..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary-500 transition-all"
                                value={search}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Selected Users Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {selectedUsers.map((u) => (
                            <div key={u._id} className="flex items-center gap-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-bold">
                                {u.fullName || u.username}
                                <button onClick={() => handleDelete(u)} className="hover:text-primary-900">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Search Results */}
                    <div className="space-y-2 max-h-40 overflow-y-auto mb-4">
                        {loading ? (
                            <p className="text-center text-sm text-gray-500">Loading...</p>
                        ) : (
                            searchResults?.slice(0, 4).map((user) => (
                                <div
                                    key={user._id}
                                    onClick={() => handleGroup(user)}
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
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button
                        onClick={handleSubmit}
                        className="px-6 py-2 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                        Create Chat
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupChatModal;
