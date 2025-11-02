import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Truck, 
  Wrench, 
  Fuel, 
  Receipt, 
  FileText, 
  Users, 
  TrendingUp,
  
} from 'lucide-react';
import { maintenanceAPI, fuelAPI, perDiemAPI, logsAPI, vehiclesAPI, usersAPI } from '../services/api';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalUsers: 0,
    pendingMaintenance: 0,
    pendingFuel: 0,
    pendingPerDiem: 0,
    totalLogs: 0,
  });
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = React.useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch data based on user role
      if (user.role === 'admin' || user.role === 'manager') {
        const [maintenanceRes, fuelRes, perDiemRes, vehiclesRes, usersRes] = await Promise.all([
          maintenanceAPI.getAll(),
          fuelAPI.getAll(),
          perDiemAPI.getAll(),
          vehiclesAPI.getAll(),
          user.role === 'admin' ? usersAPI.getAll() : Promise.resolve({ data: [] }),
        ]);

        setStats({
          totalVehicles: vehiclesRes.data.length,
          totalUsers: user.role === 'admin' ? usersRes.data.length : 0,
          pendingMaintenance: maintenanceRes.data.filter(req => req.status === 'pending').length,
          pendingFuel: fuelRes.data.filter(req => req.status === 'pending').length,
          pendingPerDiem: perDiemRes.data.filter(req => req.status === 'pending').length,
          totalLogs: 0, // Will be fetched separately if needed
        });

        // Combine recent requests
        const allRequests = [
          ...maintenanceRes.data.map(req => ({ ...req, type: 'maintenance' })),
          ...fuelRes.data.map(req => ({ ...req, type: 'fuel' })),
          ...perDiemRes.data.map(req => ({ ...req, type: 'perdiem' })),
        ];
        
        setRecentRequests(allRequests
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
        );
      } else {
        // Driver dashboard - fetch only their data
        const [maintenanceRes, fuelRes, perDiemRes, logsRes] = await Promise.all([
          maintenanceAPI.getMyRequests(),
          fuelAPI.getMyRequests(),
          perDiemAPI.getMyRequests(),
          logsAPI.getMyLogs(),
        ]);

        setStats({
          totalVehicles: 0,
          totalUsers: 0,
          pendingMaintenance: maintenanceRes.data.filter(req => req.status === 'pending').length,
          pendingFuel: fuelRes.data.filter(req => req.status === 'pending').length,
          pendingPerDiem: perDiemRes.data.filter(req => req.status === 'pending').length,
          totalLogs: logsRes.data.length,
        });

        const allRequests = [
          ...maintenanceRes.data.map(req => ({ ...req, type: 'maintenance' })),
          ...fuelRes.data.map(req => ({ ...req, type: 'fuel' })),
          ...perDiemRes.data.map(req => ({ ...req, type: 'perdiem' })),
        ];
        
        setRecentRequests(allRequests
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
        );
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // status icon inline not used in the redesigned recent list

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getRequestTypeLabel = (type) => {
    switch (type) {
      case 'maintenance':
        return 'Maintenance';
      case 'fuel':
        return 'Fuel';
      case 'perdiem':
        return 'Per Diem';
      default:
        return 'Request';
    }
  };

  const typeIcon = (type, size = 'w-5 h-5') => {
    switch (type) {
      case 'fuel':
        return <Fuel className={`${size} text-purple-600 group-hover:text-white transition-colors`} />;
      case 'maintenance':
        return <Wrench className={`${size} text-yellow-600 group-hover:text-white transition-colors`} />;
      case 'perdiem':
        return <Receipt className={`${size} text-indigo-600 group-hover:text-white transition-colors`} />;
      default:
        return <FileText className={`${size} text-gray-500 group-hover:text-white transition-colors`} />;
    }
  };

  const timeAgo = (date) => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const diff = Math.max(0, Date.now() - d.getTime());
      const s = Math.floor(diff / 1000);
      if (s < 60) return `${s}s ago`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m}m ago`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h}h ago`;
      const dys = Math.floor(h / 24);
      if (dys < 7) return `${dys}d ago`;
      return d.toLocaleDateString();
    } catch {
      return '';
    }
  };

  const buildLinkWithHighlight = (item) => {
    try {
      const t = (item?.type || '').toLowerCase();
      const base = t === 'fuel' ? '/fuel' : t === 'maintenance' ? '/maintenance' : t === 'perdiem' ? '/perdiem' : '/dashboard';
      const hasQuery = base.includes('?');
      return `${base}${hasQuery ? '&' : '?'}highlight=${item._id}`;
    } catch {
      return '/dashboard';
    }
  };

  const renderDetails = (req) => {
    try {
      const t = (req?.type || '').toLowerCase();
      const vehicle = req.vehicleId && typeof req.vehicleId === 'object' ? req.vehicleId : null;
      const plate = vehicle?.plateNumber || vehicle?.licensePlate;
      if (t === 'fuel') {
        const qty = req.quantity != null ? `${req.quantity}L` : null;
        const ftype = req.fuelType ? req.fuelType : null;
        const pieces = [];
        if (plate) pieces.push(`Plate: ${plate}`);
        if (qty) pieces.push(`Qty: ${qty}`);
        if (ftype) pieces.push(`Type: ${ftype}`);
        if (req.cost != null) pieces.push(`Cost: $${req.cost}`);
        return pieces.join(' · ');
      }
      if (t === 'maintenance') {
        const parts = [];
        if (plate) parts.push(`Plate: ${plate}`);
        if (req.category) parts.push(`Cat: ${req.category}`);
        if (req.description) parts.push(req.description);
        return parts.join(' · ');
      }
      if (t === 'perdiem') {
        const parts = [];
        if (req.destination) parts.push(`Dest: ${req.destination}`);
        if (req.numberOfDays) parts.push(`${req.numberOfDays} day${req.numberOfDays > 1 ? 's' : ''}`);
        const sd = req.startDate ? new Date(req.startDate).toLocaleDateString() : null;
        const ed = req.endDate ? new Date(req.endDate).toLocaleDateString() : null;
        if (sd || ed) parts.push(`${sd || '—'} - ${ed || '—'}`);
        return parts.join(' · ');
      }
      return '';
    } catch {
      return '';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-12 bg-white/30"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-white/80">Dashboard Overview</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2">
              Welcome Back
            </h1>
            <p className="text-xl text-white/90 font-semibold">
              {user.fullName || user.username}
            </p>
            <p className="text-white/70 mt-1">Here's what's happening today</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-bold uppercase tracking-wide">Active</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user.role === 'admin' && (
          <div className="group relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Users</p>
                <p className="text-4xl font-black text-gray-900 mb-1">{stats.totalUsers}</p>
                <p className="text-xs text-gray-400">Active members</p>
              </div>
              <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:scale-110 transition-all">
                <Users className="h-8 w-8 text-blue-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}

        {(user.role === 'admin' || user.role === 'manager') && (
          <div className="group relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Vehicles</p>
                <p className="text-4xl font-black text-gray-900 mb-1">{stats.totalVehicles}</p>
                <p className="text-xs text-gray-400">In fleet</p>
              </div>
              <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-600 group-hover:scale-110 transition-all">
                <Truck className="h-8 w-8 text-green-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}

        <div className="group relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pending Maintenance</p>
              <p className="text-4xl font-black text-gray-900 mb-1">{stats.pendingMaintenance}</p>
              <p className="text-xs text-gray-400">Awaiting approval</p>
            </div>
            <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center group-hover:bg-yellow-600 group-hover:scale-110 transition-all">
              <Wrench className="h-8 w-8 text-yellow-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pending Fuel</p>
              <p className="text-4xl font-black text-gray-900 mb-1">{stats.pendingFuel}</p>
              <p className="text-xs text-gray-400">Requests pending</p>
            </div>
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-600 group-hover:scale-110 transition-all">
              <Fuel className="h-8 w-8 text-purple-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pending Per Diem</p>
              <p className="text-4xl font-black text-gray-900 mb-1">{stats.pendingPerDiem}</p>
              <p className="text-xs text-gray-400">Awaiting review</p>
            </div>
            <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:scale-110 transition-all">
              <Receipt className="h-8 w-8 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {user.role === 'user' && (
          <div className="group relative bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all cursor-pointer overflow-hidden">
            <div className="absolute top-0 right-0 w-0 h-1 bg-primary-600 group-hover:w-full transition-all duration-500"></div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Logs</p>
                <p className="text-4xl font-black text-gray-900 mb-1">{stats.totalLogs}</p>
                <p className="text-xs text-gray-400">Trip records</p>
              </div>
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-800 group-hover:scale-110 transition-all">
                <FileText className="h-8 w-8 text-gray-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-primary-600"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Activity Feed</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Recent Requests</h2>
          </div>
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary-600" />
          </div>
        </div>
        
        {recentRequests.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-semibold">No recent requests found</p>
            <p className="text-sm text-gray-400 mt-1">Start by submitting a new request</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <button
                key={`${request.type}-${request._id}`}
                onClick={() => navigate(buildLinkWithHighlight(request))}
                className="group w-full text-left flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-primary-50 border-2 border-transparent hover:border-primary-200 transition-all"
              >
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-all shadow-sm">
                    {typeIcon(request.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                        {getRequestTypeLabel(request.type)} Request
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                      {request.priority && (
                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-wider ${getPriorityBadgeColor(request.priority)}`}>
                          {request.priority}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 font-medium mb-1">{renderDetails(request)}</div>
                    <div className="text-[11px] text-gray-400 uppercase tracking-wide">
                      {timeAgo(request.createdAt)} · {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-primary-600 font-bold text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-px w-8 bg-primary-600"></div>
            <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Get Started</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/maintenance')}
            className="group relative p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-600 hover:bg-gradient-to-br hover:from-primary-50 hover:to-white transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-yellow-600 group-hover:scale-110 transition-all">
                <Wrench className="h-7 w-7 text-yellow-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-sm font-black text-gray-900 uppercase tracking-wide text-center group-hover:text-primary-600 transition-colors">
                Submit Maintenance Request
              </p>
              <p className="text-xs text-gray-500 text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Request vehicle maintenance
              </p>
            </div>
          </button>
          <button 
            onClick={() => navigate('/fuel')}
            className="group relative p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-600 hover:bg-gradient-to-br hover:from-primary-50 hover:to-white transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-purple-600 group-hover:scale-110 transition-all">
                <Fuel className="h-7 w-7 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-sm font-black text-gray-900 uppercase tracking-wide text-center group-hover:text-primary-600 transition-colors">
                Submit Fuel Request
              </p>
              <p className="text-xs text-gray-500 text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Request fuel refill
              </p>
            </div>
          </button>
          <button 
            onClick={() => navigate('/logs')}
            className="group relative p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-600 hover:bg-gradient-to-br hover:from-primary-50 hover:to-white transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary-600 opacity-0 group-hover:opacity-5 transition-opacity"></div>
            <div className="relative">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-indigo-600 group-hover:scale-110 transition-all">
                <FileText className="h-7 w-7 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <p className="text-sm font-black text-gray-900 uppercase tracking-wide text-center group-hover:text-primary-600 transition-colors">
                Log Daily Trip
              </p>
              <p className="text-xs text-gray-500 text-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                Record your trip details
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
