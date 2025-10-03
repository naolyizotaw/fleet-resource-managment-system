import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { maintenanceAPI, vehiclesAPI, usersAPI } from '../services/api';
import { Wrench, Plus, Search, Filter, Truck, Edit, Trash2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const Maintenance = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [usersMap, setUsersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [requestToComplete, setRequestToComplete] = useState(null);
  const [completeForm, setCompleteForm] = useState({ cost: '', remarks: '' });
  const [highlightedId, setHighlightedId] = useState(null);
  const rowRefs = useRef({});
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vehicleId: '',
  category: '',
    description: '',
    priority: 'medium',
    estimatedCost: '',
    notes: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      let maintenanceRes;
      
      if (user.role === 'admin' || user.role === 'manager') {
        maintenanceRes = await maintenanceAPI.getAll();
      } else {
        maintenanceRes = await maintenanceAPI.getMyRequests();
      }
      
      // For drivers/users fetch only vehicles assigned to them; admins/managers get all
      const vehiclesRes = (user.role === 'admin' || user.role === 'manager')
        ? await vehiclesAPI.getAll()
        : await vehiclesAPI.getMine();
      // fetch users to resolve requestedBy/approvedBy ids -> names
      // Admins get all users; managers get drivers list; other roles get none
      let usersList = [];
      try {
        if (user.role === 'admin') {
          const usersRes = await usersAPI.getAll();
          usersList = usersRes.data || [];
        } else if (user.role === 'manager') {
          const usersRes = await usersAPI.getDrivers();
          usersList = usersRes.data || [];
        } else {
          usersList = [];
        }
      } catch (e) {
        usersList = [];
      }

      const map = {};
      usersList.forEach(u => {
        // prefer server-side fullName when available
        const name = u.fullName || u.username || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim();
        map[String(u._id)] = name || String(u._id);
      });

      setRequests(maintenanceRes.data || []);
      setVehicles(vehiclesRes.data || []);
      setUsersMap(map);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAlert({ type: 'error', message: 'Failed to fetch data' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Deep-link highlight handling via ?highlight=<id>
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

  const getUserDisplay = (u, fallbackId) => {
    // Prefer populated object if available (driver or driverId could be populated)
    const populated = (u && typeof u === 'object') ? u : (fallbackId && typeof fallbackId === 'object' ? fallbackId : null);
    if (populated) {
      return populated.fullName || populated.username || populated.name || populated.email || (populated._id ? `${String(populated._id).slice(0,6)}…` : '-');
    }
    // If it's a string id, try the usersMap lookup
    const idKey = typeof u === 'string' ? u : (typeof fallbackId === 'string' ? fallbackId : null);
    if (idKey) return usersMap[idKey] || (idKey.slice ? `${idKey.slice(0,6)}…` : idKey);
    return '-';
  };

  // Resolve a vehicle object from a request supporting both populated and id-only shapes
  const resolveVehicle = (req) => {
    const vField = req.vehicleId ?? req.vehicle; // support either field
    if (!vField) return null;
    if (typeof vField === 'object') return vField; // already populated
    // otherwise it's an id string - find in vehicles list
    return vehicles.find(v => v._id === vField) || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Build payload matching backend model
      const payload = {
        vehicleId: formData.vehicleId,
  category: formData.category,
  priority: formData.priority,
        description: formData.description,
      };
      if (formData.estimatedCost) payload.cost = Number(formData.estimatedCost);
      if (formData.notes) payload.remarks = formData.notes;

      if (editingRequest) {
        // For updates the backend accepts status, remarks and cost; we'll send cost/remarks when present
        const updatePayload = {};
        if (formData.estimatedCost) updatePayload.cost = Number(formData.estimatedCost);
        if (formData.notes) updatePayload.remarks = formData.notes;
        // keep original behavior for other fields
        console.log('Updating maintenance', editingRequest._id, updatePayload);
        const updateRes = await maintenanceAPI.update(editingRequest._id, updatePayload);
        console.log('Update response:', updateRes);
        const updated = updateRes.data?.request || updateRes.data;
        setRequests(requests.map(r => r._id === editingRequest._id ? updated : r));
        setAlert({ type: 'success', message: 'Maintenance request updated successfully' });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      } else {
        console.log('Creating maintenance payload:', payload);
  const response = await maintenanceAPI.create(payload);
  console.log('Create response:', response);
  // backend returns { message, request }
  const created = response.data?.request || response.data;
  setRequests([...requests, created]);
  setConflictInfo(null);
  setAlert({ type: 'success', message: 'Maintenance request created successfully' });
  setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      }
      
      setShowModal(false);
      setEditingRequest(null);
      resetForm();
    } catch (error) {
  console.error('Error saving maintenance request:', error);
      const message = error?.response?.data?.message || error?.message || 'Failed to save maintenance request';
      // If conflict (existing open request), surface details and allow opening it
      if (error?.response?.status === 409) {
        const data = error.response.data || {};
        setConflictInfo({ requestId: data.requestId, status: data.status, message: data.message });
      }
      setAlert({ type: 'error', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      vehicleId: request.vehicleId || '',
      category: request.category || '',
      description: request.description || '',
      priority: request.priority || 'medium',
      estimatedCost: request.cost || request.estimatedCost || '',
      notes: request.remarks || request.notes || '',
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      const response = await maintenanceAPI.update(requestId, { status: newStatus });
      const updated = response.data?.request || response.data;
      setRequests(requests.map(r => r._id === requestId ? updated : r));
      setAlert({ type: 'success', message: 'Status updated successfully' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ type: 'error', message: 'Failed to update status' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const openCompleteModal = (request) => {
    setRequestToComplete(request);
    setCompleteForm({ cost: request.cost ? String(request.cost) : '', remarks: request.remarks || '' });
    setShowCompleteModal(true);
  };

  const handleCompleteSubmit = async () => {
    if (!requestToComplete) return;
    const parsed = completeForm.cost !== '' ? Number(completeForm.cost) : undefined;
    if (parsed === undefined || Number.isNaN(parsed) || parsed < 0) {
      setAlert({ type: 'error', message: 'Please enter a valid cost (0 or more).' });
      setTimeout(() => setAlert({ type: '', message: '' }), 3000);
      return;
    }
    try {
      const res = await maintenanceAPI.update(requestToComplete._id, { status: 'completed', cost: parsed, remarks: completeForm.remarks });
      const updated = res.data?.request || res.data;
      setRequests(requests.map(r => r._id === requestToComplete._id ? updated : r));
      setShowCompleteModal(false);
      setRequestToComplete(null);
      setCompleteForm({ cost: '', remarks: '' });
      setAlert({ type: 'success', message: 'Maintenance marked as completed' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } catch (err) {
      console.error('Failed to complete request:', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to complete request';
      setAlert({ type: 'error', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const handleDelete = async () => {
    if (!requestToDelete) return;
    try {
      const res = await maintenanceAPI.delete(requestToDelete._id);
      // remove from state
      setRequests(requests.filter(r => r._id !== requestToDelete._id));
      console.log('Delete response:', res);
      const message = res?.data?.message || 'Request deleted';
      setAlert({ type: 'success', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      setShowDeleteModal(false);
      setRequestToDelete(null);
    } catch (err) {
      console.error('Error deleting request:', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to delete request';
      setAlert({ type: 'error', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      description: '',
      priority: 'medium',
      estimatedCost: '',
      notes: '',
    });
  };

  const viewExistingRequest = async (id) => {
    try {
      const res = await maintenanceAPI.getById(id);
      const req = res.data;
      setEditingRequest(req);
      setFormData({
        vehicleId: req.vehicleId || '',
        category: req.category || '',
        description: req.description || '',
        priority: req.priority || 'medium',
        estimatedCost: req.cost || '',
        notes: req.remarks || '',
      });
      setShowModal(true);
      setConflictInfo(null);
    } catch (err) {
      console.error('Failed to load existing request:', err);
      setAlert({ type: 'error', message: 'Failed to load existing request' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle size={16} className="inline-block align-middle text-green-500" />;
      case 'pending':
        return <Clock size={16} className="inline-block align-middle text-yellow-500" />;
      case 'rejected':
        return <AlertCircle size={16} className="inline-block align-middle text-red-500" />;
      case 'completed':
        return <CheckCircle size={16} className="inline-block align-middle text-emerald-600" />;
      default:
        return <Clock size={16} className="inline-block align-middle text-gray-500" />;
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
      case 'completed':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredRequests = requests.filter(request => {
  const vehicle = resolveVehicle(request);
  const vehicleLabel = `${vehicle?.manufacturer || vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.plateNumber || ''}`.toLowerCase();
    const matchesSearch = 
      request.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicleLabel.includes(searchTerm.toLowerCase());
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
      {alert.message && (
        <div className={`mb-4 p-3 rounded-md ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`} role="alert">
          <div className="flex justify-between items-center">
            <div>{alert.message}</div>
            <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-gray-600">Manage vehicle maintenance requests</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus size={16} className="inline-block" />
          <span>New Request</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 inline-block" />
              <input
                type="text"
                placeholder="Search maintenance requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter size={16} className="text-gray-400 inline-block" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
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
                  Plate #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Approval
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remarks
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
                    <div className="flex items-start">
                      <div className="w-5 flex-shrink-0 flex items-center justify-center">
                        {getStatusIcon(request.status)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {request.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.requestedDate ? new Date(request.requestedDate).toLocaleDateString() : (request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-')}
                        </div>
                        {request.estimatedCost && (
                          <div className="text-xs text-gray-400">
                            Est. Cost: ${request.estimatedCost}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const vehicle = resolveVehicle(request);
                      return vehicle ? (
                        <div className="flex items-center">
                          <Truck size={16} className="text-gray-400 mr-2 inline-block" />
                          <span className="text-sm text-gray-900">
                            {vehicle.year} {vehicle.manufacturer || vehicle.make || ''} {vehicle.model}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">Unknown Vehicle</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const vehicle = resolveVehicle(request);
                      if (vehicle && vehicle.plateNumber) {
                        return <div className="text-sm text-gray-900">{vehicle.plateNumber}</div>;
                      }
                      return <div className="text-sm text-gray-500">-</div>;
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.driver || request.driverId ? (
                      <div className="text-sm text-gray-900">{getUserDisplay(request.driver, request.driverId)}</div>
                    ) : (
                      <div className="text-sm text-gray-500">-</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityBadgeColor(request.priority)}`}>
                      {request.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.cost !== undefined && request.cost !== null ? (`$${request.cost}`) : (request.estimatedCost ? `$${request.estimatedCost}` : '-')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(request.status)}`}>
                      {request.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Requested: {request.requestedDate ? new Date(request.requestedDate).toLocaleDateString() : (request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-')}</div>
                    <div className="text-sm text-gray-500">By: {getUserDisplay(request.requestedBy)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Approved: {request.status === 'approved' && request.approvedDate ? new Date(request.approvedDate).toLocaleDateString() : '—'}</div>
                    <div className="text-sm text-gray-500">By: {getUserDisplay(request.approvedBy)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.completedDate ? new Date(request.completedDate).toLocaleDateString() : '-'}
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
                        {(user.role === 'admin' || user.role === 'manager') && (
                          <button
                            onClick={() => { setRequestToDelete(request); setShowDeleteModal(true); }}
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
                            <CheckCircle className="h-3 w-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100"
                            title="Reject"
                            aria-label="Reject"
                          >
                            <AlertCircle className="h-3 w-3" />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {(user.role === 'admin' || user.role === 'manager') && request.status === 'approved' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openCompleteModal(request)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100"
                            title="Mark Completed"
                            aria-label="Mark Completed"
                          >
                            <CheckCircle className="h-3 w-3" />
                            <span>Complete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {request.remarks || request.notes || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRequests.length === 0 && (
          <div className="text-center py-8">
            <Wrench size={48} className="mx-auto text-gray-400 inline-block" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No maintenance requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new maintenance request.'
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
                  {editingRequest ? 'Edit Maintenance Request' : 'New Maintenance Request'}
                </h3>

                {conflictInfo && (
                  <div className="mb-4 p-3 rounded border-l-4 border-red-500 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-red-800">{conflictInfo.message}</div>
                        <div className="text-xs text-red-700">Status: {conflictInfo.status}</div>
                      </div>
                      {conflictInfo.requestId && (
                        <button
                          onClick={() => viewExistingRequest(conflictInfo.requestId)}
                          className="ml-4 btn-primary text-sm"
                          type="button"
                        >
                          View Existing Request
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="input-field mt-1"
                      required
                    >
                      <option value="">Select Category</option>
                      <option value="Engine">Engine</option>
                      <option value="Tires & Wheels">Tires & Wheels</option>
                      <option value="Brakes">Brakes</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Cargo">Cargo</option>
                      <option value="Machinery">Machinery</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
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
                          {vehicle.year} {vehicle.manufacturer || ''} {vehicle.model} - {vehicle.plateNumber || 'No Plate'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="input-field mt-1"
                      rows="3"
                      required
                      placeholder="Describe the maintenance issue..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="input-field mt-1"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                      <input
                        type="number"
                        value={formData.estimatedCost}
                        onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
                        className="input-field mt-1"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="input-field mt-1"
                      rows="2"
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

      {/* Delete confirmation modal (Fuel-style) */}
      {showDeleteModal && requestToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Delete maintenance request</h3>
              <p className="text-sm text-gray-500 mt-2">Are you sure you want to delete this maintenance request? This action cannot be undone.</p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setRequestToDelete(null); }}
                  className="px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Complete request modal */}
      {showCompleteModal && requestToComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900">Mark as Completed</h3>
              <p className="text-sm text-gray-600 mt-1">Enter the final maintenance cost and optional remarks.</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost</label>
                  <input
                    type="number"
                    value={completeForm.cost}
                    onChange={(e) => setCompleteForm({ ...completeForm, cost: e.target.value })}
                    className="input-field mt-1"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remarks</label>
                  <textarea
                    value={completeForm.remarks}
                    onChange={(e) => setCompleteForm({ ...completeForm, remarks: e.target.value })}
                    className="input-field mt-1"
                    rows="3"
                    placeholder="Notes about the maintenance completion..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => { setShowCompleteModal(false); setRequestToComplete(null); setCompleteForm({ cost: '', remarks: '' }); }}
                  className="px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteSubmit}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
                >
                  Mark Completed
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
