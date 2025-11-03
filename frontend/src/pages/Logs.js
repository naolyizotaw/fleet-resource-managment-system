import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logsAPI, vehiclesAPI, usersAPI } from '../services/api';
import { Truck, Edit, Trash2, Search, Plus, Filter } from 'lucide-react';

const DeleteConfirmationModal = ({ onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-11/12 max-w-md p-6 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
          <Trash2 className="h-6 w-6 text-red-500" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-gray-900">Delete log</h3>
        <div className="mt-2 text-sm text-gray-600">
          <p>Are you sure you want to delete this log?</p>
          <p>This action cannot be undone.</p>
        </div>
        <div className="mt-6 flex justify-center gap-4">
          <button type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

const Logs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [logToDelete, setLogToDelete] = useState(null);
  const [alert, setAlert] = useState({ type: '', message: '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const logsPromise = (user?.role === 'admin' || user?.role === 'manager') ? logsAPI.getAll() : logsAPI.getMyLogs();
      const vehiclesPromise = (user?.role === 'admin' || user?.role === 'manager') ? vehiclesAPI.getAll() : vehiclesAPI.getMine();
      const driversPromise = (user?.role === 'admin' || user?.role === 'manager') ? usersAPI.getDrivers() : Promise.resolve({ data: [] });

      const [logsRes, vehiclesRes, driversRes] = await Promise.all([
        logsPromise,
        vehiclesPromise,
        driversPromise,
      ]);

      const fetchedLogs = logsRes?.data || logsRes || [];
      const fetchedVehicles = vehiclesRes?.data || vehiclesRes || [];
      const fetchedDrivers = driversRes?.data || driversRes || [];

      setLogs(Array.isArray(fetchedLogs) ? fetchedLogs : []);
      setVehicles(Array.isArray(fetchedVehicles) ? fetchedVehicles : []);
      setDrivers(Array.isArray(fetchedDrivers) ? fetchedDrivers : []);
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to load logs' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const vehiclesMap = useMemo(() => {
    const m = {};
    vehicles.forEach(v => { if (v && v._id) m[String(v._id)] = v; });
    return m;
  }, [vehicles]);

  const resolveVehicle = useCallback((log) => {
    if (!log) return null;
    const v = log.vehicle || log.vehicleId || log.vehicle_id;
    if (!v) return null;
    if (typeof v === 'object') return v;
    return vehiclesMap[String(v)] || null;
  }, [vehiclesMap]);

  const formatVehicleLabel = (v) => (v ? [v.year, v.manufacturer, v.model].filter(Boolean).join(' ') : 'Unknown');

  const calculateDistance = (s, e) => {
    const a = Number(s) || 0;
    const b = Number(e) || 0;
    return Math.abs(b - a);
  };

  const getDriverDisplayName = (d) => {
    if (!d) return null;
    return d.fullName || d.name || d.username || `${d.firstName || ''} ${d.lastName || ''}`.trim() || null;
  };

  const filteredLogs = useMemo(() => {
    const term = (searchTerm || '').toLowerCase();
    return logs.filter(log => {
      const rv = resolveVehicle(log);
      const vehicleLabel = rv ? `${rv.plateNumber || ''} ${formatVehicleLabel(rv)}`.toLowerCase() : '';
      const matchesSearch = !term || String(log.remarks || '').toLowerCase().includes(term) || vehicleLabel.includes(term);
      const matchesVehicle = vehicleFilter === 'all' || (rv && String(rv._id) === String(vehicleFilter));
      return matchesSearch && matchesVehicle;
    });
  }, [logs, searchTerm, vehicleFilter, resolveVehicle]);

  const [editingLog, setEditingLog] = useState(null);

  const openEdit = (log) => {
    // normalize vehicle id into the editable object
    const rv = resolveVehicle(log);
    const driver = log.driverId;
    const driverId = typeof driver === 'object' && driver !== null ? driver._id : driver;
    setEditingLog({
      ...log,
      vehicle: rv ? rv._id : (log.vehicle || log.vehicleId || null),
      driverId: driverId || (rv ? (typeof rv.assignedDriver === 'object' ? rv.assignedDriver._id : rv.assignedDriver) : null),
    });
  };

  const openCreate = () => {
    const today = new Date().toISOString().slice(0,10);
    const defaultVehicle = vehicles && vehicles.length ? vehicles[0] : null;
    const startKm = defaultVehicle ? defaultVehicle.currentKm : '';
    const defaultVehicleId = defaultVehicle ? defaultVehicle._id : '';
    setEditingLog({ vehicle: defaultVehicleId, date: today, startKm, endKm: '', remarks: '' });
  };

  const closeEdit = () => setEditingLog(null);

  const handleSaveEdit = async () => {
    if (!editingLog) return;
    try {
      const payload = {
        vehicleId: editingLog.vehicle,
        driverId: editingLog.driverId,
        date: editingLog.date,
        startKm: Number(editingLog.startKm) || 0,
        endKm: Number(editingLog.endKm) || 0,
        remarks: editingLog.remarks || '',
      };

  // client-side validation to give quicker feedback
  if (!payload.vehicleId) { setAlert({ type: 'error', message: 'Please select a vehicle' }); return; }
  if (payload.endKm === 0 || isNaN(payload.endKm)) { setAlert({ type: 'error', message: 'Please provide a valid End KM' }); return; }

      // Prevent creating more than one log per vehicle per day (client-side check)
      const normalizeDateStr = (d) => {
        if (!d) return '';
        // if it's already YYYY-MM-DD, keep it; else convert
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return String(d);
        try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
      };
      const targetDateStr = normalizeDateStr(payload.date);
      const conflict = logs.some(l => {
        const lVeh = l.vehicle || l.vehicleId;
        const lVehId = typeof lVeh === 'object' && lVeh !== null ? lVeh._id : lVeh;
        const lDateStr = normalizeDateStr(l.date);
        const sameVehicle = String(lVehId) === String(payload.vehicleId);
        const sameDay = lDateStr === targetDateStr;
        const differentRecord = !editingLog._id || String(l._id) !== String(editingLog._id);
        return sameVehicle && sameDay && differentRecord;
      });
      if (!editingLog._id && conflict) {
        setAlert({ type: 'error', message: 'A log for this vehicle already exists for the selected date' });
        return;
      }
      if (editingLog._id && conflict) {
        setAlert({ type: 'error', message: 'Another log for this vehicle already exists for the selected date' });
        return;
      }

      if (editingLog._id) {
        await logsAPI.update(editingLog._id, payload);
        setAlert({ type: 'success', message: 'Log updated' });
      } else {
        await logsAPI.create(payload);
        setAlert({ type: 'success', message: 'Log created' });
      }

      fetchData();
      closeEdit();
    } catch (err) {
      console.error('Save log error:', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to save log';
      setAlert({ type: 'error', message: msg });
    }
  };

  const handleDelete = async (id) => {
    try {
      await logsAPI.delete(id);
      setAlert({ type: 'success', message: 'Log deleted' });
      fetchData();
    } catch (err) {
      console.error(err);
      setAlert({ type: 'error', message: 'Failed to delete log' });
    } finally {
      setLogToDelete(null);
    }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>);

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
          <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">Trip Logs Dashboard</span>
        </div>
        
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1">
              Trip Logs
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
              onClick={openCreate}
              className="group relative px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase tracking-wide rounded-lg transition-all flex items-center gap-2 border border-slate-600"
            >
              <Plus size={16} />
              <span className="text-xs">New Log</span>
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
                placeholder="Search by plate, vehicle, or remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
              />
            </div>
          </div>
          <div className="md:w-64">
            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Filter Vehicle</label>
            <div className="relative">
              <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select 
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer" 
                value={vehicleFilter} 
                onChange={(e) => setVehicleFilter(e.target.value)}
              >
                <option value="all">All Vehicles</option>
                {vehicles.map(v => (<option key={v._id} value={v._id}>{v.plateNumber ? `${v.plateNumber} — ${formatVehicleLabel(v)}` : formatVehicleLabel(v)}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Logs Table */}
      <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-lg border border-primary-100 overflow-hidden">
        {/* Table Header */}
        <div className="relative bg-white px-6 py-6 border-b-4 border-primary-600">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600"></div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary-600 rounded-xl blur opacity-30"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Trip Logs</h3>
                <p className="text-xs text-gray-500 font-bold mt-0.5">Track and manage all vehicle trips</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 rounded-lg border border-primary-200">
              <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-black text-primary-700">{filteredLogs.length} Total</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-primary-50/50">
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Date</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Vehicle</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Plate</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Driver</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Start KM</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">End KM</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Distance</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Logged By</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Remarks</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white/80 backdrop-blur-sm">
              {filteredLogs.map(log => {
                const rv = resolveVehicle(log);
                const driverLabel = getDriverDisplayName(log.driverId) || getDriverDisplayName(rv?.assignedDriver) || '-';
                return (
                  <tr key={log._id} className="group hover:bg-primary-50 hover:shadow-sm transition-all border-b border-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.date ? new Date(log.date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center"><Truck className="h-4 w-4 text-primary-600" /></div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{rv ? formatVehicleLabel(rv) : 'Unknown Vehicle'}</div>
                          <div className="text-sm text-gray-500">{rv ? (rv.type || '') : ''}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-600">{rv ? (rv.plateNumber || rv.licensePlate || '—') : '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{driverLabel}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.startKm ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.endKm ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">{calculateDistance(log.startKm, log.endKm)} km</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.loggedBy?.fullName || log.loggedBy?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.remarks || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(log)} className="flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm" title="Edit" aria-label="Edit"><Edit className="h-4 w-4" /></button>
                        {(() => {
                          const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
                          const isOwner = log?.driverId && (typeof log.driverId === 'object' ? log.driverId._id : log.driverId) && String((typeof log.driverId === 'object' ? log.driverId._id : log.driverId)) === String(user?.id || user?._id);
                          const canUserDeleteOwn = !isAdminOrManager && isOwner && (log.isEditable !== false);
                          if (isAdminOrManager || canUserDeleteOwn) {
                            return (
                              <button onClick={() => setLogToDelete(log._id)} className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm" title="Delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-4">
              <Truck className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No trip logs found</h3>
            <p className="text-sm text-gray-500 font-medium">
              {searchTerm || vehicleFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating a new trip log.'
              }
            </p>
          </div>
        )}
      </div>
      <EditModal log={editingLog} vehicles={vehicles} drivers={drivers} onChange={setEditingLog} onCancel={closeEdit} onSave={handleSaveEdit} getDriverDisplayName={getDriverDisplayName} />
      {logToDelete && (
        <DeleteConfirmationModal
          onConfirm={() => handleDelete(logToDelete)}
          onCancel={() => setLogToDelete(null)}
        />
      )}
    </div>
  );
};

// Edit modal (simple inline modal)
const EditModal = ({ log, vehicles, drivers, onChange, onCancel, onSave, getDriverDisplayName }) => {
  useEffect(() => {
    if (log && log.vehicle) {
      const selectedVehicle = vehicles.find(v => v._id === log.vehicle);
      if (selectedVehicle) {
        const updates = {};
        // auto-select assigned driver
        if (selectedVehicle.assignedDriver && log.driverId !== selectedVehicle.assignedDriver) {
          updates.driverId = selectedVehicle.assignedDriver;
        }
        // auto-fill startKm, but only if it's a new log or the km is not set
        if (!log._id && log.startKm !== selectedVehicle.currentKm) {
          updates.startKm = selectedVehicle.currentKm;
        }
        if (Object.keys(updates).length > 0) {
          onChange({ ...log, ...updates });
        }
      }
    }
  }, [log, vehicles, onChange]);

  if (!log) return null;

  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    const selectedVehicle = vehicles.find(v => v._id === vehicleId);
    const startKm = selectedVehicle ? selectedVehicle.currentKm : '';
    onChange({ ...log, vehicle: vehicleId, startKm });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onCancel} />
        
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
                  <Truck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                    {log._id ? 'Edit Log' : 'Create Log'}
                  </h3>
                  <p className="text-sm text-gray-500 font-semibold mt-1">
                    {log._id ? 'Update trip log information' : 'Record a new trip log'}
                  </p>
                </div>
              </div>
              <button
                onClick={onCancel}
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Date *</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all" 
                    value={log.date ? new Date(log.date).toISOString().slice(0,10) : ''} 
                    onChange={(e) => onChange({ ...log, date: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Vehicle *</label>
                  <select 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all" 
                    value={log.vehicle || log.vehicleId || ''} 
                    onChange={handleVehicleChange}
                  >
                    <option value="">Select vehicle</option>
                    {vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber ? `${v.plateNumber} — ${[v.year, v.manufacturer, v.model].filter(Boolean).join(' ')}` : [v.year, v.manufacturer, v.model].filter(Boolean).join(' ')}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Start KM *</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all" 
                    value={log.startKm ?? ''} 
                    onChange={(e) => onChange({ ...log, startKm: e.target.value })} 
                    placeholder="Starting odometer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">End KM *</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all" 
                    value={log.endKm ?? ''} 
                    onChange={(e) => onChange({ ...log, endKm: e.target.value })} 
                    placeholder="Ending odometer"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Driver</label>
                <select
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                  value={typeof log.driverId === 'object' && log.driverId !== null ? (log.driverId._id || '') : (log.driverId || '')}
                  onChange={(e) => onChange({ ...log, driverId: e.target.value })}
                >
                  <option value="">Select driver</option>
                  {drivers.map(d => <option key={d._id} value={d._id}>{getDriverDisplayName(d)}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Remarks</label>
                <textarea 
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all resize-none" 
                  value={log.remarks || ''} 
                  onChange={(e) => onChange({ ...log, remarks: e.target.value })} 
                  rows="3"
                  placeholder="Any additional notes or comments..."
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold uppercase tracking-wide text-sm rounded-lg hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSave}
                  className="px-8 py-2.5 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600 text-white font-black uppercase tracking-wide text-sm rounded-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                  {log._id ? 'Update Log' : 'Create Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;
