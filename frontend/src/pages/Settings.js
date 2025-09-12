import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
// Inline alert will be used instead of page-toasts

const tabs = [
  { id: 'profile', label: 'Profile Settings' },
  { id: 'password', label: 'Password' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'verification', label: 'Verification' },
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
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6">Account settings</h1>

      {/* alert moved here so it shows above the tabs/content */}
      {alert.message && (
        <div className={`mb-4 p-3 rounded-md ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`} role="alert">
          <div className="flex justify-between items-center">
            <div>{alert.message}</div>
            <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <aside className="w-64 bg-white border rounded-md p-4">
          <nav className="space-y-2">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className={`w-full text-left px-3 py-2 rounded-md ${active === t.id ? 'bg-primary-600 text-white' : 'text-gray-700'}`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="flex-1 bg-white border rounded-md p-6">
          {active === 'profile' && (
            <div className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-28 h-28 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-400">No avatar</div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-block">
                    <input type="file" accept="image/*" onChange={handleAvatar} className="sr-only" />
                    <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer">Upload New</span>
                  </label>
                  <button className="px-3 py-2 bg-gray-100 rounded-md">Delete avatar</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700">First Name</label>
                  <input name="firstName" value={form.firstName} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Last Name</label>
                  <input name="lastName" value={form.lastName} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Email</label>
                  <input name="email" value={form.email} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Mobile Number</label>
                  <input name="phone" value={form.phone} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Gender</label>
                  <select name="gender" value={form.gender} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2">
                    <option value="">Choose</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700">ID</label>
                  <input name="idNumber" value={form.idNumber || ''} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2 bg-gray-50" />
                </div>
                {/* Tax Identification Number and Country removed */}
                <div>
                  <label className="block text-sm text-gray-700">Username</label>
                  <input name="username" value={form.username} readOnly className="mt-1 block w-full border rounded-md p-2 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Department</label>
                  <input name="department" value={form.department} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Role</label>
                  <input name="role" value={form.role} readOnly className="mt-1 block w-full border rounded-md p-2 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Status</label>
                  {user?.role === 'admin' ? (
                    <select name="status" value={form.status} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2">
                      <option value="active">active</option>
                      <option value="inactive">inactive</option>
                      <option value="pending">pending</option>
                      <option value="suspended">suspended</option>
                    </select>
                  ) : (
                    <input name="status" value={form.status} readOnly className="mt-1 block w-full border rounded-md p-2 bg-gray-50" />
                  )}
                </div>
                <div>
                  <label className="block text-sm text-gray-700">Created</label>
                  <input name="createdAt" value={form.createdAt ? new Date(form.createdAt).toLocaleString() : ''} readOnly className="mt-1 block w-full border rounded-md p-2 bg-gray-50" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-gray-700">Residential Address</label>
                  <textarea name="address" value={form.address} onChange={handleChange} className="mt-1 block w-full border rounded-md p-2 h-24" />
                </div>
              </div>

              <div>
                <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md">{saving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </div>
          )}

          {active === 'password' && (
            <div>
              <h2 className="text-lg font-medium">Change password</h2>
              <div className="mt-4 max-w-md">
                <label className="block text-sm text-gray-700">Current password</label>
                <input name="currentPassword" value={pwd.currentPassword} onChange={handlePwdChange} type="password" className="mt-1 block w-full border rounded-md p-2" />
                <label className="block text-sm text-gray-700 mt-3">New password</label>
                <input name="newPassword" value={pwd.newPassword} onChange={handlePwdChange} type="password" className="mt-1 block w-full border rounded-md p-2" />
                <label className="block text-sm text-gray-700 mt-3">Confirm password</label>
                <input name="confirmPassword" value={pwd.confirmPassword} onChange={handlePwdChange} type="password" className="mt-1 block w-full border rounded-md p-2" />
                <div className="mt-4">
                  <button onClick={async () => {
                    // clear existing alerts
                    setAlert({ type: '', message: '' });
                    if (!pwd.currentPassword || !pwd.newPassword) {
                      setAlert({ type: 'error', message: 'Fill both fields' });
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
                  }} className="px-4 py-2 bg-blue-600 text-white rounded-md">Update password</button>
                </div>
              </div>
            </div>
          )}


          {active === 'notifications' && (
            <div>
              <h2 className="text-lg font-medium">Notifications</h2>
              <div className="mt-4 space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" />
                  <span>Email me about important updates</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" />
                  <span>Send me weekly reports</span>
                </label>
              </div>
            </div>
          )}

          {active === 'verification' && (
            <div>
              <h2 className="text-lg font-medium">Verification</h2>
              <p className="mt-2 text-sm text-gray-600">Verify your identity by uploading a government ID.</p>
              <div className="mt-4">
                <input type="file" accept="image/*,.pdf" />
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Settings;
