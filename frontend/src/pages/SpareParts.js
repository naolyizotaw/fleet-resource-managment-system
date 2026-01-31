import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sparePartsAPI, inventoryAPI, vehiclesAPI } from '../services/api';
import {
    Package, Plus, Search, Filter, CheckCircle, XCircle, Clock,
    Truck, AlertCircle, X, Check, BarChart3
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
                             {alert.type === 'success' ? <CheckCircle className="w-5 h-5"/> : <AlertCircle className="w-5 h-5"/>}
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
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === 'all_requests' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                All Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('my_requests')}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                                    activeTab === 'my_requests' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500 hover:text-gray-700'
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
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Reason</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center">
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
                                            <span className="text-sm font-bold text-gray-900">{req.quantity} {req.itemId?.unit}</span>
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
        </div>
    );
};

export default SpareParts;
