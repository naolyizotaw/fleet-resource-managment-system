import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { workOrdersAPI, maintenanceAPI, usersAPI, inventoryAPI } from '../services/api';
import { ClipboardList, Plus, Search, Filter, Wrench, User, Package, DollarSign, CheckCircle, Clock, XCircle, Printer, BarChart3, AlertCircle, X } from 'lucide-react';
import WorkOrderPrintTemplate from '../components/WorkOrderPrintTemplate';

const WorkOrders = () => {
    const { hasRole } = useAuth();
    const [workOrders, setWorkOrders] = useState([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState([]);
    const [users, setUsers] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [alert, setAlert] = useState({ type: '', message: '' });

    // Modals
    const [showConvertModal, setShowConvertModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showPartsModal, setShowPartsModal] = useState(false);
    const [showLaborModal, setShowLaborModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    const [selectedWorkOrder, setSelectedWorkOrder] = useState(null);
    const [selectedMaintenance, setSelectedMaintenance] = useState('');
    const [selectedMechanics, setSelectedMechanics] = useState([]);
    const [partsToAdd, setPartsToAdd] = useState([{ itemId: '', quantity: 1 }]);
    const [laborForm, setLaborForm] = useState({ mechanicId: '', hours: '', hourlyRate: '', description: '' });
    const [progressForm, setProgressForm] = useState({ note: '', status: '' });
    const [completeForm, setCompleteForm] = useState({ finalNotes: '' });

    const [highlightedId, setHighlightedId] = useState(null);
    const rowRefs = useRef({});
    const location = useLocation();
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [woRes, maintRes, usersRes, invRes] = await Promise.all([
                workOrdersAPI.getAll(),
                maintenanceAPI.getAll(),
                usersAPI.getAll(),
                inventoryAPI.getAll()
            ]);

            setWorkOrders(woRes.data || []);
            setMaintenanceRequests((maintRes.data || []).filter(m => m.status === 'approved'));
            setUsers(usersRes.data || []);
            setInventoryItems(invRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            showAlert('error', 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (loading) return;
        const params = new URLSearchParams(location.search);
        const targetId = params.get('highlight');
        if (!targetId) return;
        const el = rowRefs.current[targetId];
        if (el) {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch { }
            setHighlightedId(targetId);
            setTimeout(() => setHighlightedId(null), 4500);
            const newParams = new URLSearchParams(location.search);
            newParams.delete('highlight');
            navigate({ pathname: location.pathname, search: newParams.toString() ? `?${newParams.toString()}` : '' }, { replace: true });
        }
    }, [loading, workOrders, location.search, location.pathname, navigate]);

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    };

    const handleConvert = async () => {
        if (!selectedMaintenance) {
            showAlert('error', 'Please select a maintenance request');
            return;
        }
        try {
            const res = await workOrdersAPI.convertFromMaintenance(selectedMaintenance);
            setWorkOrders([res.data.workOrder, ...workOrders]);
            setShowConvertModal(false);
            setSelectedMaintenance('');
            showAlert('success', 'Work order created successfully');
            fetchData();
        } catch (error) {
            showAlert('error', error?.response?.data?.message || 'Failed to create work order');
        }
    };

    const handleAssignMechanics = async () => {
        if (selectedMechanics.length === 0) {
            showAlert('error', 'Please select at least one mechanic');
            return;
        }
        try {
            const res = await workOrdersAPI.assignMechanic(selectedWorkOrder._id, { mechanicIds: selectedMechanics });
            setWorkOrders(workOrders.map(wo => wo._id === selectedWorkOrder._id ? res.data.workOrder : wo));
            setShowAssignModal(false);
            setSelectedMechanics([]);
            showAlert('success', 'Mechanics assigned successfully');
        } catch (error) {
            showAlert('error', error?.response?.data?.message || 'Failed to assign mechanics');
        }
    };

    const handleAddParts = async () => {
        const validParts = partsToAdd.filter(p => p.itemId && p.quantity > 0);
        if (validParts.length === 0) {
            showAlert('error', 'Please add at least one valid part');
            return;
        }
        try {
            const res = await workOrdersAPI.addSpareParts(selectedWorkOrder._id, { parts: validParts });
            setWorkOrders(workOrders.map(wo => wo._id === selectedWorkOrder._id ? res.data.workOrder : wo));
            setShowPartsModal(false);
            setPartsToAdd([{ itemId: '', quantity: 1 }]);
            showAlert('success', 'Spare parts added successfully');
            fetchData();
        } catch (error) {
            showAlert('error', error?.response?.data?.message || 'Failed to add spare parts');
        }
    };

    const handleAddLabor = async () => {
        if (!laborForm.mechanicId || !laborForm.hours || !laborForm.hourlyRate) {
            showAlert('error', 'Please fill all required fields');
            return;
        }
        try {
            const res = await workOrdersAPI.addLaborCost(selectedWorkOrder._id, laborForm);
            setWorkOrders(workOrders.map(wo => wo._id === selectedWorkOrder._id ? res.data.workOrder : wo));
            setShowLaborModal(false);
            setLaborForm({ mechanicId: '', hours: '', hourlyRate: '', description: '' });
            showAlert('success', 'Labor cost added successfully');
        } catch (error) {
            showAlert('error', error?.response?.data?.message || 'Failed to add labor cost');
        }
    };

    const handleUpdateProgress = async () => {
        if (!progressForm.note.trim()) {
            showAlert('error', 'Please enter a progress note');
            return;
        }
        try {
            const res = await workOrdersAPI.updateProgress(selectedWorkOrder._id, progressForm);
            setWorkOrders(workOrders.map(wo => wo._id === selectedWorkOrder._id ? res.data.workOrder : wo));
            setShowProgressModal(false);
            setProgressForm({ note: '', status: '' });
            showAlert('success', 'Progress updated successfully');
        } catch (error) {
            showAlert('error', error?.response?.data?.message || 'Failed to update progress');
        }
    };

    const handleComplete = async () => {
        try {
            const res = await workOrdersAPI.complete(selectedWorkOrder._id, completeForm);
            setWorkOrders(workOrders.map(wo => wo._id === selectedWorkOrder._id ? res.data.workOrder : wo));
            setShowCompleteModal(false);
            setCompleteForm({ finalNotes: '' });
            showAlert('success', 'Work order completed successfully');
        } catch (error) {
            showAlert('error', error?.response?.data?.message || 'Failed to complete work order');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getStatusBadge = (status) => {
        const colors = {
            open: 'bg-blue-100 text-blue-800',
            in_progress: 'bg-yellow-100 text-yellow-800',
            on_hold: 'bg-orange-100 text-orange-800',
            completed: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle size={16} className="text-green-500" />;
            case 'in_progress': return <Clock size={16} className="text-yellow-500" />;
            case 'cancelled': return <XCircle size={16} className="text-red-500" />;
            default: return <Clock size={16} className="text-blue-500" />;
        }
    };

    const filteredWorkOrders = workOrders.filter(wo => {
        const matchesSearch = wo.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            wo.vehicleId?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || wo.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStats = () => {
        const total = workOrders.length;
        const open = workOrders.filter(wo => wo.status === 'open').length;
        const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
        const completed = workOrders.filter(wo => wo.status === 'completed').length;
        return { total, open, inProgress, completed };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {alert.message && (
                <div className={`mb-4 p-3 rounded-md ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`} role="alert">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            {alert.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            {alert.message}
                        </div>
                        <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm underline">Dismiss</button>
                    </div>
                </div>
            )}

            {/* Page Header */}
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-2xl overflow-hidden">
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
                                    <ClipboardList className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-px w-10 bg-white/40"></div>
                                    <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/70">Work Orders</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-1">
                                    Management Dashboard
                                </h1>
                                <p className="text-white/80 font-semibold text-sm">Track and manage all vehicle maintenance work orders</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowConvertModal(true)}
                                className="group relative px-6 py-3 bg-white text-blue-600 font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Plus className="h-5 w-5 relative z-10" />
                                <span className="text-sm relative z-10">Convert Maintenance</span>
                            </button>

                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                                <ClipboardList className="h-4 w-4 text-white" />
                                <span className="text-sm font-bold text-white">{filteredWorkOrders.length} Work Orders</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-md border-2 border-blue-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Total</p>
                            <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <BarChart3 className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-2 border-cyan-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Open</p>
                            <p className="text-3xl font-black text-gray-900">{stats.open}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Clock className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-2 border-yellow-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">In Progress</p>
                            <p className="text-3xl font-black text-gray-900">{stats.inProgress}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Wrench className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-2 border-green-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Completed</p>
                            <p className="text-3xl font-black text-gray-900">{stats.completed}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <CheckCircle className="h-7 w-7 text-white" />
                        </div>
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
                                placeholder="Search work orders..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>

                    <div className="md:w-56">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Status</label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Orders Table */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-blue-100 overflow-hidden">
                <div className="relative bg-gradient-to-r from-white via-blue-50 to-white px-6 py-6 border-b-4 border-blue-500">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700"></div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl blur opacity-30"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Wrench className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">All Work Orders</h3>
                                <p className="text-xs text-blue-600 font-bold mt-0.5">Track and manage approvals</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-blue-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">WO Number</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Plate Number</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Vehicle</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Priority</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Created Date</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Created By</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Completed Date</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Mechanics</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">Parts Cost</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">Labor Cost</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredWorkOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="px-6 py-12 text-center">
                                        <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-semibold">No work orders found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredWorkOrders.map((wo) => (
                                    <tr
                                        key={wo._id}
                                        ref={(el) => { if (el) rowRefs.current[wo._id] = el; }}
                                        className={`hover:bg-blue-50 transition-colors ${highlightedId === wo._id ? 'bg-yellow-50 ring-2 ring-amber-400' : ''}`}
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(wo.status)}
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => { setSelectedWorkOrder(wo); setShowDetailsModal(true); }}>
                                                        {wo.workOrderNumber}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{wo.vehicleId?.plateNumber || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{wo.vehicleId?.make} {wo.vehicleId?.model}</div>
                                            <div className="text-xs text-gray-500">Year: {wo.vehicleId?.year || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadge(wo.status)}`}>
                                                {wo.status.replace('_', ' ').charAt(0).toUpperCase() + wo.status.replace('_', ' ').slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900 capitalize">{wo.priority || '-'}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{new Date(wo.createdAt).toLocaleDateString()}</div>
                                            <div className="text-xs text-gray-500">{new Date(wo.createdAt).toLocaleTimeString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{wo.createdBy?.fullName || wo.createdBy?.username || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{wo.createdBy?.role || ''}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {wo.completedAt ? (
                                                <>
                                                    <div className="text-sm font-bold text-green-600">{new Date(wo.completedAt).toLocaleDateString()}</div>
                                                    <div className="text-xs text-gray-500">{new Date(wo.completedAt).toLocaleTimeString()}</div>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">
                                                {wo.assignedMechanics?.length > 0 ? wo.assignedMechanics.map(m => m.fullName || m.username).join(', ') : 'Not assigned'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-black text-gray-900">ETB {wo.totalPartsCost?.toLocaleString() || '0'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="text-sm font-black text-gray-900">ETB {wo.totalLaborCost?.toLocaleString() || '0'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                                    <>
                                                        <button onClick={() => { setSelectedWorkOrder(wo); setShowAssignModal(true); }} className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-100 rounded-lg" title="Assign Mechanic">
                                                            <User className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => { setSelectedWorkOrder(wo); setShowPartsModal(true); }} className="text-purple-600 hover:text-purple-900 transition-colors p-2 hover:bg-purple-100 rounded-lg" title="Add Parts">
                                                            <Package className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => { setSelectedWorkOrder(wo); setShowLaborModal(true); }} className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-100 rounded-lg" title="Add Labor">
                                                            <DollarSign className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => { setSelectedWorkOrder(wo); setShowProgressModal(true); }} className="text-yellow-600 hover:text-yellow-900 transition-colors p-2 hover:bg-yellow-100 rounded-lg" title="Update Progress">
                                                            <Wrench className="h-5 w-5" />
                                                        </button>
                                                        <button onClick={() => { setSelectedWorkOrder(wo); setShowCompleteModal(true); }} className="text-emerald-600 hover:text-emerald-900 transition-colors p-2 hover:bg-emerald-100 rounded-lg" title="Complete">
                                                            <CheckCircle className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Convert Modal */}
            {showConvertModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Convert to Work Order</h2>
                                <button
                                    onClick={() => setShowConvertModal(false)}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                            <div className="bg-white px-6 py-6">
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Select Approved Maintenance Request</label>
                                <select
                                    value={selectedMaintenance}
                                    onChange={(e) => setSelectedMaintenance(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                                >
                                    <option value="">Select...</option>
                                    {maintenanceRequests.map(m => (
                                        <option key={m._id} value={m._id}>
                                            {m.vehicleId?.plateNumber} - {m.description?.substring(0, 50)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button onClick={() => setShowConvertModal(false)} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">Cancel</button>
                                <button onClick={handleConvert} className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">Convert</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Mechanics Modal */}
            {showAssignModal && selectedWorkOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                                <h3 className="text-xl font-black text-white uppercase">Assign Mechanics</h3>
                            </div>
                            <div className="bg-white px-6 py-6">
                                <label className="block text-xs font-black text-gray-600 uppercase mb-2">Select Mechanics</label>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {users.map(u => (
                                        <label key={u._id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={selectedMechanics.includes(u._id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedMechanics([...selectedMechanics, u._id]);
                                                    } else {
                                                        setSelectedMechanics(selectedMechanics.filter(id => id !== u._id));
                                                    }
                                                }}
                                                className="rounded"
                                            />
                                            <span className="text-sm font-semibold">{u.fullName || u.username}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button onClick={() => { setShowAssignModal(false); setSelectedMechanics([]); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleAssignMechanics} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Assign</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Parts Modal */}
            {showPartsModal && selectedWorkOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPartsModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                                <h3 className="text-xl font-black text-white uppercase">Add Spare Parts</h3>
                            </div>
                            <div className="bg-white px-6 py-6 space-y-4">
                                {partsToAdd.map((part, idx) => (
                                    <div key={idx} className="flex gap-3">
                                        <select
                                            value={part.itemId}
                                            onChange={(e) => {
                                                const newParts = [...partsToAdd];
                                                newParts[idx].itemId = e.target.value;
                                                setPartsToAdd(newParts);
                                            }}
                                            className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold"
                                        >
                                            <option value="">Select Part...</option>
                                            {inventoryItems.map(item => (
                                                <option key={item._id} value={item._id}>
                                                    {item.itemName || item.name} - Stock: {item.currentStock} {item.unit || 'units'}
                                                </option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={part.quantity}
                                            onChange={(e) => {
                                                const newParts = [...partsToAdd];
                                                newParts[idx].quantity = parseInt(e.target.value) || 1;
                                                setPartsToAdd(newParts);
                                            }}
                                            className="w-24 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm"
                                            min="1"
                                        />
                                        {idx > 0 && (
                                            <button onClick={() => setPartsToAdd(partsToAdd.filter((_, i) => i !== idx))} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg">×</button>
                                        )}
                                    </div>
                                ))}
                                <button onClick={() => setPartsToAdd([...partsToAdd, { itemId: '', quantity: 1 }])} className="text-sm text-primary-600 font-bold">+ Add Another Part</button>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button onClick={() => { setShowPartsModal(false); setPartsToAdd([{ itemId: '', quantity: 1 }]); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleAddParts} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Add Parts</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Labor Modal */}
            {showLaborModal && selectedWorkOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLaborModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                                <h3 className="text-xl font-black text-white uppercase">Add Labor Cost</h3>
                            </div>
                            <div className="bg-white px-6 py-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase mb-2">Mechanic</label>
                                    <select value={laborForm.mechanicId} onChange={(e) => setLaborForm({ ...laborForm, mechanicId: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm">
                                        <option value="">Select...</option>
                                        {users.map(u => <option key={u._id} value={u._id}>{u.fullName || u.username}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-600 uppercase mb-2">Hours</label>
                                        <input type="number" value={laborForm.hours} onChange={(e) => setLaborForm({ ...laborForm, hours: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm" min="0" step="0.5" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-600 uppercase mb-2">Hourly Rate</label>
                                        <input type="number" value={laborForm.hourlyRate} onChange={(e) => setLaborForm({ ...laborForm, hourlyRate: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm" min="0" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase mb-2">Description (Optional)</label>
                                    <textarea value={laborForm.description} onChange={(e) => setLaborForm({ ...laborForm, description: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm" rows="3" />
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button onClick={() => { setShowLaborModal(false); setLaborForm({ mechanicId: '', hours: '', hourlyRate: '', description: '' }); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleAddLabor} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Add Labor</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Modal */}
            {showProgressModal && selectedWorkOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowProgressModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                                <h3 className="text-xl font-black text-white uppercase">Update Progress</h3>
                            </div>
                            <div className="bg-white px-6 py-6 space-y-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase mb-2">Progress Note</label>
                                    <textarea value={progressForm.note} onChange={(e) => setProgressForm({ ...progressForm, note: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm" rows="4" placeholder="Enter progress update..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase mb-2">Update Status (Optional)</label>
                                    <select value={progressForm.status} onChange={(e) => setProgressForm({ ...progressForm, status: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm">
                                        <option value="">Keep Current</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="on_hold">On Hold</option>
                                    </select>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button onClick={() => { setShowProgressModal(false); setProgressForm({ note: '', status: '' }); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleUpdateProgress} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Update</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Complete Modal */}
            {showCompleteModal && selectedWorkOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCompleteModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5">
                                <h3 className="text-xl font-black text-white uppercase">Complete Work Order</h3>
                            </div>
                            <div className="bg-white px-6 py-6 space-y-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <div className="text-sm font-bold text-gray-700">Total Cost: ETB {selectedWorkOrder.totalCost?.toLocaleString() || '0'}</div>
                                    <div className="text-xs text-gray-500 mt-1">Parts: ETB {selectedWorkOrder.totalPartsCost?.toLocaleString() || '0'} | Labor: ETB {selectedWorkOrder.totalLaborCost?.toLocaleString() || '0'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-600 uppercase mb-2">Final Notes (Optional)</label>
                                    <textarea value={completeForm.finalNotes} onChange={(e) => setCompleteForm({ ...completeForm, finalNotes: e.target.value })} className="w-full px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm" rows="3" placeholder="Any final notes or comments..." />
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button onClick={() => { setShowCompleteModal(false); setCompleteForm({ finalNotes: '' }); }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleComplete} className="px-4 py-2 bg-green-600 text-white rounded-lg font-bold">Complete Work Order</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {showDetailsModal && selectedWorkOrder && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-200 relative z-10 max-h-[90vh] overflow-y-auto">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5 sticky top-0 z-10">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black text-white uppercase">Work Order Details</h3>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handlePrint}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all font-bold text-sm uppercase tracking-wide"
                                        >
                                            <Printer size={16} />
                                            <span>Print</span>
                                        </button>
                                        <button onClick={() => setShowDetailsModal(false)} className="text-white hover:bg-white/20 rounded p-2 text-2xl leading-none">×</button>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white px-8 py-8">
                                {/* Company Header Section */}
                                <div className="border-b-4 border-primary-600 pb-5 mb-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-wide mb-2">
                                                FleetPro Management
                                            </h1>
                                            <p className="text-xs text-gray-500 uppercase tracking-widest">
                                                Fleet Resource Management System
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                                                Work Order
                                            </div>
                                            <div className="text-2xl font-black text-primary-600">
                                                {selectedWorkOrder.workOrderNumber}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Work Order Info & Vehicle Info */}
                                <div className="grid grid-cols-2 gap-6 mb-6">
                                    <div>
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                            Work Order Information
                                        </h3>
                                        <table className="w-full text-sm">
                                            <tbody>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Status:</td>
                                                    <td className="py-2">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getStatusBadge(selectedWorkOrder.status)}`}>
                                                            {selectedWorkOrder.status.replace('_', ' ').toUpperCase()}
                                                        </span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Priority:</td>
                                                    <td className="py-2 font-bold capitalize">{selectedWorkOrder.priority}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Category:</td>
                                                    <td className="py-2">{selectedWorkOrder.category || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Created:</td>
                                                    <td className="py-2">{new Date(selectedWorkOrder.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                                </tr>
                                                {selectedWorkOrder.startedDate && (
                                                    <tr>
                                                        <td className="py-2 text-gray-600 font-semibold">Started:</td>
                                                        <td className="py-2">{new Date(selectedWorkOrder.startedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                                    </tr>
                                                )}
                                                {selectedWorkOrder.completedDate && (
                                                    <tr>
                                                        <td className="py-2 text-gray-600 font-semibold">Completed:</td>
                                                        <td className="py-2">{new Date(selectedWorkOrder.completedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                            Vehicle Information
                                        </h3>
                                        <table className="w-full text-sm">
                                            <tbody>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Plate Number:</td>
                                                    <td className="py-2 font-bold">{selectedWorkOrder.vehicleId?.plateNumber || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Make/Model:</td>
                                                    <td className="py-2">{selectedWorkOrder.vehicleId?.manufacturer} {selectedWorkOrder.vehicleId?.model}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Year:</td>
                                                    <td className="py-2">{selectedWorkOrder.vehicleId?.year || '-'}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-2 text-gray-600 font-semibold">Current KM:</td>
                                                    <td className="py-2">{selectedWorkOrder.vehicleId?.currentKm?.toLocaleString() || '-'} km</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mb-6">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                        Description
                                    </h3>
                                    <p className="text-sm leading-relaxed text-gray-700 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        {selectedWorkOrder.description}
                                    </p>
                                </div>

                                {/* Assigned Mechanics */}
                                {selectedWorkOrder.assignedMechanics && selectedWorkOrder.assignedMechanics.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                            Assigned Mechanics
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedWorkOrder.assignedMechanics.map((mechanic, idx) => (
                                                <div key={idx} className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700">
                                                    {mechanic.fullName || mechanic.username}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Spare Parts Used */}
                                {selectedWorkOrder.spareParts?.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                            Spare Parts Used
                                        </h3>
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b-2 border-gray-200">
                                                    <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase tracking-wide">Part Name</th>
                                                    <th className="px-4 py-3 text-center text-xs font-black text-gray-600 uppercase tracking-wide">Status</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wide">Quantity</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wide">Unit Cost</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wide">Total Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedWorkOrder.spareParts.map((part, idx) => (
                                                    <tr key={idx} className="border-b border-gray-200">
                                                        <td className="px-4 py-3">{part.itemName}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${part.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                                part.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {part.status || 'pending'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{part.quantity}</td>
                                                        <td className="px-4 py-3 text-right">ETB {part.unitCost?.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-bold">ETB {part.totalCost?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-bold">
                                                    <td colSpan="4" className="px-4 py-3 text-right">Parts Subtotal:</td>
                                                    <td className="px-4 py-3 text-right text-primary-600">ETB {selectedWorkOrder.totalPartsCost?.toLocaleString() || '0'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Labor Costs */}
                                {selectedWorkOrder.laborCosts?.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                            Labor Costs
                                        </h3>
                                        <table className="w-full border-collapse text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b-2 border-gray-200">
                                                    <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase tracking-wide">Mechanic</th>
                                                    <th className="px-4 py-3 text-left text-xs font-black text-gray-600 uppercase tracking-wide">Description</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wide">Hours</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wide">Rate/Hour</th>
                                                    <th className="px-4 py-3 text-right text-xs font-black text-gray-600 uppercase tracking-wide">Total Cost</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedWorkOrder.laborCosts.map((labor, idx) => (
                                                    <tr key={idx} className="border-b border-gray-200">
                                                        <td className="px-4 py-3">{labor.mechanicId?.fullName || labor.mechanicId?.username || '-'}</td>
                                                        <td className="px-4 py-3 text-xs text-gray-600">{labor.description || '-'}</td>
                                                        <td className="px-4 py-3 text-right">{labor.hours}</td>
                                                        <td className="px-4 py-3 text-right">ETB {labor.hourlyRate?.toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-bold">ETB {labor.totalCost?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-bold">
                                                    <td colSpan="4" className="px-4 py-3 text-right">Labor Subtotal:</td>
                                                    <td className="px-4 py-3 text-right text-primary-600">ETB {selectedWorkOrder.totalLaborCost?.toLocaleString() || '0'}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {/* Total Cost Summary */}
                                <div className="mb-6 p-5 bg-blue-50 border-2 border-primary-600 rounded-xl">
                                    <div className="flex justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-700">Parts Cost:</span>
                                        <span className="text-sm font-bold text-gray-900">ETB {selectedWorkOrder.totalPartsCost?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="flex justify-between mb-3">
                                        <span className="text-sm font-semibold text-gray-700">Labor Cost:</span>
                                        <span className="text-sm font-bold text-gray-900">ETB {selectedWorkOrder.totalLaborCost?.toLocaleString() || '0'}</span>
                                    </div>
                                    <div className="flex justify-between pt-3 mt-3 border-t-2 border-primary-600">
                                        <span className="text-lg font-black text-gray-900">TOTAL COST:</span>
                                        <span className="text-2xl font-black text-primary-600">ETB {selectedWorkOrder.totalCost?.toLocaleString() || '0'}</span>
                                    </div>
                                </div>

                                {/* Progress Timeline */}
                                {selectedWorkOrder.progressNotes?.length > 0 && (
                                    <div className="mb-6">
                                        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">
                                            Progress Timeline
                                        </h3>
                                        <div className="relative pl-6">
                                            {/* Timeline line */}
                                            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-gray-300"></div>

                                            {selectedWorkOrder.progressNotes.map((note, idx) => (
                                                <div key={idx} className="relative mb-4 pb-4 border-b border-gray-100 last:border-b-0">
                                                    {/* Timeline dot */}
                                                    <div className="absolute -left-4 top-1 w-3 h-3 rounded-full bg-primary-600 border-2 border-white shadow"></div>

                                                    <div className="text-sm leading-relaxed text-gray-700 mb-1">{note.note}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {note.addedBy?.fullName || note.addedBy?.username} • {new Date(note.addedAt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="mt-8 pt-5 border-t-2 border-gray-200 text-center text-xs text-gray-500">
                                    <p className="mb-1">This is an official work order document generated by FleetPro Management System</p>
                                    <p>Generated on: {new Date().toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Print Template */}
            <WorkOrderPrintTemplate workOrder={selectedWorkOrder} />
        </div>
    );
};

export default WorkOrders;
