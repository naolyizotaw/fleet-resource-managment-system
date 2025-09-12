import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, authAPI } from '../services/api';
import { Users as UsersIcon, Plus, Trash2, Edit, Search, Filter, ChevronDown, Copy, Check, Mail, Unlock, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Users = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  role: 'user',
  fullName: '',
  email: '',
  phone: '',
  department: '',
  status: 'active',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      if (editingUser) {
        const updateData = { ...formData };
        delete updateData.password;
        delete updateData.confirmPassword;
        
        await usersAPI.update(editingUser._id, updateData);
        await fetchUsers();
        toast.success('User updated successfully');
      } else {
        // Use the protected admin register endpoint to create users
        await authAPI.register({
          username: formData.username,
          password: formData.password,
          role: formData.role,
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          status: formData.status,
        });
        toast.success('User created successfully');
        await fetchUsers(); // Refetch since register returns only a message
      }
      
      setShowModal(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error(error.response?.data?.message || 'Failed to save user');
    }
  };

  const handleEdit = (userItem) => {
    setEditingUser(userItem);
    setFormData({
  username: userItem.username || '',
  password: '',
  confirmPassword: '',
  role: userItem.role || 'user',
  fullName: userItem.fullName || '',
  email: userItem.email || '',
  phone: userItem.phone || '',
  department: userItem.department || '',
  status: userItem.status || 'active',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      confirmPassword: '',
  role: 'user',
  fullName: '',
  email: '',
  phone: '',
  department: '',
  status: 'active',
    });
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await usersAPI.delete(userToDelete._id);
      setUsers(users.filter(u => u._id !== userToDelete._id));
      toast.success('User deleted successfully');
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const confirmDelete = (userItem) => {
    setUserToDelete(userItem);
    setShowDeleteModal(true);
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'inactive':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const [statusMenuOpenId, setStatusMenuOpenId] = useState(null);
  const [copiedUsername, setCopiedUsername] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalUser, setEmailModalUser] = useState(null);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetMessages, setResetMessages] = useState({});
  // allowed statuses are defined inline where needed

  const toggleStatusMenu = (id) => {
    setStatusMenuOpenId(prev => (prev === id ? null : id));
  };

  const handleChangeStatus = async (id, newStatus) => {
    // prevent changing to same status
    const userItem = users.find(u => u._id === id);
    if (!userItem || userItem.status === newStatus) {
      setStatusMenuOpenId(null);
      return;
    }

    // optimistic update
    const prevUsers = [...users];
    setUsers(prev => prev.map(u => u._id === id ? { ...u, status: newStatus } : u));
    setStatusMenuOpenId(null);

    try {
      await usersAPI.update(id, { status: newStatus });
      toast.success('Status updated');
    } catch (err) {
      console.error('Failed to update status', err);
      // rollback
      setUsers(prevUsers);
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
  setCopiedUsername(text);
  toast.success('Username copied');
  // clear visual feedback after 2s
  setTimeout(() => setCopiedUsername(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
      toast.error('Failed to copy');
    }
  };

  const openEmailModal = (userItem) => {
    setEmailModalUser(userItem);
    setEmailSubject('');
    setEmailBody('');
    setEmailModalOpen(true);
  };

  const closeEmailModal = () => {
    setEmailModalOpen(false);
    setEmailModalUser(null);
    setEmailSubject('');
    setEmailBody('');
  };

  const handleSendEmail = (e) => {
    e?.preventDefault?.();
    if (!emailModalUser || !emailModalUser.email) {
      toast.error('No recipient email');
      return;
    }
    const mailto = `mailto:${emailModalUser.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    // open user's mail client
    window.location.href = mailto;
    toast.success('Opening mail client');
    closeEmailModal();
  };

  const filteredUsers = users.filter(userItem => {
    const q = (searchTerm || '').toLowerCase();
    const matchesRole = roleFilter === 'all' || userItem.role === roleFilter;
    if (!q) return matchesRole;

    const combined = [userItem.fullName, userItem.username, userItem.email, userItem.phone, userItem.department]
      .filter(Boolean).map(s => String(s).toLowerCase()).join(' ');

    return matchesRole && combined.includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-gray-600">Manage all users in the system</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
          <div className="p-2 bg-primary-100 rounded-lg">
            <UsersIcon className="h-6 w-6 text-primary-600" />
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="user">Driver</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Full Name</th>
                <th className="table-header">Username</th>
                <th className="table-header">Role</th>
                <th className="table-header">Email</th>
                <th className="table-header">Phone</th>
                <th className="table-header">Department</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((userItem) => (
                <tr key={userItem._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <button onClick={() => handleEdit(userItem)} className="text-sm font-medium text-gray-900 hover:underline text-left truncate">
                          {userItem.fullName || '—'}
                        </button>
                      </div>

                      {/* removed fullname copy button per request */}
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button onClick={() => handleEdit(userItem)} className="text-sm font-medium text-gray-900 hover:underline">
                          {'@' + ((userItem.username || '').toLowerCase())}
                        </button>
                        <button onClick={() => copyToClipboard(userItem.username)} className="text-gray-400 hover:text-gray-600 relative" title="Copy username" aria-label={`Copy username ${userItem.username}`}>
                          {copiedUsername === userItem.username ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {copiedUsername === userItem.username && (
                            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1">Copied</span>
                          )}
                        </button>
                      </div>
                      <div className="text-sm text-gray-500">ID: {userItem._id?.slice(-6)}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getRoleBadgeColor(userItem.role)}`}>{userItem.role}</span>
                  </td>
                  <td className="table-cell">
                    {userItem.email ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEmailModal(userItem)}
                          className="text-sm text-gray-900 hover:underline flex items-center space-x-1"
                          title={`Compose email to ${userItem.email}`}
                          aria-label={`Compose email to ${userItem.email}`}
                        >
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span>{userItem.email}</span>
                        </button>

                        <button onClick={() => copyToClipboard(userItem.email)} className="text-gray-400 hover:text-gray-600 relative" title="Copy email" aria-label={`Copy email ${userItem.email}`}>
                          {copiedUsername === userItem.email ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {copiedUsername === userItem.email && (
                            <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs rounded px-2 py-1">Copied</span>
                          )}
                        </button>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-900">—</div>
                    )}
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{userItem.phone || '—'}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{userItem.department || '—'}</div>
                  </td>
                  <td className="table-cell relative">
                    { (user.role === 'admin' || user.role === 'manager') && userItem._id !== user._id ? (
                      <div className="relative inline-block text-left">
                        <button
                          type="button"
                          onClick={() => toggleStatusMenu(userItem._id)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(userItem.status)}`}
                          aria-expanded={statusMenuOpenId === userItem._id}
                        >
                          <span className="capitalize">{userItem.status || '—'}</span>
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </button>

                        {statusMenuOpenId === userItem._id && (
                          <div className="origin-top-right absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                            <div className="py-1">
                              {['active','pending','suspended','inactive'].map(s => (
                                <button
                                  key={s}
                                  onClick={() => handleChangeStatus(userItem._id, s)}
                                  className={`w-full text-left px-4 py-2 text-sm ${userItem.status === s ? 'font-semibold bg-gray-50' : 'hover:bg-gray-100'}`}
                                >
                                  <span className="capitalize">{s}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(userItem.status)}`}>
                        {userItem.status || '—'}
                      </span>
                    )}
                  </td>
                  <td className="table-cell">
                    {userItem.createdAt ? new Date(userItem.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(userItem)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                        title="Edit user"
                        aria-label="Edit user"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user.role === 'admin' && userItem._id !== user._id && (
                        <button
                          onClick={() => { setResetUser(userItem); setResetModalOpen(true); setResetPasswordValue(''); }}
                          className="flex items-center justify-center w-8 h-8 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 shadow-sm"
                          title="Reset password"
                          aria-label="Reset password"
                        >
                          <Unlock className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => confirmDelete(userItem)}
                        disabled={userItem._id === user._id}
                        className={`flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm ${userItem._id === user._id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={userItem._id === user._id ? "Cannot delete yourself" : "Delete user"}
                        aria-label={userItem._id === user._id ? "Cannot delete yourself" : "Delete user"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {resetMessages[userItem._id] && (
                      <div className="mt-2">
                        <div className={`rounded-md p-2 text-sm ${resetMessages[userItem._id].type === 'success' ? 'bg-green-50 border-l-4 border-green-500 text-green-800' : 'bg-red-50 border-l-4 border-red-500 text-red-800'}`}>
                          {resetMessages[userItem._id].text}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || roleFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new user.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                        className="input-field mt-1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="input-field mt-1"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="input-field mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="input-field mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="input-field mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <select
                          value={formData.status}
                          onChange={(e) => setFormData({...formData, status: e.target.value})}
                          className="input-field mt-1"
                        >
                          <option value="active">Active</option>
                          <option value="pending">Pending</option>
                          <option value="suspended">Suspended</option>
                          <option value="inactive">Inactive</option>
                        </select>
                    </div>
                  </div>
                  
                  {!editingUser && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Password</label>
                        <input
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          className="input-field mt-1"
                          required={!editingUser}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                          className="input-field mt-1"
                          required={!editingUser}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="input-field mt-1"
                    >
                      <option value="user">Driver</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingUser(null);
                        resetForm();
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                    >
                      {editingUser ? 'Update User' : 'Create User'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Compose Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Compose Email</h3>
                <form onSubmit={handleSendEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">To</label>
                    <div className="mt-1 text-sm text-gray-900">{emailModalUser?.email}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Subject</label>
                    <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="input-field mt-1" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Message</label>
                    <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} className="input-field mt-1 h-28" />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={closeEmailModal} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Send</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal (admin) */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Reset Password for {resetUser?.username}</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!resetPasswordValue || resetPasswordValue.length < 6) {
                    // keep existing inline validation behavior
                    toast.error('Password must be at least 6 characters');
                    return;
                  }
                  try {
                    await usersAPI.resetPassword(resetUser._id, { newPassword: resetPasswordValue });
                    // set a per-user inline message instead of a toast
                    setResetMessages(prev => ({ ...prev, [resetUser._id]: { type: 'success', text: 'Password reset successfully' } }));
                    // auto-clear after 8 seconds
                    setTimeout(() => setResetMessages(prev => { const copy = { ...prev }; delete copy[resetUser._id]; return copy; }), 8000);
                    setResetModalOpen(false);
                    setResetUser(null);
                    setResetPasswordValue('');
                  } catch (err) {
                    console.error('Reset failed', err);
                    const msg = err.response?.data?.message || 'Failed to reset password';
                    setResetMessages(prev => ({ ...prev, [resetUser._id]: { type: 'error', text: msg } }));
                    // auto-clear after 8 seconds
                    setTimeout(() => setResetMessages(prev => { const copy = { ...prev }; delete copy[resetUser._id]; return copy; }), 8000);
                  }
                }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New password</label>
                    <input type="password" value={resetPasswordValue} onChange={(e) => setResetPasswordValue(e.target.value)} className="input-field mt-1" />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={() => { setResetModalOpen(false); setResetUser(null); setResetPasswordValue(''); }} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Reset Password</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete user <strong>{userToDelete?.username}</strong>? 
                        This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeleteUser}
                  className="btn-danger w-full sm:w-auto sm:ml-3"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="btn-secondary w-full sm:w-auto mt-3 sm:mt-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
