import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fuelAPI, vehiclesAPI } from '../services/api';
import { Fuel as FuelIcon, Plus, Search, Filter, Truck, AlertCircle, CheckCircle, Clock, Edit, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';

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
  const [highlightedId, setHighlightedId] = useState(null);
  const rowRefs = useRef({});
  const location = useLocation();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    vehicleId: '',
    fuelType: 'petrol',
    quantity: '',
    currentKm: '',
    purpose: '',
    pricePerLitre: '',
    cost: '',
  });
  const [alert, setAlert] = useState({ type: '', message: '' });

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

      // Fetch vehicles: admins/managers get all; regular users get only their assigned vehicles
      let vehiclesData = [];
      try {
        if (isPrivileged) {
          const vehiclesRes = await vehiclesAPI.getAll();
          vehiclesData = vehiclesRes.data || [];
        } else {
          const mineRes = await vehiclesAPI.getMine();
          vehiclesData = mineRes.data || [];
        }
      } catch (err) {
        vehiclesData = [];
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

      setVehicles(vehiclesData);
      setRequests(requestsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAlert({ type: 'error', message: 'Failed to fetch data' });
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle deep link highlighting via ?highlight=<id>
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const targetId = params.get('highlight');
    if (!targetId) return;
    // Wait a tick to ensure refs populated
    const el = rowRefs.current[targetId];
    if (el) {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
      setHighlightedId(targetId);
      // Clear highlight after a few seconds
      const t = setTimeout(() => setHighlightedId(null), 4500);
      // Remove the query param from the URL
      const newParams = new URLSearchParams(location.search);
      newParams.delete('highlight');
      navigate({ pathname: location.pathname, search: newParams.toString() ? `?${newParams.toString()}` : '' }, { replace: true });
      return () => clearTimeout(t);
    }
  }, [loading, requests, location.search, location.pathname, navigate]);

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
  maybe('pricePerLitre', sanitize(formData.pricePerLitre, true));
  // cost will be auto-calculated by backend if pricePerLitre provided
  maybe('cost', sanitize(formData.cost, true));

      if (editingRequest) {
        await fuelAPI.update(editingRequest._id, payload);
        await fetchData();
        setAlert({ type: 'success', message: 'Fuel request updated successfully' });
      } else {
        await fuelAPI.create(payload);
        await fetchData();
        setAlert({ type: 'success', message: 'Fuel request created successfully' });
      }
      
      setShowModal(false);
      setEditingRequest(null);
      resetForm();
    } catch (error) {
      console.error('Error saving fuel request:', error);
      const msg = error?.response?.data?.message || 'Failed to save fuel request';
      setAlert({ type: 'error', message: msg });
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
      pricePerLitre: request.pricePerLitre || '',
      cost: request.cost || '',
    });
    setShowModal(true);
  };

  const handleStatusUpdate = async (requestId, newStatus) => {
      try {
      await fuelAPI.update(requestId, { status: newStatus });
  await fetchData();
      setAlert({ type: 'success', message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ type: 'error', message: 'Failed to update status' });
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
      setAlert({ type: 'success', message: 'Fuel request deleted' });
      setShowDeleteModal(false);
      setRequestToDelete(null);
    } catch (error) {
      console.error('Error deleting fuel request:', error);
      const msg = error?.response?.data?.message || 'Failed to delete request';
      setAlert({ type: 'error', message: msg });
    }
  };

  const resetForm = () => {
    setFormData({
      vehicleId: '',
      fuelType: 'petrol',
      quantity: '',
      currentKm: '',
      purpose: '',
      pricePerLitre: '',
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

  // Prefer fullName then username then email then short id for display
  const getUserDisplay = (u) => {
    if (!u) return '-';
    if (typeof u === 'object') {
      return u.fullName || u.username || u.email || (u._id ? `${String(u._id).slice(0,6)}…` : '-');
    }
    return typeof u === 'string' ? (u.slice ? `${u.slice(0,6)}…` : String(u)) : '-';
  };

  const formatNumber = (num) => {
    return num?.toLocaleString() || '';
  };

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
          <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">Fuel Management Dashboard</span>
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1">
              Fuel Requests
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
              <Plus className="h-4 w-4" />
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
                  <FuelIcon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Fuel Requests</h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">Manage and track all fuel requests</p>
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
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] w-64 border-b-2 border-primary-200">Vehicle</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] w-40 border-b-2 border-primary-200">Plate Number</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Fuel Type</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Quantity (L)</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Price/L (ETB)</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Total Cost (ETB)</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Odometer (KM)</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Purpose</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] w-48 border-b-2 border-primary-200">Requester</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] w-56 border-b-2 border-primary-200">Approval</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Status</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/80 backdrop-blur-sm">
              {filteredRequests.map((request) => (
                <tr
                  key={request._id}
                  ref={(el) => { if (el) rowRefs.current[request._id] = el; }}
                  className={`group hover:bg-primary-50 hover:shadow-sm transition-all border-b border-gray-100 ${highlightedId === request._id ? 'bg-yellow-50 ring-2 ring-amber-400' : ''}`}
                >
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
                  <td className="table-cell w-64">
                    {(() => {
                      const vehicleObj = resolveVehicle(request);
                      if (vehicleObj) {
                        return (
                          <div className="flex items-center min-w-0">
                            <Truck className="h-4 w-4 text-gray-400 mr-2" />
                            <span
                              className="text-sm text-gray-900 truncate whitespace-nowrap"
                              title={`${vehicleObj.year ? `${vehicleObj.year} ` : ''}${vehicleObj.manufacturer || ''} ${vehicleObj.model || ''}`.trim()}
                            >
                              {vehicleObj.year ? `${vehicleObj.year} ` : ''}
                              {vehicleObj.manufacturer || ''} {vehicleObj.model || ''}
                            </span>
                          </div>
                        );
                      }
                      const rawId = typeof (request.vehicleId ?? request.vehicle) === 'string' ? (request.vehicleId ?? request.vehicle) : '';
                      return (
                        <span className="text-sm text-gray-500 truncate whitespace-nowrap block" title={rawId}>
                          {rawId ? `Vehicle ID: ${rawId.slice(0, 6)}…` : 'Unknown Vehicle'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="table-cell w-40">
                    {(() => {
                      const vehicleObj = resolveVehicle(request);
                      const plate = vehicleObj?.plateNumber;
                      return plate ? (
                        <span
                          className="inline-flex items-center rounded-md bg-gray-100 text-gray-700 px-2 py-0.5 text-sm font-medium whitespace-nowrap truncate max-w-[150px]"
                          title={plate}
                        >
                          {plate}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      );
                    })()}
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium capitalize">
                      {request.fuelType || '—'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="text-sm text-gray-900 font-medium">{request.quantity ?? '-'} L</div>
                  </td>
                  <td className="table-cell">
                    {typeof request.pricePerLitre === 'number' ? (
                      <span className="inline-flex items-center rounded-md bg-cyan-50 text-cyan-700 px-2 py-0.5 text-sm font-medium">
                        {formatNumber(request.pricePerLitre.toFixed(2))}/L
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {typeof request.cost === 'number' ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 text-emerald-700 px-2 py-0.5 text-sm font-semibold">
                        {formatNumber(request.cost.toFixed(2))}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {typeof request.currentKm === 'number' ? (
                      <span className="inline-flex items-center rounded-md bg-indigo-50 text-indigo-700 px-2 py-0.5 text-sm font-semibold">
                        {request.currentKm.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-cell">
                    {request.purpose ? (
                      <span
                        className="text-sm text-gray-900 block truncate max-w-[280px]"
                        title={request.purpose}
                      >
                        {request.purpose}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="table-cell w-48">
                    <div className="min-w-0">
                      <span
                        className="text-sm text-gray-900 truncate max-w-[180px] block whitespace-nowrap"
                        title={getUserDisplay(request.requestedBy)}
                      >
                        {getUserDisplay(request.requestedBy)}
                      </span>
                    </div>
                  </td>
                  <td className="table-cell w-56">
                    <div className="text-sm text-gray-900">Approved: {request.status === 'approved' && request.issuedDate ? new Date(request.issuedDate).toLocaleDateString() : '—'}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1 min-w-0">
                      <span>By:</span>
                      <span className="flex-1 min-w-0 truncate whitespace-nowrap" title={getUserDisplay(request.approvedBy)}>
                        {getUserDisplay(request.approvedBy)}
                      </span>
                    </div>
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
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-4">
              <FuelIcon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No fuel requests found</h3>
            <p className="text-sm text-gray-500 font-medium">
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
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => { setShowModal(false); setEditingRequest(null); resetForm(); }} />
            
            <div className="relative bg-white rounded-2xl shadow-2xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full overflow-hidden">
              {/* Top Gradient Bar */}
              <div className="relative h-2 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
              </div>

              {/* Header */}
              <div className="relative px-8 pt-8 pb-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-primary-500 rounded-xl flex items-center justify-center shadow-lg">
                      <FuelIcon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {editingRequest ? 'Edit Request' : 'Create Request'}
                      </h3>
                      <p className="text-sm text-gray-500 font-semibold mt-1">
                        {editingRequest ? 'Update fuel request information' : 'Submit a new fuel request'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setShowModal(false); setEditingRequest(null); resetForm(); }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="px-8 py-6 max-h-[65vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Vehicle *</label>
                    <select
                      value={formData.vehicleId}
                      onChange={(e) => {
                        const selectedVehicleId = e.target.value;
                        const selectedVehicle = vehicles.find(v => v._id === selectedVehicleId);
                        setFormData({
                          ...formData, 
                          vehicleId: selectedVehicleId,
                          currentKm: selectedVehicle && !formData.currentKm ? selectedVehicle.currentKm : formData.currentKm
                        });
                      }}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
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
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Fuel Type</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData({...formData, fuelType: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      >
                        <option value="petrol">Petrol</option>
                        <option value="diesel">Diesel</option>
                        <option value="electric">Electric</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Quantity (L) *</label>
                      <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => {
                          const quantity = e.target.value;
                          const pricePerLitre = formData.pricePerLitre;
                          const cost = pricePerLitre !== '' && quantity !== '' ? (Number(pricePerLitre) * Number(quantity)).toFixed(2) : '';
                          setFormData({...formData, quantity, cost});
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="e.g. 50"
                        min="0"
                        step="0.1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Current Kilometers *</label>
                      <input
                        type="number"
                        value={formData.currentKm}
                        onChange={(e) => setFormData({...formData, currentKm: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="Current odometer"
                        min="0"
                        step="1"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Purpose *</label>
                      <input
                        type="text"
                        value={formData.purpose}
                        onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="Reason for request"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Price per Litre (ETB)</label>
                      <input
                        type="number"
                        value={formData.pricePerLitre}
                        onChange={(e) => {
                          const pricePerLitre = e.target.value;
                          const quantity = formData.quantity;
                          const cost = pricePerLitre !== '' && quantity !== '' ? (Number(pricePerLitre) * Number(quantity)).toFixed(2) : '';
                          setFormData({...formData, pricePerLitre, cost});
                        }}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Total Cost (ETB)</label>
                      <input
                        type="number"
                        value={formData.cost}
                        onChange={(e) => setFormData({...formData, cost: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed"
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        disabled={formData.pricePerLitre !== ''}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all resize-none"
                      rows="3"
                      placeholder="Any additional information..."
                    />
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingRequest(null);
                        resetForm();
                      }}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold uppercase tracking-wide text-sm rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="px-8 py-2.5 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600 text-white font-black uppercase tracking-wide text-sm rounded-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      {editingRequest ? 'Update Request' : 'Create Request'}
                    </button>
                  </div>
                </form>
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
