import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { /* useAuth */ } from '../contexts/AuthContext';
import { vehiclesAPI, usersAPI } from '../services/api';
import { Truck, Plus, Trash2, Edit, Search, Filter, User, Wrench, Fuel, Settings, DownloadCloud, Printer, X } from 'lucide-react';
import * as XLSX from 'xlsx';

const Vehicles = () => {
  // removed unused user from useAuth to fix eslint no-unused-vars
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTimeline, setHistoryTimeline] = useState([]);
  const [formError, setFormError] = useState('');
  const [vehicleErrors, setVehicleErrors] = useState({});

  const initialFormData = {
    plateNumber: '',
    type: 'Automobile',
    model: '',
    manufacturer: '',
    year: '',
    fuelType: 'Petrol',
    currentKm: '',
    serviceIntervalKm: '',
    previousServiceKm: '',
    assignedDriver: '',
    status: 'active',
  };

  const [formData, setFormData] = useState(initialFormData);
  const [alert, setAlert] = useState({ type: '', message: '' });
  const navigate = useNavigate();
  const getRequestBadgeColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeBadgeColor = (type) => {
    switch (type) {
      case 'maintenance': return 'bg-amber-100 text-amber-800';
      case 'fuel': return 'bg-sky-100 text-sky-800';
      case 'service': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchData();
    // listen for vehicle updates from other pages (e.g. maintenance completion)
    const onVehicleUpdated = (e) => {
      try {
        const updated = e.detail;
        setVehicles(prev => prev.map(v => v._id === updated._id ? updated : v));
      } catch (err) { console.error('vehicle:updated handler error', err); }
    };
    window.addEventListener('vehicle:updated', onVehicleUpdated);
    return () => { window.removeEventListener('vehicle:updated', onVehicleUpdated); };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vehiclesRes, usersRes] = await Promise.all([
        vehiclesAPI.getAll(),
        usersAPI.getDrivers(),
      ]);
      setVehicles(vehiclesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setAlert({ type: 'error', message: 'Failed to fetch data' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // sanitize number fields
      const payload = {
        ...formData,
        year: formData.year === '' ? undefined : Number(formData.year),
        currentKm: formData.currentKm === '' ? undefined : Number(formData.currentKm),
        serviceIntervalKm: formData.serviceIntervalKm === '' ? undefined : Number(formData.serviceIntervalKm),
        previousServiceKm: formData.previousServiceKm === '' ? undefined : Number(formData.previousServiceKm),
      };
      if (editingVehicle) {
        await vehiclesAPI.update(editingVehicle._id, payload);
        setAlert({ type: 'success', message: 'Vehicle updated successfully' });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
        // clear any previous error for this vehicle
        setVehicleErrors(prev => {
          const copy = { ...prev };
          delete copy[editingVehicle._id];
          return copy;
        });
      } else {
        await vehiclesAPI.create(payload);
        setAlert({ type: 'success', message: 'Vehicle created successfully' });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      }
      setFormError('');
      fetchData(); // Refetch data to show changes
      setShowModal(false);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      const message = error.response?.data?.message || 'Failed to save vehicle';
      setFormError(message);
      // if editing an existing vehicle, attach inline error to that vehicle row
      if (editingVehicle) {
        setVehicleErrors(prev => ({ ...prev, [editingVehicle._id]: message }));
      }
      // also show inline alert
      setAlert({ type: 'error', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plateNumber: vehicle.plateNumber || '',
      type: vehicle.type || 'Automobile',
      model: vehicle.model || '',
      manufacturer: vehicle.manufacturer || '',
      year: vehicle.year || '',
      fuelType: vehicle.fuelType || 'Petrol',
      currentKm: vehicle.currentKm || '',
      serviceIntervalKm: (vehicle.serviceIntervalKm ?? '') || '',
      previousServiceKm: (vehicle.previousServiceKm ?? '') || '',
      assignedDriver: vehicle.assignedDriver?._id || '',
      status: vehicle.status || 'active',
    });
    setShowModal(true);
    // clear any previous errors for this vehicle in the modal
    setFormError('');
    setVehicleErrors(prev => {
      const copy = { ...prev };
      delete copy[vehicle._id];
      return copy;
    });
  };

  const handleDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      await vehiclesAPI.delete(vehicleToDelete._id);
      setAlert({ type: 'success', message: 'Vehicle deleted successfully' });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
      fetchData(); // Refetch data
      setFormError('');
      setShowDeleteModal(false);
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      const message = error.response?.data?.message || 'Failed to delete vehicle';
      // attach to the row for visibility
      setVehicleErrors(prev => ({ ...prev, [vehicleToDelete._id]: message }));
      setAlert({ type: 'error', message });
      setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    }
  };

  // helper to load vehicle history (service entries, maintenance requests, fuel)
  const loadHistory = async (vehicleId) => {
    setHistoryLoading(true);
    try {
      const vehRes = await vehiclesAPI.getById(vehicleId);
      const veh = vehRes.data;

      // Backend attaches maintenance and fuel arrays to the vehicle response
      const vehicleMaints = Array.isArray(veh.maintenance) ? [...veh.maintenance] : [];
      const vehicleFuels = Array.isArray(veh.fuel) ? veh.fuel : [];

      // Collect service entries from multiple possible vehicle fields
      const serviceEntries = [];
      if (veh.serviceHistory && Array.isArray(veh.serviceHistory)) {
        veh.serviceHistory.forEach(s => { if (s && s.date) serviceEntries.push(s); });
      }
      if (veh.maintenanceHistory && Array.isArray(veh.maintenanceHistory)) {
        veh.maintenanceHistory.forEach(s => { if (s && s.date) serviceEntries.push(s); });
      }

      // We'll attach service entries into maintenance requests of category 'Service' when they represent the same event.
      // Standalone service entries (without a maintenance request) will NOT be shown to avoid duplicates.
      const timelineItems = [];

      const findMatchingService = (maint) => {
        if (!maint) return -1;
        if (maint.serviceKm != null) {
          const matchIdx = serviceEntries.findIndex(s => s.km != null && Number(s.km) === Number(maint.serviceKm));
          if (matchIdx !== -1) return matchIdx;
        }
        const maintDate = maint.completedDate || maint.updatedAt || maint.requestedDate || maint.createdAt || null;
        if (maintDate) {
          const mTime = new Date(maintDate).getTime();
          const matchIdx = serviceEntries.findIndex(s => {
            const sTime = new Date(s.date).getTime();
            return Math.abs(sTime - mTime) <= 24 * 60 * 60 * 1000;
          });
          if (matchIdx !== -1) return matchIdx;
        }
        if (maint.description) {
          const desc = String(maint.description).toLowerCase();
          const matchIdx = serviceEntries.findIndex(s => (s.notes || '').toLowerCase().includes(desc) || desc.includes((s.notes || '').toLowerCase()));
          if (matchIdx !== -1) return matchIdx;
        }
        return -1;
      };

      const remainingServiceEntries = [...serviceEntries];

      // For each maintenance request, if it's a Service category and matches a service entry, attach that service entry
      vehicleMaints.forEach(m => {
        if (m.category === 'Service') {
          const svcIdx = findMatchingService(m);
          if (svcIdx !== -1) {
            const svc = remainingServiceEntries[svcIdx];
            const combined = { ...m, service: svc }; // keep maintenance as primary, add service data under .service
            timelineItems.push({ type: 'maintenance', date: new Date(svc.date || m.completedDate || m.requestedDate || m.createdAt || Date.now()), data: combined });
            remainingServiceEntries.splice(svcIdx, 1);
            return;
          }
        }
        // Non-service maintenance or service maintenance without a matching service entry
        timelineItems.push({ type: 'maintenance', date: new Date(m.completedDate || m.updatedAt || m.requestedDate || m.createdAt || Date.now()), data: m });
      });

      // Do NOT add standalone service entries (user requested maintenance request should be primary)

      // Add fuel items
      vehicleFuels.forEach(f => {
        const date = f.issuedDate || f.approvedDate || f.createdAt || null;
        timelineItems.push({ type: 'fuel', date: date ? new Date(date) : new Date(), data: f });
      });

      // sort newest first
      timelineItems.sort((a,b) => b.date - a.date);

      setHistoryVehicle(veh);
      setHistoryTimeline(timelineItems);
    } catch (err) {
      console.error('Error loading vehicle history:', err);
      setHistoryVehicle(null);
      setHistoryTimeline([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistoryModal = async (vehicle) => {
    setHistoryVehicle(null);
    setHistoryTimeline([]);
    setShowHistoryModal(true);
    await loadHistory(vehicle._id);
  };

  const getUserName = (userOrId) => {
    if (!userOrId) return '—';
    if (typeof userOrId === 'object') return userOrId.fullName || userOrId.username || '—';
    const found = users.find(u => u._id === userOrId);
    return found ? (found.fullName || found.username) : userOrId;
  };

  const exportHistory = () => {
    if (!historyVehicle) return;
    try {
      // Prepare vehicle sheet
      const vehicleInfo = {
        PlateNumber: historyVehicle.plateNumber || '',
        Manufacturer: historyVehicle.manufacturer || '',
        Model: historyVehicle.model || '',
        Year: historyVehicle.year || '',
        FuelType: historyVehicle.fuelType || '',
        CurrentKM: historyVehicle.currentKm ?? '',
        Status: historyVehicle.status || '',
      };

      // Maintenance rows (map fields from maintenance objects)
      const maintRows = (historyVehicle.maintenance || []).map(m => ({
        RequestID: m._id || '',
        PlateNumber: historyVehicle.plateNumber || '',
        Category: m.category || '',
        Description: m.description || m.notes || '',
        ServiceKM: m.serviceKm ?? '',
        Priority: m.priority || '',
        Status: m.status || '',
        RequestedBy: getUserName(m.requestedBy || m.requester),
        ApprovedBy: getUserName(m.approvedBy),
        CompletedDate: m.completedDate || m.approvedDate || m.requestedDate || m.createdAt || '',
        Cost: m.cost != null ? m.cost : '',
        Remarks: m.remarks || '',
        CreatedAt: m.createdAt || '',
      }));

      // Fuel rows
      const fuelRows = (historyVehicle.fuel || []).map(f => ({
        RequestID: f._id || '',
        PlateNumber: historyVehicle.plateNumber || '',
        Quantity: f.quantity ?? '',
        FuelType: f.fuelType || '',
        CurrentKM: f.currentKm ?? '',
        Status: f.status || '',
        RequestedBy: getUserName(f.requestedBy || f.requester),
        ApprovedBy: getUserName(f.approvedBy),
        IssuedDate: f.issuedDate || f.approvedDate || f.createdAt || '',
        Cost: f.cost != null ? f.cost : '',
        Purpose: f.purpose || '',
        CreatedAt: f.createdAt || '',
      }));

      const wb = XLSX.utils.book_new();
      const vehicleSheet = XLSX.utils.json_to_sheet([vehicleInfo]);
      XLSX.utils.book_append_sheet(wb, vehicleSheet, 'Vehicle');

      const maintSheet = XLSX.utils.json_to_sheet(maintRows.length ? maintRows : [{ Note: 'No maintenance records' }]);
      XLSX.utils.book_append_sheet(wb, maintSheet, 'Maintenance');

      const fuelSheet = XLSX.utils.json_to_sheet(fuelRows.length ? fuelRows : [{ Note: 'No fuel records' }]);
      XLSX.utils.book_append_sheet(wb, fuelSheet, 'Fuel');

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safePlate = (historyVehicle.plateNumber || 'vehicle').replace(/[^a-z0-9\-_.]/gi, '_');
      a.download = `${safePlate}_history.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error', err);
      setAlert({ type: 'error', message: 'Failed to export history' });
      setTimeout(() => setAlert({ type: '', message: '' }), 4000);
    }
  };

  const printHistoryReport = () => {
    if (!historyVehicle) return;
    try {
      // Build a simple company-style HTML report
      const companyName = 'ACME Fleet Services';
      const reportTitle = `Vehicle History Report - ${historyVehicle.plateNumber || ''}`;
      const styles = `
        body { font-family: Arial, sans-serif; color: #111827; margin: 20px; }
        .header { display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #e5e7eb; padding-bottom:10px; margin-bottom:20px }
        .company { font-size:18px; font-weight:700 }
        .meta { text-align:right; font-size:12px; color:#6b7280 }
        table { width:100%; border-collapse:collapse; margin-top:10px }
        th, td { border:1px solid #e5e7eb; padding:8px; text-align:left; font-size:13px }
        th { background:#f9fafb; font-weight:600 }
        .section-title { margin-top:18px; font-weight:700 }
      `;

      const escape = (s) => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

      const maintRows = (historyVehicle.maintenance || []).map(i => `
        <tr>
          <td>${escape(i._id)}</td>
          <td>${escape(historyVehicle.manufacturer)} ${escape(historyVehicle.model)}</td>
          <td>${escape(historyVehicle.plateNumber)}</td>
          <td>${escape(i.category)}</td>
          <td>${escape(i.description || i.notes)}</td>
          <td>${escape(i.priority)}</td>
          <td>${escape(i.requestedBy?.fullName || i.requestedBy || i.requester)}</td>
          <td>${escape(i.approvedBy?.fullName || i.approvedBy)}</td>
          <td>${escape(i.status)}</td>
          <td>${escape(i.requestedDate || i.createdAt)}</td>
          <td>${escape(i.completedDate || '')}</td>
          <td>${escape(i.cost != null ? i.cost : '')}</td>
          <td>${escape(i.remarks || '')}</td>
        </tr>
      `).join('') || '<tr><td colspan="13">No maintenance records</td></tr>';

      const fuelRows = (historyVehicle.fuel || []).map(i => `
        <tr>
          <td>${escape(i._id)}</td>
          <td>${escape(historyVehicle.manufacturer)} ${escape(historyVehicle.model)}</td>
          <td>${escape(historyVehicle.plateNumber)}</td>
          <td>${escape(i.fuelType)}</td>
          <td>${escape(i.quantity ?? '')}</td>
          <td>${escape(i.pricePerLitre ?? '')}</td>
          <td>${escape(i.cost != null ? i.cost : '')}</td>
          <td>${escape(i.currentKm ?? '')}</td>
          <td>${escape(i.purpose || '')}</td>
          <td>${escape(i.requestedBy?.fullName || i.requestedBy || i.requester)}</td>
          <td>${escape(i.approvedBy?.fullName || i.approvedBy)}</td>
          <td>${escape(i.status)}</td>
          <td>${escape(i.createdAt || '')}</td>
          <td>${escape(i.issuedDate || '')}</td>
        </tr>
      `).join('') || '<tr><td colspan="14">No fuel records</td></tr>';

      const html = `
        <html>
          <head>
            <title>${reportTitle}</title>
            <style>${styles}</style>
          </head>
          <body>
            <div class="header">
              <div class="company">${companyName}</div>
              <div class="meta">${new Date().toLocaleString()}</div>
            </div>
            <h2>${reportTitle}</h2>
            <div><strong>Vehicle:</strong> ${escape(historyVehicle.manufacturer || '')} ${escape(historyVehicle.model || '')} (${escape(historyVehicle.plateNumber || '')})</div>
            <div class="section-title">Maintenance</div>
            <table>
              <thead>
                <tr>
                  <th>Req ID</th><th>Vehicle</th><th>Plate</th><th>Category</th><th>Description</th><th>Priority</th>
                  <th>Requested By</th><th>Approved By</th><th>Status</th><th>Requested</th><th>Completed</th><th>Cost</th><th>Remarks</th>
                </tr>
              </thead>
              <tbody>${maintRows}</tbody>
            </table>

            <div class="section-title">Fuel</div>
            <table>
              <thead>
                <tr>
                  <th>Req ID</th><th>Vehicle</th><th>Plate</th><th>Fuel Type</th><th>Quantity</th><th>Price/L</th>
                  <th>Total Cost</th><th>KM</th><th>Purpose</th><th>Requested By</th><th>Approved By</th><th>Status</th><th>Requested</th><th>Issued</th>
                </tr>
              </thead>
              <tbody>${fuelRows}</tbody>
            </table>
          </body>
        </html>
      `;

      const w = window.open('', '_blank', 'toolbar=0,location=0,menubar=0,width=900,height=700');
      if (!w) {
        setAlert({ type: 'error', message: 'Popup blocked. Allow popups for this site to print.' });
        setTimeout(() => setAlert({ type: '', message: '' }), 4000);
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      // Give the window a moment to render before printing
      setTimeout(() => { w.print(); }, 500);
    } catch (err) {
      console.error('Print report error', err);
      setAlert({ type: 'error', message: 'Failed to generate print report' });
      setTimeout(() => setAlert({ type: '', message: '' }), 4000);
    }
  };


  const confirmDelete = (vehicle) => {
    setVehicleToDelete(vehicle);
    setShowDeleteModal(true);
  };
  
  const openAddModal = () => {
    setEditingVehicle(null);
    setFormData(initialFormData);
    setFormError('');
    setShowModal(true);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'under_maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      vehicle.plateNumber?.toLowerCase().includes(searchLower) ||
      vehicle.model?.toLowerCase().includes(searchLower) ||
      vehicle.manufacturer?.toLowerCase().includes(searchLower) ||
      vehicle.type?.toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
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
          <h1 className="text-2xl font-bold text-gray-900">Vehicles Management</h1>
          <p className="text-gray-600">Manage fleet vehicles and driver assignments</p>
        </div>
        <button
          onClick={openAddModal}
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vehicle</span>
        </button>
      </div>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by plate, model, manufacturer..."
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
              <option value="active">Active</option>
              <option value="under_maintenance">Under Maintenance</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Vehicle</th>
                <th className="table-header">Plate #</th>
                <th className="table-header">Driver</th>
                <th className="table-header">Status</th>
                <th className="table-header">Current KM</th>
                <th className="table-header">Service Interval</th>
                <th className="table-header">Next Service</th>
                <th className="table-header">KM to Service</th>
                <th className="table-header">Fuel Type</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVehicles.map((vehicle) => (
                <tr key={vehicle._id} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Truck className="h-4 w-4 text-primary-600" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {vehicle.year} {vehicle.manufacturer} {vehicle.model}
                        </div>
                        <div className="text-sm text-gray-500">{vehicle.type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">{vehicle.plateNumber}</td>
                  <td className="table-cell">
                    {vehicle.assignedDriver ? (
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {vehicle.assignedDriver.fullName || vehicle.assignedDriver.username || 'Unknown'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Unassigned</span>
                    )}
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${getStatusBadgeColor(vehicle.status)}`}>
                      {vehicle.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="table-cell">{vehicle.currentKm?.toLocaleString()} km</td>
                  <td className="table-cell">{(vehicle.serviceIntervalKm ?? 5000).toLocaleString()} km</td>
                  <td className="table-cell">
                    {vehicle.serviceInfo?.nextServiceKm ? `${vehicle.serviceInfo.nextServiceKm.toLocaleString()} km` : '—'}
                  </td>
                  <td className="table-cell">{vehicle.serviceInfo?.kilometersUntilNextService != null ? `${vehicle.serviceInfo.kilometersUntilNextService.toLocaleString()} km` : '—'}</td>
                  <td className="table-cell">{vehicle.fuelType}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(vehicle)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 shadow-sm"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openHistoryModal(vehicle)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                        title="Service history"
                        aria-label="Service history"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M3 12h18M3 17h18" /></svg>
                      </button>
                      <button
                        onClick={() => confirmDelete(vehicle)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {vehicleErrors[vehicle._id] && (
                      <div className="mt-2 text-sm text-red-600">{vehicleErrors[vehicle._id]}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredVehicles.length === 0 && (
          <div className="text-center py-8">
            <Truck className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No vehicles found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding a new vehicle.'
              }
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-lg w-full">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h3>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-4">
                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-800 px-3 py-2 rounded-md">
                      {formError}
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Manufacturer</label>
                      <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({...formData, manufacturer: e.target.value})} className="input-field" />
                    </div>
                    <div>
                      <label className="form-label">Model</label>
                      <input type="text" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} className="input-field" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Year</label>
                      <input type="number" value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} className="input-field" />
                    </div>
                    <div>
                      <label className="form-label">Plate Number</label>
                      <input type="text" value={formData.plateNumber} onChange={(e) => setFormData({...formData, plateNumber: e.target.value})} className="input-field" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                      <label className="form-label">Type</label>
                      <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="input-field">
                        <option>Automobile</option>
                        <option>Light Duty</option>
                        <option>Heavy Duty</option>
                        <option>Machinery</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label">Fuel Type</label>
                      <select value={formData.fuelType} onChange={(e) => setFormData({...formData, fuelType: e.target.value})} className="input-field" required>
                        <option>Petrol</option>
                        <option>Diesel</option>
                        <option>Electric</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Previous Service KM</label>
                      <input type="number" value={formData.previousServiceKm} onChange={(e) => setFormData({...formData, previousServiceKm: e.target.value})} className="input-field" placeholder="Last service odometer" min="0" />
                    </div>
                    <div>
                      <label className="form-label">Current Kilometers</label>
                      <input type="number" value={formData.currentKm} onChange={(e) => setFormData({...formData, currentKm: e.target.value})} className="input-field" required />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Service Interval (KM)</label>
                    <input
                      type="number"
                      value={formData.serviceIntervalKm}
                      onChange={(e) => setFormData({ ...formData, serviceIntervalKm: e.target.value })}
                      className="input-field"
                      placeholder="e.g. 5000"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="form-label">Assigned Driver</label>
                    <select value={formData.assignedDriver} onChange={(e) => setFormData({...formData, assignedDriver: e.target.value})} className="input-field">
                      <option value="">Select Driver</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>{user.fullName || user.username}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="input-field">
                      <option value="active">Active</option>
                      <option value="under_maintenance">Under Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">{editingVehicle ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" />
            <div className="bg-white rounded-lg shadow-xl transform transition-all sm:max-w-3xl w-full">
              <div className="px-6 py-4 border-b">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Vehicle History — {historyVehicle?.plateNumber || ''}</h3>
                    <div className="text-sm text-gray-600">{historyVehicle?.manufacturer || ''} {historyVehicle?.model || ''} • {historyVehicle?.year || ''}</div>
                    <div className="mt-2 flex items-center gap-3">
                      <div className={`px-2 py-1 rounded ${getStatusBadgeColor(historyVehicle?.status) || 'bg-gray-100 text-gray-800'}`}>{(historyVehicle?.status || '').replace('_',' ')}</div>
                      <div className="text-sm text-gray-500">KM: <span className="font-medium">{historyVehicle?.currentKm?.toLocaleString() ?? '—'}</span></div>
                      <div className="text-sm text-gray-500">Next Service: <span className="font-medium">{historyVehicle?.serviceInfo?.nextServiceKm ? `${historyVehicle.serviceInfo.nextServiceKm.toLocaleString()} km` : '—'}</span></div>
                    </div>
                  </div>
                    <div className="text-right flex items-center gap-2">
                    <button onClick={exportHistory} title="Export history CSV" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                      <DownloadCloud className="h-4 w-4" /> Export
                    </button>
                    <button onClick={printHistoryReport} title="Print history" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                      <Printer className="h-4 w-4" /> Print
                    </button>
                    <button onClick={() => setShowHistoryModal(false)} title="Close history" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                      <X className="h-4 w-4" />
                      <span className="hidden sm:inline">Close</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {historyLoading ? (
                  <div className="text-center py-8">Loading history...</div>
                ) : !historyTimeline || historyTimeline.length === 0 ? (
                  <div className="text-center py-8"><p className="text-sm text-gray-500">No history available for this vehicle.</p></div>
                ) : (
                  <div className="space-y-4">
                    {historyTimeline.map((item, idx) => {
                      const stableKey = item.data?._id || idx;
                      const handleCardClick = () => {
                        if (item.type === 'maintenance' && item.data?._id) navigate(`/maintenance?highlight=${item.data._id}`);
                        else if (item.type === 'fuel' && item.data?._id) navigate(`/fuel?highlight=${item.data._id}`);
                      };
                      return (
                        <div key={stableKey} onClick={handleCardClick} className="p-3 border rounded-md hover:shadow-sm transition-shadow flex items-start justify-between cursor-pointer hover:bg-gray-50">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${getTypeBadgeColor(item.type)}`}>
                                {item.type === 'maintenance' ? (
                                  <Wrench className="h-5 w-5 text-current" aria-hidden="true" />
                                ) : item.type === 'fuel' ? (
                                  <Fuel className="h-5 w-5 text-current" aria-hidden="true" />
                                ) : (
                                  <Settings className="h-5 w-5 text-current" aria-hidden="true" />
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <div className="text-sm text-gray-600">{item.date.toLocaleString()}</div>
                                <div className="text-sm font-medium text-gray-700">{item.type === 'service' ? 'Service' : item.type === 'maintenance' ? 'Maintenance' : 'Fuel'}</div>
                                {item.type !== 'service' && item.data?.status && (
                                  <div className={`ml-2 px-2 py-0.5 rounded text-xs ${getRequestBadgeColor(item.data.status)}`}>{String(item.data.status).replace('_',' ')}</div>
                                )}
                              </div>
                              <div className="mt-2 text-sm text-gray-800">
                                {item.type === 'service' && (
                                  <div>
                                    <div><strong>KM:</strong> {item.data.km?.toLocaleString ? item.data.km?.toLocaleString() : (item.data.km ?? '—')} km</div>
                                    <div><strong>Notes:</strong> {item.data.notes || '—'}</div>
                                    {item.data.maintenance && (
                                      <div className="mt-2 p-2 border rounded bg-white">
                                        <div className="flex justify-between items-start">
                                          <div className="text-sm font-medium">Maintenance</div>
                                          <div className="text-xs text-gray-500">Status: <span className="font-medium">{item.data.maintenance.status || '—'}</span></div>
                                        </div>
                                        <div className="mt-1 text-sm"><strong>Category:</strong> {item.data.maintenance.category || '—'}</div>
                                        <div className="mt-1 text-sm"><strong>Description:</strong> {item.data.maintenance.description || item.data.maintenance.notes || '—'}</div>
                                        <div className="mt-1 text-sm"><strong>Cost:</strong> {item.data.maintenance.cost != null ? `${item.data.maintenance.cost}` : '—'}</div>
                                        <div className="mt-1 text-xs text-gray-500">Requested by: {item.data.maintenance.requestedBy?.fullName || item.data.maintenance.requestedBy?.username || item.data.maintenance.requester || '—'}</div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {item.type === 'maintenance' && (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div><strong>Category:</strong> {item.data.category || '—'}</div>
                                    </div>
                                    <div className="mt-1"><strong>Description:</strong> {item.data.description || item.data.notes || '—'}</div>
                                    <div className="mt-1"><strong>Cost:</strong> {item.data.cost != null ? `${item.data.cost}` : '—'}</div>
                                    <div className="mt-1 text-xs text-gray-500">Requested by: {item.data.requestedBy?.fullName || item.data.requestedBy?.username || item.data.requester || '—'}</div>
                                  </div>
                                )}
                                {item.type === 'fuel' && (
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <div><strong>Quantity:</strong> {item.data.quantity ?? '—'} {item.data.fuelType || ''}</div>
                                    </div>
                                    <div className="mt-1"><strong>KM:</strong> {item.data.currentKm?.toLocaleString() || '—'}</div>
                                    <div className="mt-1"><strong>Cost:</strong> {item.data.cost != null ? `${item.data.cost}` : '—'}</div>
                                    <div className="mt-1"><strong>Purpose:</strong> {item.data.purpose || '—'}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex-shrink-0 ml-4">
                            {(item.type === 'maintenance' || item.type === 'fuel') && item.data && item.data._id && (
                              <button onClick={(e) => { e.stopPropagation(); handleCardClick(); }} className="btn-primary">
                                View
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
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
                    <Truck className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">Delete Vehicle</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Are you sure you want to delete this vehicle? This action cannot be undone.
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

export default Vehicles;
