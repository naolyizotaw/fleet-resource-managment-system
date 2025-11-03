import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { perDiemAPI, vehiclesAPI, usersAPI } from '../services/api';
import { Receipt, Plus, Search, Filter, Truck, AlertCircle, CheckCircle, Clock, Calendar, Edit, Trash2, ThumbsUp, ThumbsDown } from 'lucide-react';


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
  const [alert, setAlert] = useState({ type: '', message: '' });

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
  setAlert({ type: 'error', message: 'Failed to fetch data' });
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
        setAlert({ type: 'success', message: 'Per diem request updated successfully' });
      } else {
        const response = await perDiemAPI.create(formData);
        const created = response.data?.perDiemRequest || response.data; // controller returns { message, perDiemRequest }
        setRequests([...requests, created]);
        setAlert({ type: 'success', message: 'Per diem request created successfully' });
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
      setAlert({ type: 'error', message: errorMessage });
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
      setAlert({ type: 'success', message: 'Status updated successfully' });
    } catch (error) {
      console.error('Error updating status:', error);
      setAlert({ type: 'error', message: 'Failed to update status' });
    }
  };

  const handleDelete = async (requestId) => {
    const confirmed = window.confirm('Are you sure you want to delete this per diem request?');
    if (!confirmed) return;
    try {
      await perDiemAPI.delete(requestId);
      setRequests(prev => prev.filter(r => r._id !== requestId));
      setAlert({ type: 'success', message: 'Per diem request deleted' });
    } catch (error) {
      console.error('Error deleting per diem request:', error);
      const msg = error?.response?.data?.message || 'Failed to delete per diem request';
      setAlert({ type: 'error', message: msg });
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
      setAlert({ type: 'error', message: 'Failed to load existing request.' });
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
          <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">Per Diem Management Dashboard</span>
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1">
              Per Diem Requests
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
                placeholder="Search by destination, driver, or vehicle..."
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
                  <Receipt className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Per Diem Requests</h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">Manage and track all per diem requests</p>
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
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Driver</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Trip Details</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Approval</th>
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
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-4">
              <Receipt className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No per diem requests found</h3>
            <p className="text-sm text-gray-500 font-medium">
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
                      <Receipt className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                        {editingRequest ? 'Edit Request' : 'Create Request'}
                      </h3>
                      <p className="text-sm text-gray-500 font-semibold mt-1">
                        {editingRequest ? 'Update per diem request information' : 'Submit a new per diem request'}
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
                {formError && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-lg">
                    <p className="text-sm font-semibold">{formError}</p>
                  </div>
                )}

                {conflictInfo && (
                  <div className="mb-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-red-800">{conflictInfo.message}</p>
                        <p className="text-xs text-red-700 mt-1">Status: {conflictInfo.status}</p>
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
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Driver *</label>
                    <select
                      value={formData.driverId}
                      onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      required
                    >
                      <option value="">Select Driver</option>
                      {drivers.map(d => (
                        <option key={d._id} value={d._id}>
                          {d.fullName || d.username || d.email}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-gray-500 font-medium">Vehicle will be linked automatically if the driver has an assigned vehicle.</p>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Purpose *</label>
                    <input
                      type="text"
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      placeholder="Enter purpose of trip"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Start Date *</label>
                      <input
                        type="date"
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">End Date *</label>
                      <input
                        type="date"
                        value={formData.endDate}
                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Days *</label>
                      <input
                        type="number"
                        value={formData.numberOfDays}
                        onChange={(e) => setFormData({...formData, numberOfDays: Number(e.target.value) })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        min="1"
                        placeholder="1"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Destination *</label>
                    <input
                      type="text"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      placeholder="Enter destination city or location"
                      required
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
    </div>
  );
};

export default PerDiem;
