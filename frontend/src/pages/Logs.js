import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logsAPI, vehiclesAPI } from '../services/api';
import { FileText, Plus, Search, Filter, Truck, Calendar, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const Logs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    startLocation: '',
    endLocation: '',
    startOdometer: '',
    endOdometer: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let logsRes;
      
      if (user.role === 'admin' || user.role === 'manager') {
        logsRes = await logsAPI.getAll();
      } else {
        logsRes = await logsAPI.getMyLogs();
      }
      
      const vehiclesRes = await vehiclesAPI.getAll();
      
      setLogs(logsRes.data);
      setVehicles(vehiclesRes.data);
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
      if (editingLog) {
        await logsAPI.update(editingLog._id, formData);
        setLogs(logs.map(l => l._id === editingLog._id ? { ...l, ...formData } : l));
        toast.success('Log updated successfully');
      } else {
        const response = await logsAPI.create(formData);
        setLogs([...logs, response.data]);
        toast.success('Log created successfully');
      }
      
      setShowModal(false);
      setEditingLog(null);
      resetForm();
    } catch (error) {
      console.error('Error saving log:', error);
      toast.error('Failed to save log');
    }
  };

  const handleEdit = (log) => {
    setEditingLog(log);
    setFormData({
      vehicleId: log.vehicleId || '',
      date: log.date ? new Date(log.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      startLocation: log.startLocation || '',
      endLocation: log.endLocation || '',
      startOdometer: log.startOdometer || '',
      endOdometer: log.endOdometer || '',
      notes: log.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;

    try {
      await logsAPI.delete(logId);
      setLogs(logs.filter(l => l._id !== logId));
      toast.success('Log deleted successfully');
    } catch (error) {
      console.error('Error deleting log:', error);
      toast.error('Failed to delete log');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      date: new Date().toISOString().split('T')[0],
      startLocation: '',
      endLocation: '',
      startOdometer: '',
      endOdometer: '',
      notes: '',
    });
  };

  const calculateDistance = (start, end) => {
    if (!start || !end) return 0;
    const distance = parseFloat(end) - parseFloat(start);
    return distance > 0 ? distance : 0;
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.startLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.endLocation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicles.find(v => v._id === log.vehicleId)?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicles.find(v => v._id === log.vehicleId)?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVehicle = vehicleFilter === 'all' || log.vehicleId === vehicleFilter;
    return matchesSearch && matchesVehicle;
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
          <h1 className="text-2xl font-bold text-gray-900">Driver Logs</h1>
          <p className="text-gray-600">Manage daily trip logs and odometer readings</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Log</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(vehicle => (
                <option key={vehicle._id} value={vehicle._id}>
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Log Entry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-primary-600" />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          Trip Log
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(log.date).toLocaleDateString()}
                        </div>
                        {log.notes && (
                          <div className="text-xs text-gray-400">
                            {log.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vehicles.find(v => v._id === log.vehicleId) ? (
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {vehicles.find(v => v._id === log.vehicleId)?.year} {' '}
                          {vehicles.find(v => v._id === log.vehicleId)?.make} {' '}
                          {vehicles.find(v => v._id === log.vehicleId)?.model}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unknown Vehicle</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center mb-1">
                        <MapPin className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-gray-600">Start: {log.startLocation}</span>
                      </div>
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-gray-600">End: {log.endLocation}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="text-gray-500">
                        Start: {log.startOdometer} km
                      </div>
                      <div className="text-gray-500">
                        End: {log.endOdometer} km
                      </div>
                      <div className="font-medium text-primary-600">
                        Total: {calculateDistance(log.startOdometer, log.endOdometer)} km
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(log)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                      {(user.role === 'admin') && (
                        <button
                          onClick={() => handleDelete(log._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || vehicleFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new log entry.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Log Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingLog ? 'Edit Log Entry' : 'New Log Entry'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                    <select
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                      className="input-field mt-1"
                      required
                    >
                      <option value="">Select Vehicle</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle._id} value={vehicle._id}>
                          {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.licensePlate || 'No Plate'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="input-field mt-1"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Location</label>
                      <input
                        type="text"
                        value={formData.startLocation}
                        onChange={(e) => setFormData({...formData, startLocation: e.target.value})}
                        className="input-field mt-1"
                        placeholder="Starting point..."
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Location</label>
                      <input
                        type="text"
                        value={formData.endLocation}
                        onChange={(e) => setFormData({...formData, endLocation: e.target.value})}
                        className="input-field mt-1"
                        placeholder="Destination..."
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Odometer (km)</label>
                      <input
                        type="number"
                        value={formData.startOdometer}
                        onChange={(e) => setFormData({...formData, startOdometer: e.target.value})}
                        className="input-field mt-1"
                        placeholder="0"
                        min="0"
                        step="0.1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Odometer (km)</label>
                      <input
                        type="number"
                        value={formData.endOdometer}
                        onChange={(e) => setFormData({...formData, endOdometer: e.target.value})}
                        className="input-field mt-1"
                        placeholder="0"
                        min="0"
                        step="0.1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="input-field mt-1"
                      rows="3"
                      placeholder="Any additional information about the trip..."
                    />
                  </div>
                </form>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="btn-primary w-full sm:w-auto sm:ml-3"
                >
                  {editingLog ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingLog(null);
                    resetForm();
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

export default Logs;
