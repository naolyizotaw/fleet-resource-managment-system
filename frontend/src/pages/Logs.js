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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trip Logs</h1>
          <p className="text-gray-600">Create and manage trip logs for vehicles.</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Log</span>
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by plate, vehicle, or remarks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select className="input-field" value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
              <option value="all">All Vehicles</option>
              {vehicles.map(v => (<option key={v._id} value={v._id}>{v.plateNumber ? `${v.plateNumber} — ${formatVehicleLabel(v)}` : formatVehicleLabel(v)}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Date</th>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Plate</th>
                <th className="table-header">Driver</th>
                <th className="table-header">Start KM</th>
                <th className="table-header">End KM</th>
                <th className="table-header">Distance</th>
                <th className="table-header">Logged By</th>
                <th className="table-header">Remarks</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map(log => {
                const rv = resolveVehicle(log);
                const driverLabel = getDriverDisplayName(log.driverId) || getDriverDisplayName(rv?.assignedDriver) || '-';
                return (
                  <tr key={log._id} className="hover:bg-gray-50">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg w-11/12 max-w-2xl p-6">
  <h2 className="text-lg font-semibold mb-4">{log._id ? 'Edit Log' : 'New Log'}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700">Date</label>
            <input type="date" className="input-field" value={log.date ? new Date(log.date).toISOString().slice(0,10) : ''} onChange={(e) => onChange({ ...log, date: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-700">Vehicle</label>
            <select className="input-field" value={log.vehicle || log.vehicleId || ''} onChange={handleVehicleChange}>
              <option value="">Select vehicle</option>
              {vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber ? `${v.plateNumber} — ${[v.year, v.manufacturer, v.model].filter(Boolean).join(' ')}` : [v.year, v.manufacturer, v.model].filter(Boolean).join(' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-700">Start KM</label>
            <input type="number" className="input-field" value={log.startKm ?? ''} onChange={(e) => onChange({ ...log, startKm: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm text-gray-700">End KM</label>
            <input type="number" className="input-field" value={log.endKm ?? ''} onChange={(e) => onChange({ ...log, endKm: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-700">Remarks</label>
            <input className="input-field w-full" value={log.remarks || ''} onChange={(e) => onChange({ ...log, remarks: e.target.value })} />
          </div>
          <div className="col-span-2">
            <label className="block text-sm text-gray-700">Driver</label>
            <select
              className="input-field"
              value={typeof log.driverId === 'object' && log.driverId !== null ? (log.driverId._id || '') : (log.driverId || '')}
              onChange={(e) => onChange({ ...log, driverId: e.target.value })}
            >
              <option value="">Select driver</option>
              {drivers.map(d => <option key={d._id} value={d._id}>{getDriverDisplayName(d)}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button className="btn-primary" onClick={onSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default Logs;
