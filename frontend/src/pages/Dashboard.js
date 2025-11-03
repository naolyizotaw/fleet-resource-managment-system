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
  Megaphone,
  UserPlus,
  Calendar,
  Award,
  Newspaper,
} from 'lucide-react';
import { maintenanceAPI, fuelAPI, perDiemAPI, logsAPI, vehiclesAPI, usersAPI, newsAPI } from '../services/api';

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
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);

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

  // Fetch news
  const fetchNews = React.useCallback(async () => {
    try {
      setNewsLoading(true);
      const response = await newsAPI.getRecent();
      setNews(response.data.data || []);
    } catch (error) {
      console.error('Error fetching news:', error);
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

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
      <div className="relative bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 overflow-hidden">
        {/* Dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black"></div>
        
        {/* Decorative shapes */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-gray-700/30 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-gray-800/40 rounded-full blur-3xl"></div>
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>

        <div className="relative p-8 md:p-10">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 min-w-[280px]">
              {/* Top badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-800/60 backdrop-blur-sm rounded-full border border-gray-700/50 mb-4">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-300">Dashboard Overview</span>
              </div>

              {/* Welcome message */}
              <div className="mb-4">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-3 leading-none">
                  Welcome Back,
                  <span className="block mt-2 text-gray-300">{user.fullName || user.username}</span>
                </h1>
              </div>

              {/* Info row */}
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-semibold">{user.role.charAt(0).toUpperCase() + user.role.slice(1)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                </div>
              </div>
            </div>

            {/* Right side - Status cards */}
            <div className="flex flex-col gap-3">
              {/* Active status */}
              <div className="flex items-center gap-3 px-5 py-3 bg-gray-800/80 backdrop-blur-sm rounded-xl shadow-lg border border-gray-700/50">
                <div className="flex items-center justify-center w-10 h-10 bg-green-500/20 rounded-lg border border-green-500/30">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-black text-gray-400">System Status</p>
                  <p className="text-sm font-black text-white uppercase">Online</p>
                </div>
              </div>

              {/* Quick action button */}
              <button 
                onClick={() => navigate('/news')}
                className="group flex items-center gap-3 px-5 py-3 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 hover:bg-gray-700 hover:border-gray-600 transition-all"
              >
                <Newspaper className="h-5 w-5 text-gray-300 group-hover:text-white transition-colors" />
                <span className="text-sm font-bold text-gray-300 group-hover:text-white transition-colors">View News</span>
              </button>
            </div>
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

      {/* News & Events Section */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-primary-600"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Latest Updates</span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">News & Events</h2>
          </div>
          <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Newspaper className="h-6 w-6 text-primary-600" />
          </div>
        </div>

        {newsLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 font-semibold">Loading news...</p>
          </div>
        ) : news.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-semibold">No news or events available</p>
            <p className="text-xs mt-1">Check back later for updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {news.map((post) => {
              const typeConfig = {
                announcement: { 
                  bgColor: 'from-primary-50 to-blue-50', 
                  borderColor: 'border-primary-600', 
                  iconBg: 'bg-primary-600', 
                  badgeBg: 'bg-primary-600',
                  icon: Megaphone 
                },
                employee: { 
                  bgColor: 'from-green-50 to-emerald-50', 
                  borderColor: 'border-green-600', 
                  iconBg: 'bg-green-600', 
                  badgeBg: 'bg-green-600',
                  icon: UserPlus 
                },
                event: { 
                  bgColor: 'from-purple-50 to-pink-50', 
                  borderColor: 'border-purple-600', 
                  iconBg: 'bg-purple-600', 
                  badgeBg: 'bg-purple-600',
                  icon: Calendar 
                },
                achievement: { 
                  bgColor: 'from-yellow-50 to-orange-50', 
                  borderColor: 'border-yellow-600', 
                  iconBg: 'bg-yellow-600', 
                  badgeBg: 'bg-yellow-600',
                  icon: Award 
                },
                general: { 
                  bgColor: 'from-gray-50 to-slate-50', 
                  borderColor: 'border-gray-600', 
                  iconBg: 'bg-gray-600', 
                  badgeBg: 'bg-gray-600',
                  icon: Newspaper 
                },
              };

              const config = typeConfig[post.type] || typeConfig.general;
              const IconComponent = config.icon;

              const timeAgo = (date) => {
                const seconds = Math.floor((new Date() - new Date(date)) / 1000);
                if (seconds < 60) return 'just now';
                const minutes = Math.floor(seconds / 60);
                if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
                const hours = Math.floor(minutes / 60);
                if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
                const days = Math.floor(hours / 24);
                if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
                return new Date(date).toLocaleDateString();
              };

              return (
                <div key={post._id} className={`group relative bg-white rounded-2xl p-6 border border-gray-200 hover:border-primary-300 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer`}
                  onClick={() => navigate('/news')}>
                  
                  {/* Animated gradient bar at top */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${config.iconBg} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
                  
                  {/* Subtle background pattern */}
                  <div className={`absolute -right-10 -top-10 w-40 h-40 bg-gradient-to-br ${config.bgColor} rounded-full opacity-20 group-hover:scale-110 transition-transform duration-500`}></div>
                  
                  <div className="relative flex items-start gap-5">
                    {/* Icon with animated ring */}
                    <div className="relative flex-shrink-0">
                      <div className={`absolute inset-0 ${config.iconBg} rounded-xl opacity-20 blur-md group-hover:blur-lg transition-all`}></div>
                      <div className={`relative w-14 h-14 ${config.iconBg} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300`}>
                        <IconComponent className="h-7 w-7 text-white" />
                      </div>
                      {/* Pulse ring animation */}
                      <div className={`absolute inset-0 ${config.iconBg} rounded-xl opacity-0 group-hover:opacity-30 group-hover:scale-125 transition-all duration-500`}></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header with badge and time */}
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className={`px-3 py-1.5 ${config.badgeBg} text-white text-[9px] font-black uppercase tracking-[0.15em] rounded-full shadow-sm`}>
                          {post.type}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                          <span className="font-medium">{timeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Title with gradient on hover */}
                      <h3 className="text-base font-black text-gray-900 mb-2.5 leading-tight group-hover:text-primary-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      
                      {/* Content with fade effect */}
                      <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-2">
                        {post.content}
                      </p>
                      
                      {/* Event date badge */}
                      {post.eventDate && (
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r ${config.bgColor} rounded-lg text-xs font-bold text-gray-700 border border-gray-200`}>
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(post.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      )}
                      
                      {/* Read more indicator */}
                      <div className="flex items-center gap-2 mt-4 text-xs font-bold text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="uppercase tracking-wide">Read More</span>
                        <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* View All Link */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-center">
          <button 
            onClick={() => navigate('/news')}
            className="text-sm font-bold text-primary-600 hover:text-primary-700 uppercase tracking-wide hover:underline transition-colors"
          >
            View All News & Events →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
