import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logsAPI, vehiclesAPI, usersAPI } from '../services/api';
import { Truck, Edit, Trash2, Search, Plus, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Logs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const logsPromise = user?.role === 'admin' ? logsAPI.getAll() : logsAPI.getMyLogs();
      const [logsRes, vehiclesRes, driversRes] = await Promise.all([
        logsPromise,
        vehiclesAPI.getAll(),
        usersAPI.getDrivers(),
      ]);

      const fetchedLogs = logsRes?.data || logsRes || [];
      const fetchedVehicles = vehiclesRes?.data || vehiclesRes || [];
      const fetchedDrivers = driversRes?.data || driversRes || [];

      setLogs(Array.isArray(fetchedLogs) ? fetchedLogs : []);
      setVehicles(Array.isArray(fetchedVehicles) ? fetchedVehicles : []);
      setDrivers(Array.isArray(fetchedDrivers) ? fetchedDrivers : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load logs');
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
    setEditingLog({
      ...log,
      vehicle: rv ? rv._id : (log.vehicle || log.vehicleId || null),
      driverId: log.driverId || (rv ? rv.assignedDriver : null),
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
      if (!payload.vehicleId) return toast.error('Please select a vehicle');
      if (payload.endKm === 0 || isNaN(payload.endKm)) return toast.error('Please provide a valid End KM');

      if (editingLog._id) {
        await logsAPI.update(editingLog._id, payload);
        toast.success('Log updated');
      } else {
        await logsAPI.create(payload);
        toast.success('Log created');
      }

      fetchData();
      closeEdit();
    } catch (err) {
      console.error('Save log error:', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to save log';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    try {
      await logsAPI.delete(id);
      toast.success('Log deleted');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete log');
    }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" /></div>);

  return (
    <div className="space-y-6">
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
                <th className="table-header">Start KM</th>
                <th className="table-header">End KM</th>
                <th className="table-header">Distance</th>
                <th className="table-header">Remarks</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map(log => {
                const rv = resolveVehicle(log);
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.startKm ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.endKm ?? '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary-600">{calculateDistance(log.startKm, log.endKm)} km</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.remarks || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(log)} className="flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm" title="Edit" aria-label="Edit"><Edit className="h-4 w-4" /></button>
                        {user?.role === 'admin' && (
                          <button onClick={() => handleDelete(log._id)} className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm" title="Delete" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        )}
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
              value={log.driverId || ''}
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
