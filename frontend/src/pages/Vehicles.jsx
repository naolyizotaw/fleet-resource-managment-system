import React, { useState, useEffect } from 'react';
import api from '../services/api';
import VehicleForm from '../components/VehicleForm';
import toast from 'react-hot-toast';

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/vehicles');
      setVehicles(response.data);
    } catch (err) {
      setError('Failed to fetch vehicles.');
      toast.error('Failed to fetch vehicles.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleOpenModal = (vehicle = null) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setIsEditMode(true);
    } else {
      setEditingVehicle(null);
      setIsEditMode(false);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setIsEditMode(false);
  };

  const handleSave = async (formData) => {
    const promise = isEditMode
      ? api.put(`/vehicles/${editingVehicle._id}`, formData)
      : api.post('/vehicles', formData);

    toast.promise(promise, {
      loading: isEditMode ? 'Updating vehicle...' : 'Adding vehicle...',
      success: (res) => {
        fetchVehicles();
        handleCloseModal();
        return `Vehicle ${isEditMode ? 'updated' : 'added'} successfully!`;
      },
      error: (err) => {
        console.error(err);
        return `Failed to ${isEditMode ? 'update' : 'add'} vehicle.`;
      },
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      const promise = api.delete(`/vehicles/${id}`);
      toast.promise(promise, {
        loading: 'Deleting vehicle...',
        success: () => {
          fetchVehicles();
          return 'Vehicle deleted successfully!';
        },
        error: (err) => {
          console.error(err);
          return 'Failed to delete vehicle.';
        },
      });
    }
  };

  if (loading) return <div>Loading vehicles...</div>;
  if (error && vehicles.length === 0) return <div className="text-red-500">{error}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Manage Vehicles</h2>
        <button onClick={() => handleOpenModal()} className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700">
          + Add Vehicle
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plate Number</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vehicles.map((vehicle) => (
              <tr key={vehicle._id}>
                <td className="px-6 py-4 whitespace-nowrap">{vehicle.plateNumber}</td>
                <td className="px-6 py-4 whitespace-nowrap">{vehicle.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">{vehicle.model}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      vehicle.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button onClick={() => handleOpenModal(vehicle)} className="text-indigo-600 hover:text-indigo-900 mr-4">Edit</button>
                  <button onClick={() => handleDelete(vehicle._id)} className="text-red-600 hover:text-red-900">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <VehicleForm
            onSave={handleSave}
            onCancel={handleCloseModal}
            vehicle={editingVehicle}
            isEditMode={isEditMode}
          />
        </div>
      )}
    </div>
  );
};

export default Vehicles;
