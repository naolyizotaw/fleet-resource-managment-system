import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { vehiclesAPI, usersAPI } from '../services/api';
import { Truck, Plus, Trash2, Edit, Search, Filter, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Vehicles = () => {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);

  const initialFormData = {
    plateNumber: '',
    type: 'Automobile',
    model: '',
    manufacturer: '',
    year: '',
    fuelType: 'Petrol',
    currentKm: '',
    assignedDriver: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, usersRes] = await Promise.all([
        vehiclesAPI.getAll(),
        usersAPI.getDrivers(),
      ]);
      setVehicles(vehiclesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle._id, formData);
        toast.success('Vehicle updated successfully');
      } else {
        await vehiclesAPI.create(formData);
        toast.success('Vehicle created successfully');
      }
      fetchData(); // Refetch data to show changes
      setShowModal(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(error.response?.data?.message || 'Failed to save vehicle');
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plateNumber: vehicle.plateNumber || '',
      type: vehicle.type || 'Automobile',
      model: vehicle.model || '',
      manufacturer: vehicle.manufacturer || '',
      year: vehicle.year || '',
      fuelType: vehicle.fuelType || 'Petrol',
      currentKm: vehicle.currentKm || '',
      assignedDriver: vehicle.assignedDriver?._id || '',
      status: vehicle.status || 'active',
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      await vehiclesAPI.delete(vehicleToDelete._id);
      toast.success('Vehicle deleted successfully');
      fetchData(); // Refetch data
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      toast.error('Failed to delete vehicle');
    }
  };

  const confirmDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteModal(true);
  };
  
  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'under_maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      vehicle.plateNumber?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.manufacturer?.toLowerCase().includes(searchLower) ||
      vehicle.type?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          <h1 className="text-2xl font-bold text-gray-900">Vehicles Management</h1>
          <p className="text-gray-600">Manage fleet vehicles and driver assignments</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by plate, model, manufacturer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Plate #</th>
                <th className="table-header">Driver</th>
                <th className="table-header">Status</th>
                <th className="table-header">Current KM</th>
                <th className="table-header">Fuel Type</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Truck className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {vehicle.year} {vehicle.manufacturer} {vehicle.model}
                        </div>
                        <div className="text-sm text-gray-500">{vehicle.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{vehicle.plateNumber}</td>
                  <td className="table-cell">
                    {vehicle.assignedDriver ? (
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {vehicle.assignedDriver.username || 'Unknown'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getStatusBadgeColor(vehicle.status)}`}>
                      {vehicle.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell">{vehicle.currentKm?.toLocaleString()} km</td>
                  <td className="table-cell">{vehicle.fuelType}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(vehicle)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredVehicles.length === 0 && (
          <div className="text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding a new vehicle.'
              }
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Manufacturer</label>
                      <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className="input-field" />
                    </div>
                    <div>
                      <label className="form-label">Model</label>
                      <input type="text" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="input-field" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Year</label>
                      <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="input-field" />
                    </div>
                    <div>
                      <label className="form-label">Plate Number</label>
                      <input type="text" value={formData.plateNumber} onChange={(e) => setFormData({...formData, plateNumber: e.target.value})} className="input-field" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                      <label className="form-label">Type</label>
                      <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="input-field">
                        <option>Automobile</option>
                        <option>Light Duty</option>
                        <option>Heavy Duty</option>
                        <option>Machinery</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Fuel Type</label>
                      <select value={formData.fuelType} onChange={(e) => setFormData({...formData, fuelType: e.target.value})} className="input-field" required>
                        <option>Petrol</option>
                        <option>Diesel</option>
                        <option>Electric</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Current Kilometers</label>
                    <input type="number" value={formData.currentKm} onChange={(e) => setFormData({...formData, currentKm: e.target.value})} className="input-field" required />
                  </div>
                  <div>
                    <label className="form-label">Assigned Driver</label>
                    <select value={formData.assignedDriver} onChange={(e) => setFormData({...formData, assignedDriver: e.target.value})} className="input-field">
                      <option value="">Select Driver</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>{user.username}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="input-field">
                      <option value="active">Active</option>
                      <option value="under_maintenance">Under Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editingVehicle ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full">
               <div className="p-6 text-center">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <Truck className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Delete Vehicle</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Are you sure you want to delete this vehicle? This action cannot be undone.
                  </p>
                </div>
              <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="btn-secondary">Cancel</button>
                <button type="button" onClick={handleDelete} className="btn-danger">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;
