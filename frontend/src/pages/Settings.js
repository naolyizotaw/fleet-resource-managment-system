import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { User, Lock, Bell, Shield, Mail, Phone, Building2, Calendar, Save } from 'lucide-react';
// Inline alert will be used instead of page-toasts

const tabs = [
  { id: 'profile', label: 'Profile Settings', icon: User },
  { id: 'password', label: 'Password', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'verification', label: 'Verification', icon: Shield },
];

const Settings = () => {
  const { user, updateUser } = useAuth();
  const [active, setActive] = useState('profile');
  const [form, setForm] = useState({
    firstName: user?.fullName?.split(' ')[0] || '',
    lastName: user?.fullName?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: '',
  // tin and country removed per request
  address: '',
  username: user?.username || '',
  department: user?.department || '',
  role: user?.role || '',
  status: user?.status || '',
  createdAt: user?.createdAt || '',
  });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePwdChange = (e) => {
    const { name, value } = e.target;
    setPwd(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatar = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
    // TODO: upload avatar to server
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload = {
        fullName: `${form.firstName} ${form.lastName}`.trim(),
        email: form.email,
        phone: form.phone,
        department: form.department,
  gender: form.gender || null,
      };
      // allow admins to change status
      if (user?.role === 'admin') {
        payload.status = form.status;
      }
  const res = await api.put('/api/users/me', payload);
  const updatedUser = res.data.user || res.data;
  updateUser(updatedUser);
  const msg = res.data.message || 'Profile saved successfully';
  setAlert({ type: 'success', message: msg });
  // auto-clear
  setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } catch (err) {
      console.error('Save profile failed', err);
      const message = err.response?.data?.message || 'Failed to save';
      setAlert({ type: 'error', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl overflow-hidden">
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
                  <Shield className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px w-10 bg-white/40"></div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/70">Account Management</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-1">
                  Settings
                </h1>
                <p className="text-white/80 font-semibold text-sm">Manage your profile and preferences</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
              <User className="h-4 w-4 text-white" />
              <span className="text-sm font-bold text-white">{user?.username}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {alert.message && (
        <div className={`p-4 rounded-xl ${alert.type === 'success' ? 'bg-green-50 border-l-4 border-green-500 text-green-800' : 'bg-red-50 border-l-4 border-red-500 text-red-800'}`} role="alert">
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold">{alert.message}</p>
            <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm font-bold underline">Dismiss</button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white rounded-xl shadow-md border border-gray-200 p-4">
          <nav className="space-y-2">
            {tabs.map(t => {
              const IconComponent = t.icon;
              const isActive = active === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActive(t.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg font-bold text-sm uppercase tracking-wide transition-all flex items-center gap-3 ${
                    isActive 
                      ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="flex-1 bg-white rounded-xl shadow-md border border-gray-200 p-8">
          {active === 'profile' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">Profile Settings</h2>
                <p className="text-sm text-gray-500 font-semibold">Update your personal information and preferences</p>
              </div>

              {/* Avatar Section */}
              <div className="flex items-center gap-6 p-6 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border-l-4 border-indigo-600">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 overflow-hidden flex items-center justify-center shadow-lg border-4 border-white">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-12 w-12 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide mb-2">Profile Picture</h3>
                  <div className="flex items-center gap-3">
                    <label className="inline-block">
                      <input type="file" accept="image/*" onChange={handleAvatar} className="sr-only" />
                      <span className="inline-block px-5 py-2.5 bg-indigo-600 text-white font-bold uppercase text-xs tracking-wide rounded-lg cursor-pointer hover:bg-indigo-700 transition-all">Upload New</span>
                    </label>
                    <button className="px-5 py-2.5 bg-gray-100 text-gray-700 font-bold uppercase text-xs tracking-wide rounded-lg hover:bg-gray-200 transition-all">Delete</button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">First Name</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Your first name" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Last Name</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Your last name" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-indigo-600" />
                    Email
                  </label>
                  <input name="email" value={form.email} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="your@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-indigo-600" />
                    Mobile Number
                  </label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="+251 912 345 678" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all">
                    <option value="">Choose</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">ID</label>
                  <input name="idNumber" value={form.idNumber || ''} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="ID Number" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Username</label>
                  <input name="username" value={form.username} readOnly className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-500 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                    Department
                  </label>
                  <input name="department" value={form.department} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Your department" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-indigo-600" />
                    Role
                  </label>
                  <input name="role" value={form.role} readOnly className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-500 cursor-not-allowed capitalize" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Status</label>
                  {user?.role === 'admin' ? (
                    <select name="status" value={form.status} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all capitalize">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  ) : (
                    <input name="status" value={form.status} readOnly className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-500 cursor-not-allowed capitalize" />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                    Created
                  </label>
                  <input name="createdAt" value={form.createdAt ? new Date(form.createdAt).toLocaleString() : ''} readOnly className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-500 cursor-not-allowed" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Residential Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none" rows="3" placeholder="Enter your full address" />
                </div>
              </div>

              <div className="flex items-center justify-end pt-6 border-t border-gray-200">
                <button onClick={handleSaveProfile} disabled={saving} className="px-8 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black uppercase tracking-wide text-sm rounded-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          )}

          {active === 'password' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">Change Password</h2>
                <p className="text-sm text-gray-500 font-semibold">Update your account password for security</p>
              </div>

              <div className="max-w-2xl space-y-5">
                <div className="p-6 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-l-4 border-red-500">
                  <div className="flex items-center gap-3 mb-2">
                    <Lock className="h-5 w-5 text-red-600" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Security Requirement</h3>
                  </div>
                  <p className="text-xs text-gray-700 font-semibold">Your password must be at least 8 characters long and contain a mix of letters and numbers.</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Current Password *</label>
                  <input 
                    name="currentPassword" 
                    value={pwd.currentPassword} 
                    onChange={handlePwdChange} 
                    type="password" 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                    placeholder="Enter current password"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">New Password *</label>
                  <input 
                    name="newPassword" 
                    value={pwd.newPassword} 
                    onChange={handlePwdChange} 
                    type="password" 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                    placeholder="Enter new password"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Confirm Password *</label>
                  <input 
                    name="confirmPassword" 
                    value={pwd.confirmPassword} 
                    onChange={handlePwdChange} 
                    type="password" 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all" 
                    placeholder="Confirm new password"
                  />
                </div>

                <div className="flex items-center justify-end pt-6 border-t border-gray-200">
                  <button onClick={async () => {
                    setAlert({ type: '', message: '' });
                    if (!pwd.currentPassword || !pwd.newPassword) {
                      setAlert({ type: 'error', message: 'Fill all required fields' });
                      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
                      return;
                    }
                    if (pwd.newPassword !== pwd.confirmPassword) {
                      setAlert({ type: 'error', message: 'Passwords do not match' });
                      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
                      return;
                    }
                    try {
                      const res = await api.put('/api/users/me/password', { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
                      setAlert({ type: 'success', message: res.data.message || 'Password updated' });
                      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
                    } catch (err) {
                      const msg = err.response?.data?.message || 'Failed to update password';
                      setAlert({ type: 'error', message: msg });
                      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
                    }
                  }} className="px-8 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-black uppercase tracking-wide text-sm rounded-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Update Password</span>
                  </button>
                </div>
              </div>
            </div>
          )}


          {active === 'notifications' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">Notifications</h2>
                <p className="text-sm text-gray-500 font-semibold">Manage your notification preferences</p>
              </div>

              <div className="max-w-2xl space-y-4">
                <label className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <div>
                    <div className="text-sm font-black text-gray-900 uppercase tracking-wide">Email Notifications</div>
                    <div className="text-xs text-gray-600 font-semibold mt-1">Receive email alerts about important updates and changes</div>
                  </div>
                </label>
                <label className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <div>
                    <div className="text-sm font-black text-gray-900 uppercase tracking-wide">Weekly Reports</div>
                    <div className="text-xs text-gray-600 font-semibold mt-1">Get weekly summary reports delivered to your inbox</div>
                  </div>
                </label>
                <label className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border-2 border-gray-200 hover:border-indigo-300 transition-all cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <div>
                    <div className="text-sm font-black text-gray-900 uppercase tracking-wide">Request Updates</div>
                    <div className="text-xs text-gray-600 font-semibold mt-1">Get notified when your requests are approved or rejected</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {active === 'verification' && (
            <div className="space-y-6">
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight mb-1">Verification</h2>
                <p className="text-sm text-gray-500 font-semibold">Verify your identity for enhanced security</p>
              </div>

              <div className="max-w-2xl">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-l-4 border-blue-500 mb-5">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Identity Verification</h3>
                  </div>
                  <p className="text-xs text-gray-700 font-semibold">Upload a government-issued ID to verify your identity. Accepted formats: JPG, PNG, PDF</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-3">Upload Document</label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-gray-300 border-dashed rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Shield className="h-10 w-10 text-gray-400 mb-3" />
                        <p className="mb-2 text-sm font-bold text-gray-700">Click to upload verification document</p>
                        <p className="text-xs text-gray-500">PDF, JPG, PNG (Max 5MB)</p>
                      </div>
                      <input type="file" accept="image/*,.pdf" className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
