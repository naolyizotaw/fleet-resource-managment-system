import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import DriverLogForm from '../components/DriverLogForm';

const DriverLogs = () => {
  const { user } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isManagerOrAdmin = user?.role === 'admin' || user?.role === 'manager';

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const url = isManagerOrAdmin ? '/logs' : '/logs/my';
      const response = await api.get(url);
      setLogs(response.data);
    } catch (err) {
      setError('Failed to fetch driver logs.');
      toast.error('Failed to fetch driver logs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const handleSaveLog = async (formData) => {
    const promise = api.post('/logs', formData);
    toast.promise(promise, {
      loading: 'Adding log...',
      success: () => {
        fetchLogs();
        setIsModalOpen(false);
        return 'Log added successfully!';
      },
      error: 'Failed to add log.',
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this log?')) {
      const promise = api.delete(`/logs/${id}`);
      toast.promise(promise, {
        loading: 'Deleting log...',
        success: () => {
          fetchLogs();
          return 'Log deleted successfully!';
        },
        error: 'Failed to delete log.',
      });
    }
  };

  if (loading) return <div>Loading driver logs...</div>;
  if (error && logs.length === 0) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Driver Logs</h2>
        {!isManagerOrAdmin && (
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">
            + Add Log
          </button>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              {isManagerOrAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distance (Km)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
              {isManagerOrAdmin && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => (
              <tr key={log._id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.vehicleId?.plateNumber || 'N/A'}</td>
                {isManagerOrAdmin && <td className="px-6 py-4 whitespace-nowrap">{log.driverId?.username || 'N/A'}</td>}
                <td className="px-6 py-4 whitespace-nowrap">{log.distance}</td>
                <td className="px-6 py-4 whitespace-nowrap">{log.remarks}</td>
                {isManagerOrAdmin && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onClick={() => handleDelete(log._id)} className="text-red-600 hover:text-red-900">Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <DriverLogForm
            onSave={handleSaveLog}
            onCancel={() => setIsModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default DriverLogs;
