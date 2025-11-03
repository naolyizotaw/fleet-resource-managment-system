import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, authAPI } from '../services/api';
import { Users as UsersIcon, Plus, Trash2, Edit, Search, Filter, ChevronDown, Copy, Check, Mail, Unlock, User, UserCircle, AtSign, Phone, Building2, Shield, Key, Lock } from 'lucide-react';
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
  const [alert, setAlert] = useState({ type: '', message: '' });

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
      setAlert({ type: 'error', message: 'Failed to fetch users' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setAlert({ type: 'error', message: 'Passwords do not match' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      return;
    }

    try {
      if (editingUser) {
        const updateData = { ...formData };
        delete updateData.password;
        delete updateData.confirmPassword;
        
        await usersAPI.update(editingUser._id, updateData);
        await fetchUsers();
        setAlert({ type: 'success', message: 'User updated successfully' });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
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
        setAlert({ type: 'success', message: 'User created successfully' });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
        await fetchUsers(); // Refetch since register returns only a message
      }
      
      setShowModal(false);
      setEditingUser(null);
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to save user' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
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
      setAlert({ type: 'success', message: 'User deleted successfully' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setAlert({ type: 'error', message: 'Failed to delete user' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
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
      setAlert({ type: 'success', message: 'Status updated' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } catch (err) {
      console.error('Failed to update status', err);
      // rollback
      setUsers(prevUsers);
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update status' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text || '');
  setCopiedUsername(text);
    setAlert({ type: 'success', message: 'Username copied' });
    setTimeout(() => setAlert({ type: '', message: '' }), 2000);
  // clear visual feedback after 2s
  setTimeout(() => setCopiedUsername(null), 2000);
    } catch (err) {
      console.error('Copy failed', err);
        setAlert({ type: 'error', message: 'Failed to copy' });
        setTimeout(() => setAlert({ type: '', message: '' }), 2000);
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
      setAlert({ type: 'error', message: 'No recipient email' });
      setTimeout(() => setAlert({ type: '', message: '' }), 3000);
      return;
    }
    const mailto = `mailto:${emailModalUser.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    // open user's mail client
    window.location.href = mailto;
    setAlert({ type: 'success', message: 'Opening mail client' });
    setTimeout(() => setAlert({ type: '', message: '' }), 3000);
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
      {alert.message && (
        <div className={`mb-4 p-3 rounded-md ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`} role="alert">
          <div className="flex justify-between items-center">
            <div>{alert.message}</div>
            <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        </div>
      )}
      {/* Page Header - Colorful Modern Style */}
      <div className="relative bg-gradient-to-br from-purple-600 via-primary-600 to-blue-600 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}></div>
        
        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-30"></div>
                <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-2xl">
                  <UsersIcon className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px w-10 bg-white/40"></div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/70">Team Management</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-1">
                  Users Management
                </h1>
                <p className="text-white/80 font-semibold text-sm">Manage team members and access control</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowModal(true)}
                className="group relative px-6 py-3 bg-white text-primary-600 font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Plus className="h-5 w-5 relative z-10" />
                <span className="text-sm relative z-10">Add User</span>
              </button>
              
              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <UsersIcon className="h-4 w-4 text-white" />
                <span className="text-sm font-bold text-white">{filteredUsers.length} Total Users</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Search Users</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="md:w-64">
            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Filter Role</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="user">Driver</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 overflow-hidden">
        {/* Table Header with Colorful Accent */}
        <div className="relative bg-gradient-to-r from-white via-purple-50 to-white px-6 py-6 border-b-4 border-purple-500">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600"></div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-primary-600 rounded-xl blur opacity-30"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <UsersIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Team Members</h3>
                <p className="text-xs text-purple-600 font-bold mt-0.5">Active user accounts and permissions</p>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-purple-50 via-primary-50 to-blue-50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Full Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Username</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Role</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Email</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Phone</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Department</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Created</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-700 uppercase tracking-[0.1em] border-b-2 border-purple-200">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/90">
              {filteredUsers.map((userItem) => (
                <tr key={userItem._id} className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/50 transition-all border-b border-gray-100">
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
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl mb-4">
              <UsersIcon className="h-10 w-10 text-purple-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No users found</h3>
            <p className="text-sm text-gray-500 font-medium">
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
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }} />
            
            <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full overflow-hidden">
              {/* Top Gradient Bar */}
              <div className="relative h-2 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>

              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-primary-500 rounded-xl flex items-center justify-center shadow-lg">
                      <UsersIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {editingUser ? 'Edit User' : 'Create User'}
                      </h3>
                      <p className="text-sm text-gray-500 font-semibold mt-1">
                        {editingUser ? 'Update user account information' : 'Add a new team member to the system'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowModal(false); setEditingUser(null); resetForm(); }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="px-8 py-6 max-h-[65vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <UserCircle className="h-3.5 w-3.5 text-purple-600" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      required
                      placeholder="Enter full name"
                    />
                  </div>

                  {/* Username */}
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <AtSign className="h-3.5 w-3.5 text-blue-600" />
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                      required
                      placeholder="Choose a username"
                      disabled={editingUser}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div className="group">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-green-600" />
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                        placeholder="user@example.com"
                      />
                    </div>

                    {/* Phone */}
                    <div className="group">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-orange-600" />
                        Phone
                      </label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 transition-all"
                        placeholder="+251 912 345 678"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Department */}
                    <div className="group">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                        Department
                      </label>
                      <input
                        type="text"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        placeholder="Operations, Logistics, etc."
                      />
                    </div>

                    {/* Role */}
                    <div className="group">
                      <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-purple-600" />
                        Role *
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      >
                        <option value="user">Driver</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="group">
                    <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  
                  {!editingUser && (
                    <>
                      <div className="my-6 border-t-2 border-dashed border-gray-200"></div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Password */}
                        <div className="group">
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5 text-red-600" />
                            Password *
                          </label>
                          <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({...formData, password: e.target.value})}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                            required={!editingUser}
                            placeholder="Enter password"
                          />
                        </div>
                        
                        {/* Confirm Password */}
                        <div className="group">
                          <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Key className="h-3.5 w-3.5 text-red-600" />
                            Confirm Password *
                          </label>
                          <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all"
                            required={!editingUser}
                            placeholder="Confirm password"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingUser(null);
                        resetForm();
                      }}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold uppercase tracking-wide text-sm rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-2.5 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600 text-white font-black uppercase tracking-wide text-sm rounded-lg hover:shadow-xl hover:scale-105 transition-all"
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
