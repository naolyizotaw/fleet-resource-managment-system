import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sparePartsAPI, inventoryAPI, vehiclesAPI } from '../services/api';
import {
    Package, Plus, Search, Filter, CheckCircle, XCircle, Clock,
    Truck, AlertCircle, X, Check, BarChart3, Printer
} from 'lucide-react';

const SpareParts = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState([]);
    const [items, setItems] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [activeTab, setActiveTab] = useState('my_requests'); // 'my_requests' or 'all_requests'
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [alert, setAlert] = useState({ type: '', message: '' });

    // Form State
    const [formData, setFormData] = useState({
        itemId: '',
        vehicleId: '',
        quantity: 1,
        reason: '',
    });

    const [processingId, setProcessingId] = useState(null);
    const [actionComment, setActionComment] = useState('');
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approved' or 'rejected'
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [printRequest, setPrintRequest] = useState(null);

    // Helper function to format price with commas
    const formatPrice = (price) => {
        return parseFloat(price || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    };

    const canManage = () => ['admin', 'manager'].includes(user?.role);

    useEffect(() => {
        fetchData();
        fetchFormOptions();
        // Default tab logic
        if (canManage()) {
            setActiveTab('all_requests');
        } else {
            setActiveTab('my_requests');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchFormOptions = async () => {
        try {
            const [itemsRes, vehiclesRes] = await Promise.all([
                inventoryAPI.getAll(),
                vehiclesAPI.getAll()
            ]);
            setItems(itemsRes.data.filter(i => i.currentStock > 0)); // Only show items in stock
            setVehicles(vehiclesRes.data);
        } catch (error) {
            console.error("Error fetching options:", error);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            let res;
            if (activeTab === 'all_requests' && canManage()) {
                res = await sparePartsAPI.getAll();
            } else {
                res = await sparePartsAPI.getMyRequests();
            }
            setRequests(res.data);
        } catch (error) {
            console.error("Error fetching requests:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await sparePartsAPI.create(formData);
            setAlert({ type: 'success', message: 'Request submitted successfully' });
            setShowModal(false);
            setFormData({ itemId: '', vehicleId: '', quantity: 1, reason: '' });
            fetchData();
        } catch (error) {
            setAlert({ type: 'error', message: error.response?.data?.message || 'Error submitting request' });
        }
    };

    const handleAction = async () => {
        if (!selectedRequest || !actionType) return;

        try {
            setProcessingId(selectedRequest._id);
            await sparePartsAPI.updateStatus(selectedRequest._id, {
                status: actionType,
                adminComment: actionComment
            });
            setAlert({ type: 'success', message: `Request ${actionType} successfully` });
            setShowActionModal(false);
            fetchData();
        } catch (error) {
            setAlert({ type: 'error', message: error.response?.data?.message || 'Error updating status' });
        } finally {
            setProcessingId(null);
            setSelectedRequest(null);
            setActionComment('');
        }
    };

    const openActionModal = (request, type) => {
        setSelectedRequest(request);
        setActionType(type);
        setShowActionModal(true);
    };

    const handlePrint = (request) => {
        setPrintRequest(request);
        setShowPrintModal(true);
    };

    const printInvoice = () => {
        window.print();
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this requests?")) return;
        try {
            await sparePartsAPI.delete(id);
            setAlert({ type: 'success', message: 'Request deleted successfully' });
            fetchData();
        } catch (error) {
            setAlert({ type: 'error', message: error.response?.data?.message || 'Error deleting request' });
        }
    }

    // Filtering
    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            req.itemId?.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.vehicleId?.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.requesterId?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.requesterId?.fullName?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || req.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-yellow-100 text-yellow-800';
        }
    };

    const getStats = () => {
        const total = requests.length;
        const pending = requests.filter(r => r.status === 'pending').length;
        const approved = requests.filter(r => r.status === 'approved').length;
        const rejected = requests.filter(r => r.status === 'rejected').length;
        return { total, pending, approved, rejected };
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
            <div className="relative bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 rounded-2xl shadow-2xl overflow-hidden">
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
                                    <Package className="h-8 w-8 text-white" />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="h-px w-10 bg-white/40"></div>
                                    <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/70">Spare Parts</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-1">
                                    Request Dashboard
                                </h1>
                                <p className="text-white/80 font-semibold text-sm">Manage inventory requests from drivers and mechanics</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowModal(true)}
                                className="group relative px-6 py-3 bg-white text-green-600 font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <Plus className="h-5 w-5 relative z-10" />
                                <span className="text-sm relative z-10">New Request</span>
                            </button>

                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                                <Package className="h-4 w-4 text-white" />
                                <span className="text-sm font-bold text-white">{filteredRequests.length} Requests</span>
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

                <div className="bg-white rounded-xl shadow-md border-2 border-yellow-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Pending</p>
                            <p className="text-3xl font-black text-gray-900">{stats.pending}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Clock className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-2 border-green-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Approved</p>
                            <p className="text-3xl font-black text-gray-900">{stats.approved}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                            <CheckCircle className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-md border-2 border-red-100 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Rejected</p>
                            <p className="text-3xl font-black text-gray-900">{stats.rejected}</p>
                        </div>
                        <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                            <XCircle className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {canManage() && (
                        <div className="flex bg-gray-100 p-1 rounded-xl w-fit h-fit self-center">
                            <button
                                onClick={() => setActiveTab('all_requests')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'all_requests' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                All Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('my_requests')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'my_requests' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                My Requests
                            </button>
                        </div>
                    )}

                    <div className="flex-1">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search requests..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
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
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all appearance-none cursor-pointer"
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
            <div className="bg-white rounded-2xl shadow-xl border-2 border-green-100 overflow-hidden">
                <div className="relative bg-gradient-to-r from-white via-green-50 to-white px-6 py-6 border-b-4 border-green-500">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600"></div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur opacity-30"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Truck className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Spare Part Requests</h3>
                                <p className="text-xs text-green-600 font-bold mt-0.5">Track and manage approvals</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-gradient-to-r from-gray-50 to-green-50 border-b-2 border-green-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Item Code</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Item Name</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Vehicle Model</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Plate Number</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Requested By</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Date Requested</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">Unit Price</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-700 uppercase tracking-wider">Total Price</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Approved By</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Date Approved</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="px-6 py-12 text-center">
                                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-semibold">No requests found</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req._id} className="hover:bg-green-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.itemId?.itemCode}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.itemId?.itemName}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.vehicleId?.make} {req.vehicleId?.model}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.vehicleId?.plateNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.requesterId?.fullName || req.requesterId?.username || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500">{req.requesterId?.role}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{new Date(req.createdAt).toLocaleDateString()}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900">{req.quantity} {req.itemId?.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-bold text-gray-900">ETB {formatPrice(req.itemId?.unitPrice)}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-black text-green-600">ETB {formatPrice((req.itemId?.unitPrice || 0) * req.quantity)}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700">{req.reason}</div>
                                            {req.adminComment && (
                                                <div className="text-xs text-red-600 mt-1 font-semibold">
                                                    Note: {req.adminComment}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusColor(req.status)}`}>
                                                {req.status?.charAt(0).toUpperCase() + req.status?.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.approvedBy?.fullName || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{req.approvedAt ? new Date(req.approvedAt).toLocaleDateString() : '-'}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                {/* Admin Actions */}
                                                {canManage() && req.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => openActionModal(req, 'approved')}
                                                            className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-100 rounded-lg"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => openActionModal(req, 'rejected')}
                                                            className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-100 rounded-lg"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="h-5 w-5" />
                                                        </button>
                                                    </>
                                                )}

                                                {/* Print Invoice for Approved Requests */}
                                                {req.status === 'approved' && (
                                                    <button
                                                        onClick={() => handlePrint(req)}
                                                        className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-100 rounded-lg"
                                                        title="Print Invoice"
                                                    >
                                                        <Printer className="h-5 w-5" />
                                                    </button>
                                                )}

                                                {/* Delete Action (Owner or Admin) */}
                                                {req.status === 'pending' && (canManage() || req.requesterId?._id === user?.id || req.requesterId === user?.id) && (
                                                    <button
                                                        onClick={() => handleDelete(req._id)}
                                                        className="text-gray-400 hover:text-red-600 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                                        title="Delete"
                                                    >
                                                        <X className="h-5 w-5" />
                                                    </button>
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

            {/* New Request Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">New Request</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Vehicle
                                </label>
                                <select
                                    required
                                    value={formData.vehicleId}
                                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                >
                                    <option value="">Select Vehicle</option>
                                    {vehicles.map(v => (
                                        <option key={v._id} value={v._id}>
                                            {v.plateNumber} - {v.make} {v.model}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Spare Part (In Stock)
                                </label>
                                <select
                                    required
                                    value={formData.itemId}
                                    onChange={(e) => setFormData({ ...formData, itemId: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                >
                                    <option value="">Select Part</option>
                                    {items.map(item => (
                                        <option key={item._id} value={item._id}>
                                            {item.itemName} (Stock: {item.currentStock} {item.unit})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Quantity
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Reason
                                </label>
                                <textarea
                                    required
                                    rows="3"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    placeholder="Why is this part needed?"
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {showActionModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className={`px-6 py-4 rounded-t-2xl flex items-center justify-between ${actionType === 'approved' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-red-700'}`}>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{actionType === 'approved' ? 'Approve' : 'Reject'} Request</h2>
                            <button
                                onClick={() => setShowActionModal(false)}
                                disabled={!!processingId}
                                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to {actionType} the request for
                                <span className="font-bold text-gray-900"> {selectedRequest?.itemId?.itemName}</span>?
                                {actionType === 'approved' && (
                                    <span className="block text-sm text-green-600 mt-2 font-bold">
                                        Note: This will deduct {selectedRequest?.quantity} from current stock.
                                    </span>
                                )}
                            </p>

                            <div className="mb-4">
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">
                                    Admin Comment (Optional)
                                </label>
                                <textarea
                                    rows="2"
                                    value={actionComment}
                                    onChange={(e) => setActionComment(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    placeholder="Add a note..."
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowActionModal(false)}
                                    disabled={!!processingId}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAction}
                                    disabled={!!processingId}
                                    className={`px-6 py-3 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all ${actionType === 'approved' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : 'bg-gradient-to-r from-red-600 to-red-700'
                                        }`}
                                >
                                    {processingId ? 'Processing...' : `Confirm ${actionType === 'approved' ? 'Approval' : 'Rejection'}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Printable Invoice Modal */}
            {showPrintModal && printRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            .print-content, .print-content * {
                                visibility: visible;
                            }
                            .print-content {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            .no-print {
                                display: none !important;
                            }
                            .print-page {
                                page-break-after: always;
                            }
                        }
                    `}</style>

                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header - Hidden when printing */}
                        <div className="no-print sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Spare Parts Request Invoice</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={printInvoice}
                                    className="px-4 py-2 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                                <button
                                    onClick={() => setShowPrintModal(false)}
                                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        {/* Printable Content */}
                        <div className="print-content p-12">
                            {/* Company Header */}
                            <div className="border-b-4 border-gray-800 pb-8 mb-8">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h1 className="text-3xl font-bold text-gray-900 mb-1" style={{ letterSpacing: '0.5px' }}>FLEET MANAGEMENT SYSTEM</h1>
                                        <p className="text-gray-600 font-medium text-sm">Transportation & Logistics Division</p>
                                        <p className="text-gray-500 text-xs mt-1">Addis Ababa, Ethiopia</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="bg-gray-900 text-white px-6 py-3 inline-block">
                                            <p className="text-xs font-semibold uppercase tracking-wide mb-1">Document Status</p>
                                            <p className="text-xl font-bold">APPROVED</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Document Title */}
                            <div className="mb-8 text-center border-b border-gray-300 pb-4">
                                <h2 className="text-2xl font-bold text-gray-900 uppercase" style={{ letterSpacing: '1px' }}>Spare Parts Request Confirmation</h2>
                                <p className="text-sm text-gray-600 mt-1">Official Authorization Document</p>
                            </div>

                            {/* Invoice Details */}
                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div className="border border-gray-300 p-5">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-300">Request Information</h3>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Request ID:</span>
                                            <span className="text-sm font-bold text-gray-900">{printRequest._id?.slice(-8).toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Request Date:</span>
                                            <span className="text-sm font-bold text-gray-900">{new Date(printRequest.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Approval Date:</span>
                                            <span className="text-sm font-bold text-gray-900">{printRequest.approvedAt ? new Date(printRequest.approvedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-300 p-5">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4 pb-2 border-b border-gray-300">Personnel Details</h3>
                                    <div className="space-y-2.5">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Requested By:</span>
                                            <span className="text-sm font-bold text-gray-900">{printRequest.requesterId?.fullName || printRequest.requesterId?.username || 'Unknown'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Role:</span>
                                            <span className="text-sm font-bold text-gray-900 uppercase">{printRequest.requesterId?.role || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-600">Approved By:</span>
                                            <span className="text-sm font-bold text-gray-900">{printRequest.approvedBy?.fullName || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Information */}
                            <div className="bg-gray-50 border border-gray-300 p-6 mb-8">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Truck className="h-4 w-4" />
                                    Vehicle Information
                                </h3>
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-xs text-gray-600 uppercase mb-1">Plate Number</p>
                                        <p className="text-base font-bold text-gray-900">{printRequest.vehicleId?.plateNumber || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 uppercase mb-1">Make & Model</p>
                                        <p className="text-base font-bold text-gray-900">{printRequest.vehicleId?.make} {printRequest.vehicleId?.model}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 uppercase mb-1">Year</p>
                                        <p className="text-base font-bold text-gray-900">{printRequest.vehicleId?.year || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Parts Details Table */}
                            <div className="mb-8">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Spare Parts Details
                                </h3>
                                <table className="w-full border border-gray-400">
                                    <thead className="bg-gray-800 text-white">
                                        <tr>
                                            <th className="border border-gray-400 px-4 py-3 text-left text-xs font-bold uppercase">Item Code</th>
                                            <th className="border border-gray-400 px-4 py-3 text-left text-xs font-bold uppercase">Item Name</th>
                                            <th className="border border-gray-400 px-4 py-3 text-left text-xs font-bold uppercase">Category</th>
                                            <th className="border border-gray-400 px-4 py-3 text-center text-xs font-bold uppercase">Quantity</th>
                                            <th className="border border-gray-400 px-4 py-3 text-left text-xs font-bold uppercase">Unit</th>
                                            <th className="border border-gray-400 px-4 py-3 text-right text-xs font-bold uppercase">Unit Price</th>
                                            <th className="border border-gray-400 px-4 py-3 text-right text-xs font-bold uppercase">Total Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="bg-white">
                                            <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">{printRequest.itemId?.itemCode || 'N/A'}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">{printRequest.itemId?.itemName || 'N/A'}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">{printRequest.itemId?.category || 'N/A'}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-center text-base font-bold text-gray-900">{printRequest.quantity}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-900">{printRequest.itemId?.unit || 'N/A'}</td>
                                            <td className="border border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-900">
                                                ETB {formatPrice(printRequest.itemId?.unitPrice)}
                                            </td>
                                            <td className="border border-gray-300 px-4 py-3 text-right text-base font-bold text-gray-900">
                                                ETB {formatPrice((printRequest.itemId?.unitPrice || 0) * printRequest.quantity)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                {/* Total Summary */}
                                <div className="mt-6 flex justify-end">
                                    <div className="border-2 border-gray-800 bg-gray-50 p-6 min-w-[350px]">
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center pb-3 border-b-2 border-gray-300">
                                                <span className="text-sm font-semibold text-gray-700 uppercase">Subtotal:</span>
                                                <span className="text-lg font-bold text-gray-900">ETB {formatPrice((printRequest.itemId?.unitPrice || 0) * printRequest.quantity)}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-3 border-t-2 border-gray-900">
                                                <span className="text-base font-bold text-gray-900 uppercase">Grand Total:</span>
                                                <span className="text-2xl font-bold text-gray-900">ETB {formatPrice((printRequest.itemId?.unitPrice || 0) * printRequest.quantity)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Request Reason */}
                            <div className="bg-gray-50 border border-gray-300 p-6 mb-8">
                                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Request Reason</h3>
                                <p className="text-sm text-gray-800 leading-relaxed">{printRequest.reason}</p>
                            </div>

                            {/* Admin Comment if exists */}
                            {printRequest.adminComment && (
                                <div className="bg-gray-50 border border-gray-300 p-6 mb-8">
                                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Administrator Notes</h3>
                                    <p className="text-sm text-gray-800 leading-relaxed">{printRequest.adminComment}</p>
                                </div>
                            )}

                            {/* Signatures Section */}
                            <div className="grid grid-cols-2 gap-12 mt-12 pt-8 border-t border-gray-300">
                                <div>
                                    <div className="border-b border-gray-400 pb-1 mb-2 h-16"></div>
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Requester Signature</p>
                                    <p className="text-xs text-gray-500 mt-1">{printRequest.requesterId?.fullName || printRequest.requesterId?.username}</p>
                                    <p className="text-xs text-gray-500">Date: {new Date(printRequest.createdAt).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <div className="border-b border-gray-400 pb-1 mb-2 h-16"></div>
                                    <p className="text-sm font-bold text-gray-700 uppercase tracking-wide">Approver Signature</p>
                                    <p className="text-xs text-gray-500 mt-1">{printRequest.approvedBy?.fullName || 'N/A'}</p>
                                    <p className="text-xs text-gray-500">Date: {printRequest.approvedAt ? new Date(printRequest.approvedAt).toLocaleDateString() : 'N/A'}</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="mt-12 pt-6 border-t border-gray-200 text-center">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fleet Resource Management System • Official Document</p>
                                <p className="text-[10px] text-gray-400 mt-1">Generated on {new Date().toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpareParts;
