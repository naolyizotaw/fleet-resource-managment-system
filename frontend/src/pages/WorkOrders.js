import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { workOrdersAPI, maintenanceAPI, usersAPI, inventoryAPI } from '../services/api';
import { ClipboardList, Plus, Search, Filter, Wrench, User, Package, DollarSign, CheckCircle, Clock, XCircle } from 'lucide-react';

const WorkOrders = () => {
    const { user } = useAuth();
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
                <div className={`mb-4 p-3 rounded-md ${alert.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                    <div className="flex justify-between items-center">
                        <div>{alert.message}</div>
                        <button onClick={() => setAlert({ type: '', message: '' })} className="ml-4 text-sm underline">Dismiss</button>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 overflow-hidden px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-1 bg-primary-500 rounded-full"></div>
                    <span className="text-[9px] uppercase tracking-[0.15em] font-black text-slate-400">Work Order Management</span>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-1">Work Orders</h1>
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-slate-400 font-semibold">Live Data</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowConvertModal(true)}
                        className="group relative px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold uppercase tracking-wide rounded-lg transition-all flex items-center gap-2 border border-slate-600"
                    >
                        <Plus size={16} />
                        <span className="text-xs">Convert Maintenance</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by WO number, vehicle, description..."
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
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="on_hold">On Hold</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Work Orders Table */}
            <div className="bg-gradient-to-br from-white via-primary-50/30 to-white rounded-2xl shadow-lg border border-primary-100 overflow-hidden">
                <div className="relative bg-white px-6 py-6 border-b-4 border-primary-600">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600"></div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary-600 rounded-xl blur opacity-30"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl flex items-center justify-center shadow-lg">
                                    <ClipboardList className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Work Orders</h3>
                                <p className="text-xs text-gray-500 font-bold mt-0.5">Manage and track all work orders</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2 bg-primary-50 rounded-lg border border-primary-200">
                            <div className="w-2 h-2 bg-primary-600 rounded-full animate-pulse"></div>
                            <span className="text-sm font-black text-primary-700">{filteredWorkOrders.length} Total</span>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-primary-50/50">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">WO Number</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Vehicle</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Status</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Mechanics</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Total Cost</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-600 uppercase tracking-[0.1em] border-b-2 border-primary-200">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white/80 backdrop-blur-sm">
                            {filteredWorkOrders.map((wo) => (
                                <tr
                                    key={wo._id}
                                    ref={(el) => { if (el) rowRefs.current[wo._id] = el; }}
                                    className={`group hover:bg-primary-50 hover:shadow-sm transition-all border-b border-gray-100 ${highlightedId === wo._id ? 'bg-yellow-50 ring-2 ring-amber-400' : ''}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getStatusIcon(wo.status)}
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 cursor-pointer hover:text-blue-600" onClick={() => { setSelectedWorkOrder(wo); setShowDetailsModal(true); }}>
                                                    {wo.workOrderNumber}
                                                </div>
                                                <div className="text-xs text-gray-500">{new Date(wo.createdAt).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{wo.vehicleId?.plateNumber || '-'}</div>
                                        <div className="text-xs text-gray-500">{wo.vehicleId?.manufacturer} {wo.vehicleId?.model}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(wo.status)}`}>
                                            {wo.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">
                                            {wo.assignedMechanics?.length > 0 ? wo.assignedMechanics.map(m => m.fullName || m.username).join(', ') : 'Not assigned'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-bold text-gray-900">ETB {wo.totalCost?.toLocaleString() || '0'}</div>
                                        <div className="text-xs text-gray-500">Parts: {wo.totalPartsCost?.toLocaleString() || '0'} | Labor: {wo.totalLaborCost?.toLocaleString() || '0'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-2">
                                            {wo.status !== 'completed' && wo.status !== 'cancelled' && (
                                                <>
                                                    <button onClick={() => { setSelectedWorkOrder(wo); setShowAssignModal(true); }} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded hover:bg-blue-100" title="Assign Mechanic">
                                                        <User size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedWorkOrder(wo); setShowPartsModal(true); }} className="px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded hover:bg-purple-100" title="Add Parts">
                                                        <Package size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedWorkOrder(wo); setShowLaborModal(true); }} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100" title="Add Labor">
                                                        <DollarSign size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedWorkOrder(wo); setShowProgressModal(true); }} className="px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100" title="Update Progress">
                                                        <Wrench size={14} />
                                                    </button>
                                                    <button onClick={() => { setSelectedWorkOrder(wo); setShowCompleteModal(true); }} className="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded hover:bg-emerald-100" title="Complete">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredWorkOrders.length === 0 && (
                    <div className="text-center py-16 px-4">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-2xl mb-4">
                            <ClipboardList className="h-10 w-10 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No work orders found</h3>
                        <p className="text-sm text-gray-500 font-medium">
                            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter criteria.' : 'Convert an approved maintenance request to create a work order.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Convert Modal */}
            {showConvertModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20">
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowConvertModal(false)} />
                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-200 relative z-10">
                            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
                                <h3 className="text-xl font-black text-white uppercase">Convert to Work Order</h3>
                            </div>
                            <div className="bg-white px-6 py-6">
                                <label className="block text-xs font-black text-gray-600 uppercase mb-2">Select Approved Maintenance Request</label>
                                <select
                                    value={selectedMaintenance}
                                    onChange={(e) => setSelectedMaintenance(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold"
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
                                <button onClick={() => setShowConvertModal(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold">Cancel</button>
                                <button onClick={handleConvert} className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold">Convert</button>
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
                                            className="flex-1 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm"
                                        >
                                            <option value="">Select Part...</option>
                                            {inventoryItems.map(item => (
                                                <option key={item._id} value={item._id}>{item.name} (Stock: {item.currentStock})</option>
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
                                    <button onClick={() => setShowDetailsModal(false)} className="text-white hover:bg-white/20 rounded p-2">×</button>
                                </div>
                            </div>
                            <div className="bg-white px-6 py-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-xs font-black text-gray-600 uppercase">WO Number</div>
                                        <div className="text-lg font-bold">{selectedWorkOrder.workOrderNumber}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-black text-gray-600 uppercase">Status</div>
                                        <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(selectedWorkOrder.status)}`}>
                                            {selectedWorkOrder.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-xs font-black text-gray-600 uppercase mb-2">Description</div>
                                    <div className="text-sm">{selectedWorkOrder.description}</div>
                                </div>

                                {selectedWorkOrder.spareParts?.length > 0 && (
                                    <div>
                                        <div className="text-xs font-black text-gray-600 uppercase mb-2">Spare Parts Used</div>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="px-3 py-2 text-left">Part</th>
                                                    <th className="px-3 py-2 text-right">Qty</th>
                                                    <th className="px-3 py-2 text-right">Unit Cost</th>
                                                    <th className="px-3 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedWorkOrder.spareParts.map((part, idx) => (
                                                    <tr key={idx} className="border-b">
                                                        <td className="px-3 py-2">{part.itemName}</td>
                                                        <td className="px-3 py-2 text-right">{part.quantity}</td>
                                                        <td className="px-3 py-2 text-right">ETB {part.unitCost?.toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right font-bold">ETB {part.totalCost?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {selectedWorkOrder.laborCosts?.length > 0 && (
                                    <div>
                                        <div className="text-xs font-black text-gray-600 uppercase mb-2">Labor Costs</div>
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    <th className="px-3 py-2 text-left">Mechanic</th>
                                                    <th className="px-3 py-2 text-right">Hours</th>
                                                    <th className="px-3 py-2 text-right">Rate</th>
                                                    <th className="px-3 py-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedWorkOrder.laborCosts.map((labor, idx) => (
                                                    <tr key={idx} className="border-b">
                                                        <td className="px-3 py-2">{labor.mechanicId?.fullName || labor.mechanicId?.username}</td>
                                                        <td className="px-3 py-2 text-right">{labor.hours}</td>
                                                        <td className="px-3 py-2 text-right">ETB {labor.hourlyRate?.toLocaleString()}</td>
                                                        <td className="px-3 py-2 text-right font-bold">ETB {labor.totalCost?.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <div className="bg-primary-50 p-4 rounded-lg">
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-xs font-black text-gray-600 uppercase">Parts Cost</div>
                                            <div className="text-lg font-bold text-primary-700">ETB {selectedWorkOrder.totalPartsCost?.toLocaleString() || '0'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-gray-600 uppercase">Labor Cost</div>
                                            <div className="text-lg font-bold text-primary-700">ETB {selectedWorkOrder.totalLaborCost?.toLocaleString() || '0'}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-gray-600 uppercase">Total Cost</div>
                                            <div className="text-2xl font-black text-primary-900">ETB {selectedWorkOrder.totalCost?.toLocaleString() || '0'}</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedWorkOrder.progressNotes?.length > 0 && (
                                    <div>
                                        <div className="text-xs font-black text-gray-600 uppercase mb-2">Progress History</div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {selectedWorkOrder.progressNotes.map((note, idx) => (
                                                <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                                                    <div className="text-sm">{note.note}</div>
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {note.addedBy?.fullName || note.addedBy?.username} - {new Date(note.addedAt).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrders;
