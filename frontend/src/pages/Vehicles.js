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

  // Tracking Token Modal State
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingData, setTrackingData] = useState(null);
  const [trackingLoading, setTrackingLoading] = useState(false);

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
      console.log('✅ Vehicles API Response:', vehiclesRes);
      console.log('✅ Vehicles Data:', vehiclesRes.data);
      console.log('✅ Number of vehicles:', vehiclesRes.data?.length || 0);
      setVehicles(vehiclesRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      console.error('❌ Error response:', error.response);
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
      timelineItems.sort((a, b) => b.date - a.date);

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

  const formatNumber = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const n = Number(val);
    if (isNaN(n)) return String(val);
    return n.toLocaleString();
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

      // Helper to resolve serviced KM from a maintenance record by falling back
      // to service/maintenance history when necessary.
      const resolveServiceKmForExport = (maint) => {
        if (!maint) return '';
        if (maint.serviceKm !== undefined && maint.serviceKm !== null && maint.serviceKm !== '') return maint.serviceKm;

        const serviceEntries = [];
        if (Array.isArray(historyVehicle.serviceHistory)) {
          historyVehicle.serviceHistory.forEach(s => { if (s && s.date) serviceEntries.push(s); });
        }
        if (Array.isArray(historyVehicle.maintenanceHistory)) {
          historyVehicle.maintenanceHistory.forEach(s => { if (s && s.date) serviceEntries.push(s); });
        }

        if (!serviceEntries.length) return '';

        // Try to match by exact KM on entries
        if (maint.serviceKm !== undefined && maint.serviceKm !== null && maint.serviceKm !== '') {
          const exact = serviceEntries.find(s => s.km != null && Number(s.km) === Number(maint.serviceKm));
          if (exact) return exact.km;
        }

        // Try date match within one day
        const maintDate = maint.completedDate || maint.updatedAt || maint.requestedDate || maint.createdAt || null;
        if (maintDate) {
          const mTime = new Date(maintDate).getTime();
          const dateMatch = serviceEntries.find(s => {
            try { return Math.abs(new Date(s.date).getTime() - mTime) <= 24 * 60 * 60 * 1000; } catch (e) { return false; }
          });
          if (dateMatch) return dateMatch.km ?? '';
        }

        // Try substring match on notes/description
        if (maint.description) {
          const desc = String(maint.description).toLowerCase();
          const textMatch = serviceEntries.find(s => (s.notes || '').toLowerCase().includes(desc) || desc.includes((s.notes || '').toLowerCase()));
          if (textMatch) return textMatch.km ?? '';
        }

        return '';
      };

      // Maintenance rows (map fields from maintenance objects)
      const maintRows = (historyVehicle.maintenance || []).map(m => {
        const resolvedKm = resolveServiceKmForExport(m);
        return ({
          RequestID: m._id || '',
          PlateNumber: historyVehicle.plateNumber || '',
          Category: m.category || '',
          Description: m.description || m.notes || '',
          ServiceKM: (resolvedKm !== undefined && resolvedKm !== null && resolvedKm !== '') ? formatNumber(resolvedKm) : (m.service?.km != null ? formatNumber(m.service.km) : ''),
          Priority: m.priority || '',
          Status: m.status || '',
          RequestedBy: getUserName(m.requestedBy || m.requester),
          ApprovedBy: getUserName(m.approvedBy),
          CompletedDate: m.completedDate || m.approvedDate || m.requestedDate || m.createdAt || '',
          Cost: m.cost != null ? formatNumber(m.cost) : '',
          Remarks: m.remarks || '',
          CreatedAt: m.createdAt || '',
        });
      });

      // Fuel rows
      const fuelRows = (historyVehicle.fuel || []).map(f => ({
        RequestID: f._id || '',
        PlateNumber: historyVehicle.plateNumber || '',
        Quantity: f.quantity ?? '',
        FuelType: f.fuelType || '',
        CurrentKM: f.currentKm != null ? formatNumber(f.currentKm) : '',
        Status: f.status || '',
        RequestedBy: getUserName(f.requestedBy || f.requester),
        ApprovedBy: getUserName(f.approvedBy),
        IssuedDate: f.issuedDate || f.approvedDate || f.createdAt || '',
        Cost: f.cost != null ? formatNumber(f.cost) : '',
        Purpose: f.purpose || '',
        CreatedAt: f.createdAt || '',
      }));

      const wb = XLSX.utils.book_new();

      // Cover sheet (company template)
      const companyName = 'ACME Fleet Services';
      const coverLines = [
        [companyName],
        [],
        ['Report', `Vehicle History Report`],
        ['Plate Number', vehicleInfo.PlateNumber || ''],
        ['Manufacturer', vehicleInfo.Manufacturer || ''],
        ['Model', vehicleInfo.Model || ''],
        ['Year', vehicleInfo.Year || ''],
        ['Fuel Type', vehicleInfo.FuelType || ''],
        ['Current KM', vehicleInfo.CurrentKM || ''],
        ['Status', vehicleInfo.Status || ''],
        [],
        ['Generated On', new Date().toLocaleString()],
      ];
      const coverSheet = XLSX.utils.aoa_to_sheet(coverLines);
      // Make first row larger by merging and leaving cell A1 as title (merge A1:D1)
      coverSheet['!merges'] = coverSheet['!merges'] || [];
      coverSheet['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } });
      // set some column widths (approx)
      coverSheet['!cols'] = [{ wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, coverSheet, 'Cover');

      // Vehicle sheet
      const vehicleSheet = XLSX.utils.json_to_sheet([vehicleInfo]);
      vehicleSheet['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, vehicleSheet, 'Vehicle');

      // Maintenance sheet
      const maintSheet = XLSX.utils.json_to_sheet(maintRows.length ? maintRows : [{ Note: 'No maintenance records' }]);
      // set reasonable column widths for readability
      maintSheet['!cols'] = [
        { wch: 18 }, // RequestID
        { wch: 16 }, // PlateNumber
        { wch: 12 }, // Category
        { wch: 40 }, // Description
        { wch: 10 }, // ServiceKM
        { wch: 10 }, // Priority
        { wch: 18 }, // Status
        { wch: 20 }, // RequestedBy
        { wch: 20 }, // ApprovedBy
        { wch: 14 }, // CompletedDate
        { wch: 10 }, // Cost
        { wch: 30 }, // Remarks
        { wch: 14 }, // CreatedAt
      ];
      XLSX.utils.book_append_sheet(wb, maintSheet, 'Maintenance');

      // Fuel sheet
      const fuelSheet = XLSX.utils.json_to_sheet(fuelRows.length ? fuelRows : [{ Note: 'No fuel records' }]);
      fuelSheet['!cols'] = [
        { wch: 18 }, // RequestID
        { wch: 16 }, // PlateNumber
        { wch: 10 }, // Quantity
        { wch: 12 }, // FuelType
        { wch: 12 }, // CurrentKM
        { wch: 14 }, // Status
        { wch: 20 }, // RequestedBy
        { wch: 20 }, // ApprovedBy
        { wch: 14 }, // IssuedDate
        { wch: 10 }, // Cost
        { wch: 20 }, // Purpose
        { wch: 14 }, // CreatedAt
      ];
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
        .no-wrap { white-space: nowrap; }
      `;

      const escape = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const formatDate = (val) => {
        if (!val) return '';
        try {
          const d = new Date(val);
          if (isNaN(d)) return String(val);
          return d.toLocaleDateString();
        } catch (e) {
          return String(val);
        }
      };

      const formatNumber = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const n = Number(val);
        if (isNaN(n)) return String(val);
        return n.toLocaleString();
      };

      // Resolve serviced km for a maintenance request by checking the request itself
      // and falling back to vehicle service/maintenance history entries.
      const resolveServiceKm = (maint) => {
        if (!maint) return '';
        if (maint.serviceKm !== undefined && maint.serviceKm !== null) return maint.serviceKm;

        // Gather service entries from vehicle (serviceHistory and maintenanceHistory)
        const serviceEntries = [];
        if (Array.isArray(historyVehicle.serviceHistory)) {
          historyVehicle.serviceHistory.forEach(s => { if (s && s.date) serviceEntries.push(s); });
        }
        if (Array.isArray(historyVehicle.maintenanceHistory)) {
          historyVehicle.maintenanceHistory.forEach(s => { if (s && s.date) serviceEntries.push(s); });
        }

        if (!serviceEntries.length) return '';

        // 1) try exact km match against any service entry
        const kmMatch = serviceEntries.find(s => s.km != null && maint.serviceKm != null && Number(s.km) === Number(maint.serviceKm));
        if (kmMatch) return kmMatch.km;

        // 2) try to match by date within one day
        const maintDate = maint.completedDate || maint.updatedAt || maint.requestedDate || maint.createdAt || null;
        if (maintDate) {
          const mTime = new Date(maintDate).getTime();
          const dateMatch = serviceEntries.find(s => {
            try {
              const sTime = new Date(s.date).getTime();
              return Math.abs(sTime - mTime) <= 24 * 60 * 60 * 1000;
            } catch (e) { return false; }
          });
          if (dateMatch) return dateMatch.km ?? '';
        }

        // 3) try notes/description substring match
        if (maint.description) {
          const desc = String(maint.description).toLowerCase();
          const textMatch = serviceEntries.find(s => (s.notes || '').toLowerCase().includes(desc) || desc.includes((s.notes || '').toLowerCase()));
          if (textMatch) return textMatch.km ?? '';
        }

        return '';
      };

      const maintRows = (historyVehicle.maintenance || []).map(i => {
        const resolvedKm = resolveServiceKm(i);
        return `
        <tr>
          <td>${escape(i._id)}</td>
          <td class="no-wrap">${escape(historyVehicle.manufacturer)} ${escape(historyVehicle.model)}</td>
          <td class="no-wrap">${escape(historyVehicle.plateNumber)}</td>
          <td>${escape(i.category)}</td>
          <td>${escape(i.description || i.notes)}</td>
          <td>${escape(formatNumber(resolvedKm ?? (i.service?.km ?? '')))}</td>
          <td>${escape(i.priority)}</td>
          <td>${escape(i.requestedBy?.fullName || i.requestedBy || i.requester)}</td>
          <td>${escape(i.approvedBy?.fullName || i.approvedBy)}</td>
          <td>${escape(i.status)}</td>
          <td>${escape(formatDate(i.requestedDate || i.createdAt))}</td>
          <td>${escape(formatDate(i.completedDate || ''))}</td>
          <td>${escape(i.cost != null ? formatNumber(i.cost) : '')}</td>
          <td>${escape(i.remarks || '')}</td>
          <td>${i.images && i.images.length > 0 ? i.images.length + ' image(s)' : ''}</td>
        </tr>
      `}).join('') || '<tr><td colspan="14">No maintenance records</td></tr>';

      const fuelRows = (historyVehicle.fuel || []).map(i => `
        <tr>
          <td>${escape(i._id)}</td>
          <td class="no-wrap">${escape(historyVehicle.manufacturer)} ${escape(historyVehicle.model)}</td>
          <td class="no-wrap">${escape(historyVehicle.plateNumber)}</td>
          <td>${escape(i.fuelType)}</td>
          <td>${escape(i.quantity != null ? formatNumber(i.quantity) : '')}</td>
          <td>${escape(i.pricePerLitre != null ? formatNumber(i.pricePerLitre) : '')}</td>
          <td>${escape(i.cost != null ? formatNumber(i.cost) : '')}</td>
          <td>${escape(i.currentKm != null ? formatNumber(i.currentKm) : '')}</td>
          <td>${escape(i.purpose || '')}</td>
          <td>${escape(i.requestedBy?.fullName || i.requestedBy || i.requester)}</td>
          <td>${escape(i.approvedBy?.fullName || i.approvedBy)}</td>
          <td>${escape(i.status)}</td>
          <td>${escape(formatDate(i.createdAt || ''))}</td>
          <td>${escape(formatDate(i.issuedDate || ''))}</td>
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
                  <th>Req ID</th><th>Vehicle</th><th>Plate</th><th>Category</th><th>Description</th><th>Serviced KM</th><th>Priority</th>
                    <th>Requested By</th><th>Approved By</th><th>Status</th><th>Requested</th><th>Completed</th><th>Cost</th><th>Remarks</th><th>Images</th>
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

  console.log('🔍 Total vehicles:', vehicles.length);
  console.log('🔍 Filtered vehicles:', filteredVehicles.length);
  console.log('🔍 Search term:', searchTerm);
  console.log('🔍 Status filter:', statusFilter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const handleOpenTracking = async (vehicle) => {
    // If vehicle already has a token (we might need to fetch it or just generate a new one if not visible)
    // For now, let's just generate/fetch via the generate endpoint which returns existing or new
    setTrackingLoading(true);
    setShowTrackingModal(true);
    setTrackingData(null);
    try {
      const res = await vehiclesAPI.generateTrackingToken(vehicle._id);
      setTrackingData(res.data);
    } catch (error) {
      console.error('Error fetching tracking token:', error);
      setAlert({ type: 'error', message: 'Failed to generate tracking token' });
      setShowTrackingModal(false);
    } finally {
      setTrackingLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setAlert({ type: 'success', message: 'Copied to clipboard!' });
    setTimeout(() => setAlert({ type: '', message: '' }), 3000);
  };



  return (
    <div className="space-y-6">
      {/* ... existing alerts and headers ... */}
      {alert.message && (
        <div className={`mb-4 p-3 rounded-md ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`} role="alert">
          <div className="flex justify-between items-center">
            <div>{alert.message}</div>
            <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm underline">Dismiss</button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="relative bg-gradient-to-br from-purple-600 via-primary-600 to-blue-600 rounded-2xl shadow-2xl overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }}></div>

        <div className="relative px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-30"></div>
                <div className="relative w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border-2 border-white/30 shadow-2xl">
                  <Truck className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px w-10 bg-white/40"></div>
                  <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/70">Fleet Management</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-1">
                  Vehicles Management
                </h1>
                <p className="text-white/80 font-semibold text-sm">Manage fleet vehicles and driver assignments</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={openAddModal}
                className="group relative px-6 py-3 bg-white text-primary-600 font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Plus className="h-5 w-5 relative z-10" />
                <span className="text-sm relative z-10">Add Vehicle</span>
              </button>

              <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Truck className="h-4 w-4 text-white" />
                <span className="text-sm font-bold text-white">{filteredVehicles.length} Total Vehicles</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Search Vehicles</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by plate, model, manufacturer..."
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
                <option value="active">Active</option>
                <option value="under_maintenance">Under Maintenance</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 overflow-hidden">
        {/* Table Header with Colorful Accent */}
        <div className="relative bg-gradient-to-r from-white via-purple-50 to-white px-6 py-6 border-b-4 border-purple-500">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600"></div>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-primary-600 rounded-xl blur opacity-30"></div>
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Truck className="h-6 w-6 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Fleet Vehicles</h3>
                <p className="text-xs text-purple-600 font-bold mt-0.5">Vehicle management and assignments</p>
              </div>
            </div>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Plate Number</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Manufacturer</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Fuel Type</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Current KM</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Service Interval</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Previous Service</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Next Service</th>
                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Assigned Driver</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-center text-xs font-black text-gray-500 uppercase tracking-wider">GPS Status</th>
                <th className="px-4 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVehicles.length > 0 ? (
                filteredVehicles.map((vehicle) => (
                  <tr key={vehicle._id} className="hover:bg-purple-50/30 transition-colors group">
                    {/* Plate Number */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-900">{vehicle.plateNumber}</span>
                      </div>
                      {vehicleErrors[vehicle._id] && (
                        <p className="text-xs text-red-600 mt-1 font-bold bg-red-50 p-1 rounded border border-red-100">
                          {vehicleErrors[vehicle._id]}
                        </p>
                      )}
                    </td>

                    {/* Manufacturer */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{vehicle.manufacturer || '—'}</span>
                    </td>

                    {/* Model */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{vehicle.model || '—'}</span>
                    </td>

                    {/* Year */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600">{vehicle.year || '—'}</span>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                        {vehicle.type || '—'}
                      </span>
                    </td>

                    {/* Fuel Type */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Fuel className="h-3 w-3 text-purple-600" />
                        <span className="text-sm text-gray-700">{vehicle.fuelType || '—'}</span>
                      </div>
                    </td>

                    {/* Current KM */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {vehicle.currentKm?.toLocaleString() || '0'}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">km</span>
                    </td>

                    {/* Service Interval */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm text-gray-700">
                        {vehicle.serviceIntervalKm?.toLocaleString() || '—'}
                      </span>
                      {vehicle.serviceIntervalKm && <span className="text-xs text-gray-400 ml-1">km</span>}
                    </td>

                    {/* Previous Service KM */}
                    <td className="px-4 py-3 text-center">
                      <span className="font-mono text-sm text-gray-700">
                        {vehicle.previousServiceKm?.toLocaleString() || '—'}
                      </span>
                      {vehicle.previousServiceKm != null && <span className="text-xs text-gray-400 ml-1">km</span>}
                    </td>

                    {/* Next Service KM */}
                    <td className="px-4 py-3 text-center">
                      {vehicle.serviceInfo?.nextServiceKm ? (
                        <div>
                          <span className="font-mono text-sm font-semibold text-blue-700">
                            {vehicle.serviceInfo.nextServiceKm.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">km</span>
                          {vehicle.serviceInfo.kilometersUntilNextService != null && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              ({vehicle.serviceInfo.kilometersUntilNextService.toLocaleString()} km left)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>

                    {/* Assigned Driver */}
                    <td className="px-4 py-3">
                      {vehicle.assignedDriver ? (
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-purple-100 flex items-center justify-center border border-purple-200 text-purple-700 font-bold text-xs">
                            {vehicle.assignedDriver.fullName?.charAt(0) || vehicle.assignedDriver.username?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{vehicle.assignedDriver.fullName}</p>
                            <p className="text-xs text-gray-500">@{vehicle.assignedDriver.username}</p>
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-gray-50 text-gray-400 border border-gray-200 border-dashed">
                          <User className="h-3 w-3" />
                          Unassigned
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusBadgeColor(vehicle.status)}`}>
                        <span className={`w-1 h-1 rounded-full ${vehicle.status === 'active' ? 'bg-green-500 animate-pulse' : vehicle.status === 'inactive' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                        {vehicle.status?.replace('_', ' ') || 'Unknown'}
                      </span>
                    </td>

                    {/* GPS Status */}
                    <td className="px-4 py-3 text-center">
                      {vehicle.isTracking ? (
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${vehicle.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${vehicle.isOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
                            {vehicle.isOnline ? 'Online' : 'Offline'}
                          </span>
                          {vehicle.lastLocationUpdate && (
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(vehicle.lastLocationUpdate).toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not tracking</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* GPS Tracking Button */}
                        <button
                          onClick={() => handleOpenTracking(vehicle)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg hover:shadow-md transition-all"
                          title="GPS Tracker Setup"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => openHistoryModal(vehicle)}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg hover:shadow-md transition-all"
                          title="View History"
                        >
                          <DownloadCloud className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(vehicle)}
                          className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg hover:shadow-md transition-all"
                          title="Edit Vehicle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(vehicle)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg hover:shadow-md transition-all"
                          title="Delete Vehicle"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="14" className="px-6 py-12 text-center text-gray-500 bg-gray-50/30">
                    <Truck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-lg font-bold text-gray-900">No vehicles found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tracking Token Modal */}
      {showTrackingModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={() => setShowTrackingModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

            <div className="inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-2xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6 border-2 border-blue-500 relative">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="sm:flex sm:items-start">
                <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-blue-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-xl font-black text-gray-900 leading-6">
                    GPS Tracking Setup
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 mb-4">
                      Scan the QR code or use the link below on a mobile device to start tracking this vehicle.
                    </p>

                    {trackingLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                      </div>
                    ) : trackingData ? (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        {/* Token Info */}
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Vehicle</label>
                          <p className="font-bold text-gray-900">{trackingData.plateNumber}</p>
                        </div>

                        {/* Tracker URL */}
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tracker URL</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              readOnly
                              value={trackingData.trackerUrl || ''}
                              className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg font-mono text-gray-600"
                            />
                            <button
                              onClick={() => copyToClipboard(trackingData.trackerUrl)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Copy URL"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Tracking Token */}
                        <div className="mb-4">
                          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Tracking Token</label>
                          <div className="flex gap-2">
                            <code className="w-full text-xs p-2 bg-white border border-gray-300 rounded-lg font-mono text-gray-600 break-all">
                              {trackingData.trackingToken}
                            </code>
                            <button
                              onClick={() => copyToClipboard(trackingData.trackingToken)}
                              className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Copy Token"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 text-center">
                          <p className="text-xs text-blue-600 font-medium">
                            Tip: Open the URL on a mobile device and keep the page active for best tracking.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-red-500">Failed to load data</div>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowTrackingModal(false)}
                  className="w-full inline-flex justify-center rounded-xl border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Vehicles Found */}
      {filteredVehicles.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl mb-4">
            <Truck className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">No Vehicles Found</h3>
          <p className="mt-2 text-sm text-gray-600 font-semibold max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all'
              ? 'Try adjusting your search or filter criteria to find what you\'re looking for.'
              : 'Get started by adding your first vehicle to the fleet.'
            }
          </p>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)} />

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
                        {editingVehicle ? 'Edit Vehicle' : 'Create Vehicle'}
                      </h3>
                      <p className="text-sm text-gray-500 font-semibold mt-1">
                        {editingVehicle ? 'Update vehicle information' : 'Add a new vehicle to the fleet'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
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
                  {formError && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 rounded-r-lg">
                      <p className="text-sm font-semibold">{formError}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Manufacturer</label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="e.g. Toyota"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Model *</label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        required
                        placeholder="e.g. Hilux"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Year</label>
                      <input
                        type="number"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="e.g. 2023"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Plate Number *</label>
                      <input
                        type="text"
                        value={formData.plateNumber}
                        onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        required
                        placeholder="e.g. AA-1234"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Type</label>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      >
                        <option>Automobile</option>
                        <option>Light Duty</option>
                        <option>Heavy Duty</option>
                        <option>Machinery</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Fuel Type *</label>
                      <select
                        value={formData.fuelType}
                        onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        required
                      >
                        <option>Petrol</option>
                        <option>Diesel</option>
                        <option>Electric</option>
                        <option>Hybrid</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Previous Service KM</label>
                      <input
                        type="number"
                        value={formData.previousServiceKm}
                        onChange={(e) => setFormData({ ...formData, previousServiceKm: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        placeholder="Last service KM"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Current Kilometers *</label>
                      <input
                        type="number"
                        value={formData.currentKm}
                        onChange={(e) => setFormData({ ...formData, currentKm: e.target.value })}
                        className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                        required
                        placeholder="Current odometer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Service Interval (KM)</label>
                    <input
                      type="number"
                      value={formData.serviceIntervalKm}
                      onChange={(e) => setFormData({ ...formData, serviceIntervalKm: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                      placeholder="e.g. 5000"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Assigned Driver</label>
                    <select
                      value={formData.assignedDriver}
                      onChange={(e) => setFormData({ ...formData, assignedDriver: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                    >
                      <option value="">Select Driver</option>
                      {users.map(user => (
                        <option key={user._id} value={user._id}>{user.fullName || user.username}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 transition-all"
                    >
                      <option value="active">Active</option>
                      <option value="under_maintenance">Under Maintenance</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-6 py-2.5 bg-gray-100 text-gray-700 font-bold uppercase tracking-wide text-sm rounded-lg hover:bg-gray-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-8 py-2.5 bg-gradient-to-r from-purple-600 via-primary-600 to-blue-600 text-white font-black uppercase tracking-wide text-sm rounded-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      {editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {
        showHistoryModal && (
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
                        <div className={`px-2 py-1 rounded ${getStatusBadgeColor(historyVehicle?.status) || 'bg-gray-100 text-gray-800'}`}>{(historyVehicle?.status || '').replace('_', ' ')}</div>
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
                                    <div className={`ml-2 px-2 py-0.5 rounded text-xs ${getRequestBadgeColor(item.data.status)}`}>{String(item.data.status).replace('_', ' ')}</div>
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
                                      <div className="mt-1"><strong>Serviced KM:</strong> {(item.data.serviceKm !== undefined && item.data.serviceKm !== null) ? item.data.serviceKm : (item.data.service?.km ?? '—')}</div>
                                      <div className="mt-1"><strong>Cost:</strong> {item.data.cost != null ? `${item.data.cost}` : '—'}</div>
                                      <div className="mt-1 text-xs text-gray-500">Requested by: {item.data.requestedBy?.fullName || item.data.requestedBy?.username || item.data.requester || '—'}</div>
                                      {item.data.images && item.data.images.length > 0 && (
                                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                                          {item.data.images.map((img, idx) => (
                                            <a key={idx} href={`http://localhost:7001${img.path}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block h-10 w-10 flex-shrink-0">
                                              <img src={`http://localhost:7001${img.path}`} alt="attachment" className="h-full w-full object-cover rounded border border-gray-200" />
                                            </a>
                                          ))}
                                        </div>
                                      )}
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
        )
      }

      {
        showDeleteModal && (
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
        )
      }
    </div >
  );
};

export default Vehicles;
