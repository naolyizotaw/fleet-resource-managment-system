import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fuelAPI, vehiclesAPI } from '../services/api';
import { Fuel as FuelIcon, Plus, Search, Filter, Truck, AlertCircle, CheckCircle, Clock, Edit, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

const FuelPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    fuelType: 'petrol',
    quantity: '',
    currentKm: '',
    purpose: '',
    cost: '',
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let fuelRes;
      
      const isPrivileged = user.role === 'admin' || user.role === 'manager';
      if (isPrivileged) {
        fuelRes = await fuelAPI.getAll();
      } else {
        try {
          fuelRes = await fuelAPI.getMyRequests();
        } catch (err) {
          if (err.response && err.response.status === 404) {
            // Backend returns 404 when no requests; treat as empty list
            setRequests([]);
            fuelRes = null;
          } else {
            throw err;
          }
        }
      }

      // Fetch vehicles only for admin/manager (drivers cannot access vehicle list)
      let vehiclesData = [];
      if (isPrivileged) {
        const vehiclesRes = await vehiclesAPI.getAll();
        vehiclesData = vehiclesRes.data || [];
      }

      const requestsData = fuelRes ? (fuelRes.data || []) : [];

      // For privileged users, backfill any vehicle docs missing from the list using per-id requests
      if (isPrivileged && Array.isArray(requestsData) && requestsData.length) {
        const idsFromRequests = Array.from(new Set(requestsData
          .map(r => (typeof (r.vehicleId ?? r.vehicle) === 'string' ? (r.vehicleId ?? r.vehicle) : (r.vehicleId ?? r.vehicle)?._id))
          .filter(Boolean)));
        const knownIds = new Set(vehiclesData.map(v => v._id));
        const missingIds = idsFromRequests.filter(id => !knownIds.has(id));
        if (missingIds.length) {
          const fetched = await Promise.all(
            missingIds.slice(0, 20).map(id => vehiclesAPI.getById(id).then(res => res.data).catch(() => null))
          );
          vehiclesData = vehiclesData.concat(fetched.filter(Boolean));
        }
      }

      setVehicles(isPrivileged ? vehiclesData : []);
      setRequests(requestsData);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Build a sanitized payload: skip empty strings and cast numbers
      const sanitize = (val, asNumber = false) => {
        if (val === '' || val === null || val === undefined) return undefined;
        return asNumber ? Number(val) : val;
      };
      const payload = {};
      const maybe = (k, v) => { if (v !== undefined) payload[k] = v; };
      maybe('vehicleId', sanitize(formData.vehicleId));
      maybe('fuelType', sanitize(formData.fuelType));
      maybe('quantity', sanitize(formData.quantity, true));
      maybe('currentKm', sanitize(formData.currentKm, true));
      maybe('purpose', sanitize(formData.purpose));
      maybe('cost', sanitize(formData.cost, true));

      if (editingRequest) {
        await fuelAPI.update(editingRequest._id, payload);
        await fetchData();
        toast.success('Fuel request updated successfully');
      } else {
        await fuelAPI.create(payload);
        await fetchData();
        toast.success('Fuel request created successfully');
      }
      
      setShowModal(false);
      setEditingRequest(null);
      resetForm();
    } catch (error) {
      console.error('Error saving fuel request:', error);
      const msg = error?.response?.data?.message || 'Failed to save fuel request';
      toast.error(msg);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      vehicleId: (typeof request.vehicleId === 'object' ? request.vehicleId?._id : request.vehicleId) || '',
      fuelType: request.fuelType || 'petrol',
      quantity: request.quantity || '',
      currentKm: request.currentKm || '',
      purpose: request.purpose || '',
      cost: request.cost || '',
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      await fuelAPI.update(requestId, { status: newStatus });
  await fetchData();
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const confirmDelete = (request) => {
    setRequestToDelete(request);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    try {
      await fuelAPI.delete(requestToDelete._id);
      await fetchData();
      toast.success('Fuel request deleted');
      setShowDeleteModal(false);
      setRequestToDelete(null);
    } catch (error) {
      console.error('Error deleting fuel request:', error);
      const msg = error?.response?.data?.message || 'Failed to delete request';
      toast.error(msg);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      fuelType: 'petrol',
      quantity: '',
      currentKm: '',
      purpose: '',
      cost: '',
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

  // Build a quick lookup for vehicles by id
  const vehiclesById = useMemo(() => {
    const map = new Map();
    for (const v of vehicles) map.set(v._id, v);
    return map;
  }, [vehicles]);

  // Resolve a vehicle object from a request supporting both populated and id-only shapes
  const resolveVehicle = useCallback((req) => {
    const vField = req.vehicleId ?? req.vehicle; // support legacy 'vehicle'
    if (vField && typeof vField === 'object') return vField;
    if (typeof vField === 'string') return vehiclesById.get(vField) || null;
    return null;
  }, [vehiclesById]);

  const filteredRequests = requests.filter(request => {
    const vehicleObj = resolveVehicle(request);
    const manufacturer = vehicleObj?.manufacturer || '';
    const model = vehicleObj?.model || '';
    const plate = vehicleObj?.plateNumber || '';
    const matchesSearch = 
      request.purpose?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plate.toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-2xl font-bold text-gray-900">Fuel Requests</h1>
          <p className="text-gray-600">Manage fuel requests and approvals</p>
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
                placeholder="Search fuel requests..."
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
                <th className="table-header">Request</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Fuel Details</th>
                <th className="table-header">KM & Purpose</th>
                <th className="table-header">Requester</th>
                <th className="table-header">Approver</th>
                <th className="table-header">Approved Date</th>
                <th className="table-header">Status</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      {getStatusIcon(request.status)}
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          Fuel Request
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    {(() => {
                      const vehicleObj = resolveVehicle(request);
                      if (vehicleObj) {
                        return (
                          <div className="flex items-center">
                            <Truck className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900">
                              {vehicleObj.year ? `${vehicleObj.year} ` : ''}
                              {vehicleObj.manufacturer || ''} {vehicleObj.model || ''}
                              {vehicleObj.plateNumber ? ` - ${vehicleObj.plateNumber}` : ''}
                            </span>
                          </div>
                        );
                      }
                      const rawId = typeof (request.vehicleId ?? request.vehicle) === 'string' ? (request.vehicleId ?? request.vehicle) : '';
                      return <span className="text-sm text-gray-500">{rawId ? `Vehicle ID: ${rawId.slice(0, 6)}…` : 'Unknown Vehicle'}</span>;
                    })()}
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">
                      <div className="capitalize">{request.fuelType}</div>
                      <div className="text-gray-500">
                        {request.quantity}L at ${request.cost || 0}
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{request.currentKm}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]" title={request.purpose}>{request.purpose}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{typeof request.requestedBy === 'object' ? request.requestedBy?.username : ''}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{typeof request.approvedBy === 'object' ? request.approvedBy?.username : '-'}</div>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900">{request.issuedDate ? new Date(request.issuedDate).toLocaleDateString() : '-'}</div>
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getStatusBadgeColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="table-cell">
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
                            onClick={() => confirmDelete(request)}
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
            <FuelIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No fuel requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new fuel request.'
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
                  {editingRequest ? 'Edit Fuel Request' : 'New Fuel Request'}
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
                          {vehicle.year ? `${vehicle.year} ` : ''}{vehicle.manufacturer} {vehicle.model} - {vehicle.plateNumber || 'No Plate'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData({...formData, fuelType: e.target.value})}
                        className="input-field mt-1"
                      >
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="electric">Electric</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity (L)</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="input-field mt-1"
                        placeholder="0"
                        min="0"
                        step="0.1"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Kilometers</label>
                      <input
                        type="number"
                        value={formData.currentKm}
                        onChange={(e) => setFormData({...formData, currentKm: e.target.value})}
                        className="input-field mt-1"
                        placeholder="0"
                        min="0"
                        step="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Purpose</label>
                      <input
                        type="text"
                        value={formData.purpose}
                        onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                        className="input-field mt-1"
                        placeholder="Reason for request"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Cost ($)</label>
                    <input
                      type="number"
                      value={formData.cost}
                      onChange={(e) => setFormData({...formData, cost: e.target.value})}
                      className="input-field mt-1"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full">
               <div className="p-6 text-center">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                    <FuelIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Delete Fuel Request</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Are you sure you want to delete this fuel request? This action cannot be undone.
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

export default FuelPage;
