import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { perDiemAPI, vehiclesAPI } from '../services/api';
import { Receipt, Plus, Search, Filter, Truck, AlertCircle, CheckCircle, Clock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const PerDiem = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    tripDate: '',
    destination: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      let perDiemRes;
      
      if (user.role === 'admin' || user.role === 'manager') {
        perDiemRes = await perDiemAPI.getAll();
      } else {
        perDiemRes = await perDiemAPI.getMyRequests();
      }
      
      const vehiclesRes = await vehiclesAPI.getAll();
      
      setRequests(perDiemRes.data);
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
      if (editingRequest) {
        await perDiemAPI.update(editingRequest._id, formData);
        setRequests(requests.map(r => r._id === editingRequest._id ? { ...r, ...formData } : r));
        toast.success('Per diem request updated successfully');
      } else {
        const response = await perDiemAPI.create(formData);
        setRequests([...requests, response.data]);
        toast.success('Per diem request created successfully');
      }
      
      setShowModal(false);
      setEditingRequest(null);
      resetForm();
    } catch (error) {
      console.error('Error saving per diem request:', error);
      toast.error('Failed to save per diem request');
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      vehicleId: request.vehicleId || '',
      tripDate: request.tripDate ? new Date(request.tripDate).toISOString().split('T')[0] : '',
      destination: request.destination || '',
      amount: request.amount || '',
      notes: request.notes || '',
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await perDiemAPI.update(requestId, { status: newStatus });
      setRequests(requests.map(r => r._id === requestId ? { ...r, status: newStatus } : r));
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      tripDate: '',
      destination: '',
      amount: '',
      notes: '',
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicles.find(v => v._id === request.vehicleId)?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicles.find(v => v._id === request.vehicleId)?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
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
          <h1 className="text-2xl font-bold text-gray-900">Per Diem Requests</h1>
          <p className="text-gray-600">Manage per diem requests for trips</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Request</span>
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
                placeholder="Search per diem requests..."
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
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          Per Diem Request
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                        {request.notes && (
                          <div className="text-xs text-gray-400">
                            {request.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {vehicles.find(v => v._id === request.vehicleId) ? (
                      <div className="flex items-center">
                        <Truck className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {vehicles.find(v => v._id === request.vehicleId)?.year} {' '}
                          {vehicles.find(v => v._id === request.vehicleId)?.make} {' '}
                          {vehicles.find(v => v._id === request.vehicleId)?.model}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unknown Vehicle</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        {request.tripDate ? new Date(request.tripDate).toLocaleDateString() : 'N/A'}
                      </div>
                      <div className="text-gray-500">
                        {request.destination}
                      </div>
                      <div className="text-gray-500">
                        ${request.amount}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      {(user.role === 'admin' || user.role === 'manager') && request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'approved')}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(request)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-8">
            <Receipt className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No per diem requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new per diem request.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Request Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {editingRequest ? 'Edit Per Diem Request' : 'New Per Diem Request'}
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
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Trip Date</label>
                      <input
                        type="date"
                        value={formData.tripDate}
                        onChange={(e) => setFormData({...formData, tripDate: e.target.value})}
                        className="input-field mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Amount ($)</label>
                      <input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                        className="input-field mt-1"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Destination</label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="input-field mt-1"
                      placeholder="Enter destination..."
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="input-field mt-1"
                      rows="3"
                      placeholder="Any additional information..."
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
                  {editingRequest ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRequest(null);
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

export default PerDiem;
