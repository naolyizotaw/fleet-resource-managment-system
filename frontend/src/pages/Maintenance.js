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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
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

  const formatNumber = (num) => {
    return num?.toLocaleString() || '';
  };

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
      if (formData.category === 'Service' && formData.serviceKm !== undefined && formData.serviceKm !== '') {
        payload.serviceKm = Number(formData.serviceKm);
      }
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
      // If backend included nextServiceInfo (we completed a Service), refresh that vehicle so vehicle list shows updated next-service values
      try {
        const nextInfo = response.data?.nextServiceInfo;
        const vehicleId = updated?.vehicleId?._id || updated?.vehicleId;
        if (nextInfo && vehicleId) {
          const vehRes = await vehiclesAPI.getById(vehicleId);
          const veh = vehRes.data;
          setVehicles(prev => prev.map(v => v._id === veh._id ? veh : v));
          // notify other pages/components (Vehicles page) that a vehicle was updated
          try { window.dispatchEvent(new CustomEvent('vehicle:updated', { detail: veh })); } catch (e) {}
        }
      } catch (e) {
        console.error('Failed to refresh vehicle after status update:', e);
      }
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

      // If backend returned nextServiceInfo (we handled a Service), refresh that vehicle so Vehicles list updates immediately
      try {
        const nextInfo = res.data?.nextServiceInfo;
  const vehicleId = updated?.vehicleId?._id || updated?.vehicleId || requestToComplete?.vehicleId;
        if (nextInfo && vehicleId) {
          const vehRes = await vehiclesAPI.getById(vehicleId);
          const veh = vehRes.data;
          setVehicles(prev => prev.map(v => v._id === veh._id ? veh : v));
          try { window.dispatchEvent(new CustomEvent('vehicle:updated', { detail: veh })); } catch (e) {}
        }
      } catch (e) {
        console.error('Failed to refresh vehicle after completion:', e);
      }

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
      {/* Page Header */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 overflow-hidden px-6 py-4">
        {/* Top label */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-1 bg-primary-500 rounded-full"></div>
          <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">Maintenance Management Dashboard</span>
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1">
              Maintenance Requests
            </h1>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-slate-400 font-semibold">Live Data</span>
              </div>
              <div className="w-px h-3 bg-slate-600"></div>
              <span className="text-slate-400 font-semibold">Real-time Analytics</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="group relative px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase tracking-wide rounded-lg transition-all flex items-center gap-2 border border-slate-600"
            >
              <Plus size={16} />
              <span className="text-xs">New Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by vehicle, plate, or requester..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="md:w-64">
            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Filter Status</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
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
      </div>

      {/* Requests Table */}
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-lg border border-primary-100 overflow-hidden">
        {/* Table Header */}
        <div className="relative bg-white px-6 py-6 border-b-4 border-primary-600">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600"></div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-600 rounded-xl blur opacity-30"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Wrench className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Maintenance Requests</h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">Manage and track all maintenance requests</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 rounded-lg border border-primary-200">
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-black text-primary-700">{filteredRequests.length} Total</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-primary-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Request</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Vehicle</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Plate #</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Driver</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Priority</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Cost</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Requested</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Approval</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Completed Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Actions</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Remarks</th>
              </tr>
            </thead>
            <tbody className="bg-white/80 backdrop-blur-sm">
              {filteredRequests.map((request) => (
                <tr
                  key={request._id}
                  ref={(el) => { if (el) rowRefs.current[request._id] = el; }}
                  className={`group hover:bg-primary-50 hover:shadow-sm transition-all border-b border-gray-100 ${highlightedId === request._id ? 'bg-yellow-50 ring-2 ring-amber-400' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-start">
                      <div className="w-5 flex-shrink-0 flex items-center justify-center">
                        {getStatusIcon(request.status)}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2 cursor-pointer hover:text-blue-600" onClick={() => { setSelectedRequest(request); setShowDetailModal(true); }}>
                          {request.description}
                        </div>
                        <div className="text-sm text-gray-500">
                          {request.requestedDate ? new Date(request.requestedDate).toLocaleDateString() : (request.createdAt ? new Date(request.createdAt).toLocaleDateString() : '-')}
                        </div>
                        {request.estimatedCost && (
                          <div className="text-xs text-gray-400">
                            Est. Cost: ETB {formatNumber(request.estimatedCost)}
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
                    {request.cost !== undefined && request.cost !== null ? (`ETB ${formatNumber(request.cost)}`) : (request.estimatedCost ? `ETB ${formatNumber(request.estimatedCost)}` : '-')}
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
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-4">
              <Wrench className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No maintenance requests found</h3>
            <p className="text-sm text-gray-500 font-medium">
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowModal(false); setEditingRequest(null); resetForm(); }} />
            
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200">
              {/* Modal Header */}
              <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">
                        {editingRequest ? 'Edit Request' : 'New Request'}
                      </h3>
                      <p className="text-xs text-white/80 font-semibold">Maintenance Request Form</p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowModal(false); setEditingRequest(null); resetForm(); }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="bg-white px-6 py-6">
                {conflictInfo && (
                  <div className="mb-6 p-4 rounded-xl border-l-4 border-red-500 bg-red-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-bold text-red-800">{conflictInfo.message}</div>
                        <div className="text-xs text-red-700 mt-1">Status: {conflictInfo.status}</div>
                      </div>
                      {conflictInfo.requestId && (
                        <button
                          onClick={() => viewExistingRequest(conflictInfo.requestId)}
                          className="px-4 py-2 bg-red-600 text-white text-xs font-bold uppercase rounded-lg hover:bg-red-700 transition-all"
                          type="button"
                        >
                          View Existing
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Category *</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                        required
                      >
                        <option value="">Select Category</option>
                        <option value="Engine">Engine</option>
                        <option value="Tires & Wheels">Tires & Wheels</option>
                        <option value="Brakes">Brakes</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Cargo">Cargo</option>
                        <option value="Machinery">Machinery</option>
                        <option value="Service">Service</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Vehicle *</label>
                      <select
                        value={formData.vehicleId}
                        onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
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
                  </div>

                  {formData.category === 'Service' && (
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Service KM (optional)</label>
                      <input
                        type="number"
                        value={formData.serviceKm || ''}
                        onChange={(e) => setFormData({...formData, serviceKm: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                        placeholder="Leave blank to use vehicle current KM"
                        min="0"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Description *</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all resize-none"
                      rows="4"
                      required
                      placeholder="Describe the maintenance issue in detail..."
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({...formData, priority: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Estimated Cost (ETB)</label>
                      <input
                        type="number"
                        value={formData.estimatedCost}
                        onChange={(e) => setFormData({...formData, estimatedCost: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Additional Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all resize-none"
                      rows="3"
                      placeholder="Any additional information or special instructions..."
                    />
                  </div>
                </form>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRequest(null);
                    resetForm();
                  }}
                  className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 font-bold uppercase tracking-wide rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-black uppercase tracking-wide rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  {editingRequest ? 'Update Request' : 'Create Request'}
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

      {/* Request Detail Modal */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDetailModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Maintenance Request Details
                  </h3>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    ×
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Request ID</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest._id}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedRequest.status}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {(() => {
                        const vehicle = resolveVehicle(selectedRequest);
                        return vehicle ? `${vehicle.plateNumber || 'No Plate'} - ${vehicle.model || 'Unknown Model'}` : 'Unknown Vehicle';
                      })()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedRequest.category}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">{selectedRequest.priority}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Estimated Cost</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedRequest.estimatedCost ? `ETB ${formatNumber(selectedRequest.estimatedCost)}` : 'Not specified'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Requested By</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {getUserDisplay(selectedRequest.requestedBy)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{selectedRequest.notes || 'No notes'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Requested Date</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedRequest.requestedDate ? new Date(selectedRequest.requestedDate).toLocaleDateString() : 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(selectedRequest.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
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
