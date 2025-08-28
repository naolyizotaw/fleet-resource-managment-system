import React, { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import UserForm from '../components/UserForm';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (err) {
      setError('Failed to fetch users.');
      toast.error('Failed to fetch users.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSaveUser = async (formData) => {
    const promise = api.post('/auth/register', formData);
    toast.promise(promise, {
      loading: 'Adding user...',
      success: () => {
        fetchUsers();
        setIsModalOpen(false);
        return 'User added successfully!';
      },
      error: (err) => {
        console.error(err);
        return err.response?.data?.message || 'Failed to add user.';
      }
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      const promise = api.delete(`/users/${id}`);
      toast.promise(promise, {
        loading: 'Deleting user...',
        success: () => {
          fetchUsers();
          return 'User deleted successfully!';
        },
        error: (err) => {
          console.error(err);
          return 'Failed to delete user.';
        },
      });
    }
  };

  if (loading) return <div>Loading users...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Users</h2>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">
          + Add User
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user._id}>
                <td className="px-6 py-4 whitespace-nowrap">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap">{user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleDelete(user._id)} className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <UserForm
            onSave={handleSaveUser}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Users;
