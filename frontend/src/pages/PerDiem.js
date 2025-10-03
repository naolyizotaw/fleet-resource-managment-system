import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { perDiemAPI, vehiclesAPI, usersAPI } from '../services/api';
import { Receipt, Plus, Search, Filter, Truck, AlertCircle, CheckCircle, Clock, Calendar, Edit, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';

const PerDiem = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [formError, setFormError] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const rowRefs = useRef({});
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
  vehicleId: '',
  driverId: '',
  purpose: '',
  destination: '',
  startDate: '',
  endDate: '',
  numberOfDays: 1,
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
  let perDiemData = [];
      try {
        if (user.role === 'admin' || user.role === 'manager') {
          const res = await perDiemAPI.getAll();
          perDiemData = res.data;
        } else {
          const res = await perDiemAPI.getMyRequests();
          perDiemData = res.data;
        }
      } catch (err) {
        if (err?.response?.status === 404) {
          perDiemData = [];
        } else {
          throw err;
        }
      }

      const vehiclesRes = (user.role === 'admin' || user.role === 'manager')
        ? await vehiclesAPI.getAll()
        : await vehiclesAPI.getMine();
      // Load drivers for selection
      let driversRes = [];
      try {
        const res = await usersAPI.getDrivers();
        driversRes = res.data || [];
      } catch (e) {
        driversRes = [];
      }

      setRequests(perDiemData);
  setVehicles(vehiclesRes.data);
  setDrivers(driversRes);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deep link highlighting via ?highlight=<id>
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const targetId = params.get('highlight');
    if (!targetId) return;
    const el = rowRefs.current[targetId];
    if (el) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      setHighlightedId(targetId);
      const t = setTimeout(() => setHighlightedId(null), 4500);
      const newParams = new URLSearchParams(location.search);
      newParams.delete('highlight');
      navigate({ pathname: location.pathname, search: newParams.toString() ? `?${newParams.toString()}` : '' }, { replace: true });
      return () => clearTimeout(t);
    }
  }, [loading, requests, location.search, location.pathname, navigate]);

  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null); // Reset error on new submission
    setConflictInfo(null);
    
    try {
      if (editingRequest) {
        const response = await perDiemAPI.update(editingRequest._id, formData);
        setRequests(requests.map(r => r._id === editingRequest._id ? response.data : r));
        toast.success('Per diem request updated successfully');
      } else {
        const response = await perDiemAPI.create(formData);
        const created = response.data?.perDiemRequest || response.data; // controller returns { message, perDiemRequest }
        setRequests([...requests, created]);
        toast.success('Per diem request created successfully');
      }
      
      setShowModal(false);
      setEditingRequest(null);
      resetForm();
    } catch (error) {
      console.error('Error saving per diem request:', error);
      const errorMessage = error.response?.data?.message || 'Failed to save per diem request';
      
      if (error.response?.status === 409) {
        const { requestId, status } = error.response.data;
        setConflictInfo({
          message: errorMessage,
          requestId,
          status,
        });
      } else {
        setFormError(errorMessage);
      }
      toast.error(errorMessage);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      vehicleId: (typeof request.vehicleId === 'object' ? request.vehicleId?._id : request.vehicleId) || '',
      driverId: (typeof request.driverId === 'object' ? request.driverId?._id : request.driverId) || '',
      purpose: request.purpose || '',
      destination: request.destination || '',
      startDate: request.startDate ? new Date(request.startDate).toISOString().split('T')[0] : '',
      endDate: request.endDate ? new Date(request.endDate).toISOString().split('T')[0] : '',
      numberOfDays: request.numberOfDays ?? 1,
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
  const response = await perDiemAPI.update(requestId, { status: newStatus });
  const updated = response.data;
  setRequests(requests.map(r => r._id === requestId ? updated : r));
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (requestId) => {
    const confirmed = window.confirm('Are you sure you want to delete this per diem request?');
    if (!confirmed) return;
    try {
      await perDiemAPI.delete(requestId);
      setRequests(prev => prev.filter(r => r._id !== requestId));
      toast.success('Per diem request deleted');
    } catch (error) {
      console.error('Error deleting per diem request:', error);
      const msg = error?.response?.data?.message || 'Failed to delete per diem request';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      driverId: '',
      purpose: '',
      destination: '',
      startDate: '',
      endDate: '',
      numberOfDays: 1,
    });
  };

  // Auto-calculate numberOfDays when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const days = Math.floor((end - start) / msPerDay) + 1; // inclusive days
        if (days > 0 && days !== formData.numberOfDays) {
          setFormData((prev) => ({ ...prev, numberOfDays: days }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.startDate, formData.endDate]);

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

  const getUserDisplay = (userField) => {
    if (!userField) return '—';
    if (typeof userField === 'object') return userField.fullName || userField.username || userField.email || userField._id;
    return String(userField);
  };

  const getVehicleFromRequest = (request) => {
    if (request.vehicleId && typeof request.vehicleId === 'object') return request.vehicleId;
    return vehicles.find(v => v._id === request.vehicleId);
  };

  const viewExistingRequest = async (requestId) => {
    try {
      const response = await perDiemAPI.getById(requestId);
      handleEdit(response.data);
      setConflictInfo(null);
    } catch (error) {
      console.error('Error fetching existing request:', error);
      toast.error('Failed to load existing request.');
    }
  };

  const filteredRequests = requests.filter(request => {
    const vehicle = getVehicleFromRequest(request) || {};
    const matchesSearch =
      request.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase());
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
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trip Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval
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
                <tr
                  key={request._id}
                  ref={(el) => { if (el) rowRefs.current[request._id] = el; }}
                  className={`hover:bg-gray-50 ${highlightedId === request._id ? 'bg-yellow-50 ring-2 ring-amber-400' : ''}`}
                >
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
                    {(() => {
                      const vehicle = getVehicleFromRequest(request);
                      return vehicle ? (
                        <div className="flex items-center">
                          <Truck className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">
                            {vehicle.year ? `${vehicle.year} ` : ''}
                            {vehicle.manufacturer || ''} {vehicle.model || ''}
                            {vehicle.licensePlate ? ` - ${vehicle.licensePlate}` : vehicle.plateNumber ? ` - ${vehicle.plateNumber}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unknown Vehicle</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {(() => {
                        const vehicle = getVehicleFromRequest(request) || {};
                        const ad = vehicle.assignedDriver;
                        if (ad) {
                          return getUserDisplay(ad);
                        }
                        const d = request.driverId;
                        if (!d) return '—';
                        return getUserDisplay(d);
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        {request.startDate ? new Date(request.startDate).toLocaleDateString() : 'N/A'}
                        {' - '}
                        {request.endDate ? new Date(request.endDate).toLocaleDateString() : 'N/A'}
                        {request.numberOfDays ? <span className="ml-2 text-gray-500">({request.numberOfDays} day{request.numberOfDays > 1 ? 's' : ''})</span> : null}
                      </div>
                      <div className="text-gray-700 font-medium">
                        {request.purpose || '—'}
                      </div>
                      <div className="text-gray-500">
                        {request.destination || '—'}
                      </div>
                      <div className="text-gray-500">
                        Calc: {request.calculatedAmount ?? '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="text-gray-700">
                        Approved: {request.approvedAmount ?? '—'}
                      </div>
                      <div className="text-gray-500">
                        {request.approvedBy ? (
                          <>
                            By: {getUserDisplay(request.approvedBy)}
                          </>
                        ) : 'By: —'}
                      </div>
                      <div className="text-gray-500">
                        Issued: {request.issuedDate ? new Date(request.issuedDate).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(request)}
                          className="flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                          title="Edit"
                          aria-label="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {user.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(request._id)}
                            className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                            title="Delete"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {(user.role === 'admin' || user.role === 'manager') && request.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'approved')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100"
                            title="Approve"
                            aria-label="Approve"
                          >
                            <ThumbsUp className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100"
                            title="Reject"
                            aria-label="Reject"
                          >
                            <ThumbsDown className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
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

                {formError && (
                  <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                    <p className="text-sm text-red-800">{formError}</p>
                  </div>
                )}

                {conflictInfo && (
                  <div className="mb-4 p-3 rounded-md border border-red-200 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-800">{conflictInfo.message}</p>
                        <p className="text-xs text-red-700">Status: {conflictInfo.status}</p>
                      </div>
                      {conflictInfo.requestId && (
                        <button
                          onClick={() => viewExistingRequest(conflictInfo.requestId)}
                          className="ml-4 btn-secondary text-sm"
                          type="button"
                        >
                          View Existing
                        </button>
                      )}
                    </div>
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Driver</label>
                    <select
                      value={formData.driverId}
                      onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                      className="input-field mt-1"
                      required
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.fullName || d.username || d.email}
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Vehicle will be linked automatically if the driver has an assigned vehicle.</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purpose</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      className="input-field mt-1"
                      placeholder="Enter purpose..."
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="input-field mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        className="input-field mt-1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Number of Days</label>
                      <input
                        type="number"
                        value={formData.numberOfDays}
                        onChange={(e) => setFormData({...formData, numberOfDays: Number(e.target.value) })}
                        className="input-field mt-1"
                        min="1"
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
