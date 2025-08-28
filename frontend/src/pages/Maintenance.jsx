import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import MaintenanceRequestForm from '../components/MaintenanceRequestForm';

const Maintenance = () => {
  const { user } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const url = isManagerOrAdmin ? '/maintenance' : '/maintenance/my';
      const response = await api.get(url);
      setRequests(response.data);
    } catch (err) {
      setError('Failed to fetch maintenance requests.');
      toast.error('Failed to fetch maintenance requests.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleStatusUpdate = async (id, status) => {
    const promise = api.patch(`/maintenance/${id}`, { status });
    toast.promise(promise, {
      loading: 'Updating status...',
      success: () => {
        fetchRequests();
        return 'Status updated successfully!';
      },
      error: 'Failed to update status.',
    });
  };

  const handleSaveRequest = async (formData) => {
    const promise = api.post('/maintenance', formData);
    toast.promise(promise, {
      loading: 'Submitting request...',
      success: () => {
        fetchRequests();
        setIsModalOpen(false);
        return 'Request submitted successfully!';
      },
      error: 'Failed to submit request.',
    });
  };

  if (loading) return <div>Loading maintenance requests...</div>;
  if (error && requests.length === 0) return <div className="text-red-500">{error}</div>;

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Maintenance Requests</h2>
        {!isManagerOrAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">
            + New Request
          </button>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              {isManagerOrAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested Date</th>
              {isManagerOrAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {requests.map((req) => (
              <tr key={req._id}>
                <td className="px-6 py-4 whitespace-nowrap">{req.vehicleId?.plateNumber || 'N/A'}</td>
                {isManagerOrAdmin && <td className="px-6 py-4 whitespace-nowrap">{req.driverId?.username || 'N/A'}</td>}
                <td className="px-6 py-4 whitespace-nowrap">{req.category}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(req.requestedDate).toLocaleDateString()}</td>
                {isManagerOrAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {req.status === 'pending' && (
                      <>
                        <button onClick={() => handleStatusUpdate(req._id, 'approved')} className="text-green-600 hover:text-green-900 mr-4">Approve</button>
                        <button onClick={() => handleStatusUpdate(req._id, 'rejected')} className="text-red-600 hover:text-red-900">Reject</button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <MaintenanceRequestForm
            onSave={handleSaveRequest}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default Maintenance;
