import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { inventoryAPI, vehiclesAPI } from '../services/api';
import {
    Package, Plus, Trash2, Edit, Search, Filter, TrendingDown,
    AlertTriangle, DollarSign, BarChart3, History, X, ArrowUpCircle,
    ArrowDownCircle, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

const Inventory = () => {
    const { user } = useAuth();
    const [items, setItems] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [showAdjustModal, setShowAdjustModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [adjustingItem, setAdjustingItem] = useState(null);
    const [historyItem, setHistoryItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [stockHistory, setStockHistory] = useState([]);
    const [alert, setAlert] = useState({ type: '', message: '' });

    const categories = [
        'Spare Parts',
        'Lubricants',
        'Consumables',
        'Tires',
        'Batteries',
        'Filters',
        'Other'
    ];

    const units = [
        'pieces',
        'liters',
        'kg',
        'meters',
        'packs',
        'boxes',
        'sets',
        'pairs',
        'rolls',
        'gallons',
        'drums',
        'cans'
    ];

    const initialFormData = {
        itemName: '',
        itemCode: '',
        category: 'Spare Parts',
        description: '',
        unit: 'pieces',
        currentStock: 0,
        minimumStock: 10,
        maximumStock: '',
        unitPrice: 0,
        supplier: '',
        location: 'Main Warehouse',
    };

    const [formData, setFormData] = useState(initialFormData);

    const initialAdjustData = {
        type: 'addition',
        quantity: 0,
        reason: '',
        vehicleId: '',
    };

    const [adjustData, setAdjustData] = useState(initialAdjustData);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [itemsRes, statsRes] = await Promise.all([
                inventoryAPI.getAll(),
                canManage() ? inventoryAPI.getStats() : Promise.resolve({ data: null }),
            ]);
            setItems(itemsRes.data);
            setStats(statsRes.data);

            // Fetch vehicles for stock adjustment
            if (canManage()) {
                const vehiclesRes = await vehiclesAPI.getAll();
                setVehicles(vehiclesRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            showAlert('error', 'Failed to fetch inventory data');
        } finally {
            setLoading(false);
        }
    };

    const canManage = () => {
        return user?.role === 'admin' || user?.role === 'manager';
    };

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert({ type: '', message: '' }), 5000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                currentStock: Number(formData.currentStock) || 0,
                minimumStock: Number(formData.minimumStock) || 10,
                maximumStock: formData.maximumStock ? Number(formData.maximumStock) : undefined,
                unitPrice: Number(formData.unitPrice) || 0,
            };

            if (editingItem) {
                const updatePayload = { ...payload };
                delete updatePayload.currentStock;
                await inventoryAPI.update(editingItem._id, updatePayload);
                showAlert('success', 'Item updated successfully');
            } else {
                await inventoryAPI.create(payload);
                showAlert('success', 'Item created successfully');
            }

            fetchData();
            setShowModal(false);
            setFormData(initialFormData);
            setEditingItem(null);
        } catch (error) {
            console.error('Error saving item:', error);
            showAlert('error', error.response?.data?.message || 'Failed to save item');
        }
    };

    const handleAdjustStock = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                type: adjustData.type,
                quantity: Number(adjustData.quantity),
                reason: adjustData.reason,
                vehicleId: adjustData.vehicleId || undefined,
            };

            await inventoryAPI.adjustStock(adjustingItem._id, payload);
            showAlert('success', 'Stock adjusted successfully');
            fetchData();
            setShowAdjustModal(false);
            setAdjustData(initialAdjustData);
            setAdjustingItem(null);
        } catch (error) {
            console.error('Error adjusting stock:', error);
            showAlert('error', error.response?.data?.message || 'Failed to adjust stock');
        }
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        try {
            await inventoryAPI.delete(itemToDelete._id);
            showAlert('success', 'Item deleted successfully');
            fetchData();
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (error) {
            console.error('Error deleting item:', error);
            showAlert('error', error.response?.data?.message || 'Failed to delete item');
        }
    };

    const openAddModal = () => {
        setEditingItem(null);
        setFormData(initialFormData);
        setShowModal(true);
    };

    const openEditModal = (item) => {
        setEditingItem(item);
        setFormData({
            itemName: item.itemName || '',
            itemCode: item.itemCode || '',
            category: item.category || 'Spare Parts',
            description: item.description || '',
            unit: item.unit || 'pieces',
            currentStock: item.currentStock || 0,
            minimumStock: item.minimumStock || 10,
            maximumStock: item.maximumStock || '',
            unitPrice: item.unitPrice || 0,
            supplier: item.supplier || '',
            location: item.location || 'Main Warehouse',
        });
        setShowModal(true);
    };

    const openAdjustModal = (item) => {
        setAdjustingItem(item);
        setAdjustData(initialAdjustData);
        setShowAdjustModal(true);
    };

    const openHistoryModal = async (item) => {
        setHistoryItem(item);
        setShowHistoryModal(true);
        try {
            const res = await inventoryAPI.getHistory(item._id);
            setStockHistory(res.data.history || []);
        } catch (error) {
            console.error('Error fetching history:', error);
            setStockHistory([]);
        }
    };

    const confirmDelete = (item) => {
        setItemToDelete(item);
        setShowDeleteModal(true);
    };

    const getStockStatusColor = (stockStatus) => {
        switch (stockStatus) {
            case 'out_of_stock': return 'bg-red-100 text-red-800';
            case 'low_stock': return 'bg-yellow-100 text-yellow-800';
            case 'adequate': return 'bg-green-100 text-green-800';
            case 'overstocked': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusBadgeColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'discontinued': return 'bg-gray-100 text-gray-800';
            case 'out_of_stock': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const exportToExcel = () => {
        try {
            const exportData = filteredItems.map(item => ({
                'Item Code': item.itemCode,
                'Item Name': item.itemName,
                'Category': item.category,
                'Current Stock': item.currentStock,
                'Unit': item.unit,
                'Minimum Stock': item.minimumStock,
                'Maximum Stock': item.maximumStock || '',
                'Unit Price': item.unitPrice,
                'Stock Value': item.stockValue || 0,
                'Stock Status': item.stockStatus,
                'Status': item.status,
                'Supplier': item.supplier || '',
                'Location': item.location || '',
                'Description': item.description || '',
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

            // Add stats sheet if available
            if (stats) {
                const statsData = [
                    { Metric: 'Total Items', Value: stats.totalItems },
                    { Metric: 'Total Stock Value', Value: stats.totalStockValue },
                    { Metric: 'Low Stock Items', Value: stats.lowStockCount },
                    { Metric: 'Out of Stock Items', Value: stats.outOfStockCount },
                ];
                const statsWs = XLSX.utils.json_to_sheet(statsData);
                XLSX.utils.book_append_sheet(wb, statsWs, 'Statistics');
            }

            XLSX.writeFile(wb, `inventory_${new Date().toISOString().split('T')[0]}.xlsx`);
            showAlert('success', 'Inventory exported successfully');
        } catch (error) {
            console.error('Export error:', error);
            showAlert('error', 'Failed to export inventory');
        }
    };

    const filteredItems = items.filter(item => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            item.itemName?.toLowerCase().includes(searchLower) ||
            item.itemCode?.toLowerCase().includes(searchLower) ||
            item.category?.toLowerCase().includes(searchLower) ||
            item.description?.toLowerCase().includes(searchLower);
        const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
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
                                    <span className="text-[10px] uppercase tracking-[0.15em] font-black text-white/70">Inventory Management</span>
                                </div>
                                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight mb-1">
                                    Inventory Dashboard
                                </h1>
                                <p className="text-white/80 font-semibold text-sm">Manage vehicle parts and consumables</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {canManage() && (
                                <button
                                    onClick={openAddModal}
                                    className="group relative px-6 py-3 bg-white text-green-600 font-black uppercase tracking-wide rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <Plus className="h-5 w-5 relative z-10" />
                                    <span className="text-sm relative z-10">Add Item</span>
                                </button>
                            )}

                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                                <Package className="h-4 w-4 text-white" />
                                <span className="text-sm font-bold text-white">{filteredItems.length} Items</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            {canManage() && stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white rounded-xl shadow-md border-2 border-blue-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Total Items</p>
                                <p className="text-3xl font-black text-gray-900">{stats.totalItems}</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Package className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border-2 border-green-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Stock Value</p>
                                <p className="text-3xl font-black text-gray-900">{stats.totalStockValue.toLocaleString()} ETB</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                <DollarSign className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border-2 border-yellow-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Low Stock</p>
                                <p className="text-3xl font-black text-gray-900">{stats.lowStockCount}</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                                <TrendingDown className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-md border-2 border-red-100 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-black text-gray-600 uppercase tracking-wider mb-1">Out of Stock</p>
                                <p className="text-3xl font-black text-gray-900">{stats.outOfStockCount}</p>
                            </div>
                            <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                                <AlertTriangle className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Search Items</label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, code, category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                    <div className="md:w-56">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Category</label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="md:w-56">
                        <label className="block text-xs font-black text-gray-600 uppercase tracking-wider mb-2">Status</label>
                        <div className="relative">
                            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-primary-500 focus:bg-white transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Status</option>
                                <option value="active">Active</option>
                                <option value="out_of_stock">Out of Stock</option>
                                <option value="discontinued">Discontinued</option>
                            </select>
                        </div>
                    </div>
                    {canManage() && (
                        <div className="flex items-end">
                            <button
                                onClick={exportToExcel}
                                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                            >
                                <BarChart3 className="h-5 w-5" />
                                <span className="text-sm">Export</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Inventory Table */}
            <div className="bg-white rounded-2xl shadow-xl border-2 border-green-100 overflow-hidden">
                <div className="relative bg-gradient-to-r from-white via-green-50 to-white px-6 py-6 border-b-4 border-green-500">
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600"></div>
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl blur opacity-30"></div>
                                <div className="relative w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                                    <Package className="h-6 w-6 text-white" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Inventory Items</h3>
                                <p className="text-xs text-green-600 font-bold mt-0.5">Stock management and tracking</p>
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
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Stock</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Unit</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Price</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Value</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-700 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-6 py-12 text-center">
                                        <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 font-semibold">No inventory items found</p>
                                        <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredItems.map((item) => (
                                    <tr key={item._id} className="hover:bg-green-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-bold text-gray-900">{item.itemCode}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{item.itemName}</div>
                                            {item.description && (
                                                <div className="text-xs text-gray-500 mt-1">{item.description.substring(0, 50)}{item.description.length > 50 ? '...' : ''}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-blue-100 text-blue-800">
                                                {item.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-sm font-bold text-gray-900">{item.currentStock.toLocaleString()}</span>
                                                <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-bold rounded-full ${getStockStatusColor(item.stockStatus)}`}>
                                                    {item.stockStatus?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                                            {item.unit}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                            {item.unitPrice?.toLocaleString() || 0} ETB
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                                            {item.stockValue?.toLocaleString() || 0} ETB
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${getStatusBadgeColor(item.status)}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openHistoryModal(item)}
                                                    className="text-blue-600 hover:text-blue-900 transition-colors p-2 hover:bg-blue-50 rounded-lg"
                                                    title="View History"
                                                >
                                                    <History className="h-4 w-4" />
                                                </button>
                                                {canManage() && (
                                                    <>
                                                        <button
                                                            onClick={() => openAdjustModal(item)}
                                                            className="text-purple-600 hover:text-purple-900 transition-colors p-2 hover:bg-purple-50 rounded-lg"
                                                            title="Adjust Stock"
                                                        >
                                                            <RefreshCw className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => openEditModal(item)}
                                                            className="text-green-600 hover:text-green-900 transition-colors p-2 hover:bg-green-50 rounded-lg"
                                                            title="Edit"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </button>
                                                        {user?.role === 'admin' && (
                                                            <button
                                                                onClick={() => confirmDelete(item)}
                                                                className="text-red-600 hover:text-red-900 transition-colors p-2 hover:bg-red-50 rounded-lg"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
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

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex items-center justify-between border-b-4 border-green-700">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">
                                {editingItem ? 'Edit Item' : 'Add New Item'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Item Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.itemName}
                                        onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Item Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.itemCode}
                                        onChange={(e) => setFormData({ ...formData, itemCode: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Category *</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Unit *</label>
                                    <select
                                        required
                                        value={formData.unit}
                                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all appearance-none cursor-pointer"
                                    >
                                        {units.map(unit => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Current Stock *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.currentStock}
                                        onChange={(e) => setFormData({ ...formData, currentStock: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Minimum Stock *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.minimumStock}
                                        onChange={(e) => setFormData({ ...formData, minimumStock: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Maximum Stock</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.maximumStock}
                                        onChange={(e) => setFormData({ ...formData, maximumStock: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Unit Price *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.unitPrice}
                                        onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Supplier</label>
                                    <input
                                        type="text"
                                        value={formData.supplier}
                                        onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Storage Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black uppercase tracking-wide py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    {editingItem ? 'Update Item' : 'Create Item'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {showAdjustModal && adjustingItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Adjust Stock</h2>
                            <button onClick={() => setShowAdjustModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleAdjustStock} className="p-6 space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                                <p className="text-sm font-bold text-gray-700">Item: <span className="text-gray-900">{adjustingItem.itemName}</span></p>
                                <p className="text-sm font-bold text-gray-700 mt-1">Current Stock: <span className="text-green-600">{adjustingItem.currentStock} {adjustingItem.unit}</span></p>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Adjustment Type *</label>
                                <select
                                    required
                                    value={adjustData.type}
                                    onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                                >
                                    <option value="addition">Addition (Purchase/Restock)</option>
                                    <option value="usage">Usage (Consumed)</option>
                                    <option value="damage">Damage/Loss</option>
                                    <option value="return">Return</option>
                                    <option value="adjustment">Manual Adjustment</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Quantity *</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    value={adjustData.quantity}
                                    onChange={(e) => setAdjustData({ ...adjustData, quantity: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Reason</label>
                                <textarea
                                    value={adjustData.reason}
                                    onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                                    rows="3"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                                    placeholder="Optional reason for adjustment"
                                />
                            </div>

                            {(adjustData.type === 'usage' || adjustData.type === 'damage') && (
                                <div>
                                    <label className="block text-xs font-black text-gray-700 uppercase tracking-wider mb-2">Vehicle (Optional)</label>
                                    <select
                                        value={adjustData.vehicleId}
                                        onChange={(e) => setAdjustData({ ...adjustData, vehicleId: e.target.value })}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
                                    >
                                        <option value="">-- Select Vehicle --</option>
                                        {vehicles.map(v => (
                                            <option key={v._id} value={v._id}>{v.plateNumber} - {v.model}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black uppercase tracking-wide py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                                >
                                    {adjustData.type === 'addition' || adjustData.type === 'return' ? (
                                        <ArrowUpCircle className="h-5 w-5" />
                                    ) : (
                                        <ArrowDownCircle className="h-5 w-5" />
                                    )}
                                    Adjust Stock
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAdjustModal(false)}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && historyItem && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between border-b-4 border-blue-700">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Stock History</h2>
                            <button onClick={() => setShowHistoryModal(false)} className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200 mb-6">
                                <h3 className="text-lg font-black text-gray-900 mb-2">{historyItem.itemName}</h3>
                                <p className="text-sm text-gray-600">Code: <span className="font-bold">{historyItem.itemCode}</span></p>
                                <p className="text-sm text-gray-600">Current Stock: <span className="font-bold text-green-600">{historyItem.currentStock} {historyItem.unit}</span></p>
                            </div>

                            {stockHistory.length === 0 ? (
                                <div className="text-center py-12">
                                    <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-semibold">No stock history available</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {stockHistory.map((entry, index) => (
                                        <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-3 py-1 text-xs font-bold rounded-full ${entry.type === 'addition' || entry.type === 'return' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {entry.type}
                                                        </span>
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {entry.type === 'addition' || entry.type === 'return' ? '+' : '-'}{entry.quantity} {historyItem.unit}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-700">
                                                        <span className="font-semibold">Stock:</span> {entry.previousStock} → {entry.newStock}
                                                    </p>
                                                    {entry.reason && (
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            <span className="font-semibold">Reason:</span> {entry.reason}
                                                        </p>
                                                    )}
                                                    {entry.vehicleId && (
                                                        <p className="text-sm text-blue-600 mt-1">
                                                            <span className="font-semibold">Vehicle:</span> {entry.vehicleId.plateNumber} - {entry.vehicleId.model}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-2">
                                                        By: {entry.performedBy?.fullName || 'Unknown'} • {new Date(entry.date).toLocaleString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && itemToDelete && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
                        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 rounded-t-2xl">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Confirm Delete</h2>
                        </div>

                        <div className="p-6">
                            <p className="text-gray-700 font-semibold mb-4">
                                Are you sure you want to delete <span className="font-black text-gray-900">"{itemToDelete.itemName}"</span>?
                            </p>
                            <p className="text-sm text-gray-600 mb-6">This action cannot be undone.</p>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white font-black uppercase tracking-wide py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    Delete
                                </button>
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inventory;
