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
  const [vehicles, setVehicles] = useState([]);
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

        setVehicles(vehiclesRes.data);
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

  // Filter vehicles approaching service
  const vehiclesNeedingService = vehicles.filter(vehicle => {
    const kmUntilService = vehicle.serviceInfo?.kilometersUntilNextService;
    return kmUntilService != null && kmUntilService < 500 && kmUntilService >= 0;
  }).sort((a, b) => {
    const aKm = a.serviceInfo?.kilometersUntilNextService ?? Infinity;
    const bKm = b.serviceInfo?.kilometersUntilNextService ?? Infinity;
    return aKm - bKm; // Most urgent first
  });

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
    <div className="space-y-6">
      {/* Full Width Welcome Header */}
      <div className="relative bg-gradient-to-br from-gray-900 via-slate-800 to-black rounded-xl shadow-lg overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="relative px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-1 bg-primary-500 rounded-full"></div>
                <span className="text-[9px] uppercase tracking-[0.15em] font-black text-gray-400">Dashboard</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-1">
                Welcome Back, {user.fullName || user.username}
              </h1>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold capitalize">{user.role}</span>
                </div>
                <div className="w-px h-3 bg-gray-600"></div>
                <div className="flex items-center gap-1.5 text-gray-300 text-sm">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="w-px h-3 bg-gray-600"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-bold text-gray-300">System Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user.role === 'admin' && (
          <div className="group relative bg-white rounded-lg shadow-md border-l-4 border-blue-500 p-5 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Total Users</p>
                <p className="text-3xl font-black text-gray-900">{stats.totalUsers}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">Active members</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-all">
                <Users className="h-6 w-6 text-blue-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}

        {(user.role === 'admin' || user.role === 'manager') && (
          <div className="group relative bg-white rounded-lg shadow-md border-l-4 border-green-500 p-5 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Vehicles</p>
                <p className="text-3xl font-black text-gray-900">{stats.totalVehicles}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">In fleet</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-all">
                <Truck className="h-6 w-6 text-green-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}

        <div className="group relative bg-white rounded-lg shadow-md border-l-4 border-yellow-500 p-5 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Maintenance</p>
              <p className="text-3xl font-black text-gray-900">{stats.pendingMaintenance}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Pending</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-600 transition-all">
              <Wrench className="h-6 w-6 text-yellow-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-lg shadow-md border-l-4 border-purple-500 p-5 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Fuel</p>
              <p className="text-3xl font-black text-gray-900">{stats.pendingFuel}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Pending</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-all">
              <Fuel className="h-6 w-6 text-purple-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        <div className="group relative bg-white rounded-lg shadow-md border-l-4 border-indigo-500 p-5 hover:shadow-lg transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Per Diem</p>
              <p className="text-3xl font-black text-gray-900">{stats.pendingPerDiem}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Pending</p>
            </div>
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-all">
              <Receipt className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>

        {user.role === 'user' && (
          <div className="group relative bg-white rounded-lg shadow-md border-l-4 border-gray-500 p-5 hover:shadow-lg transition-all cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Trip Logs</p>
                <p className="text-3xl font-black text-gray-900">{stats.totalLogs}</p>
                <p className="text-xs text-gray-500 font-semibold mt-1">Recorded</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-800 transition-all">
                <FileText className="h-6 w-6 text-gray-600 group-hover:text-white transition-colors" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Recent Requests</h2>
            <p className="text-xs text-gray-500 font-semibold">Latest activity</p>
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
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Quick Actions</h2>
            <p className="text-xs text-gray-500 font-semibold">Common tasks</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button 
            onClick={() => navigate('/maintenance')}
            className="group relative p-4 border-2 border-gray-200 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-yellow-100 rounded-lg flex items-center justify-center group-hover:bg-yellow-600 transition-all">
                <Wrench className="h-5 w-5 text-yellow-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  Maintenance
                </p>
                <p className="text-[10px] text-gray-500 font-semibold">
                  New request
                </p>
              </div>
            </div>
          </button>
          <button 
            onClick={() => navigate('/fuel')}
            className="group relative p-4 border-2 border-gray-200 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-all">
                <Fuel className="h-5 w-5 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  Fuel
                </p>
                <p className="text-[10px] text-gray-500 font-semibold">
                  New request
                </p>
              </div>
            </div>
          </button>
          <button 
            onClick={() => navigate('/logs')}
            className="group relative p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                <FileText className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  Trip Log
                </p>
                <p className="text-[10px] text-gray-500 font-semibold">
                  New entry
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>

      {/* Sticky News Sidebar */}
      <aside className="hidden lg:block w-80 flex-shrink-0">
        <div className="sticky top-6 space-y-4">
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5 max-h-[calc(50vh-2rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
                <Newspaper className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900 uppercase tracking-tight">News & Events</h2>
                <p className="text-[10px] text-gray-500 font-semibold">Latest updates</p>
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
          <div className="space-y-3">
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
                <div key={post._id} className={`group relative bg-white rounded-xl p-4 border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer`}
                  onClick={() => navigate('/news')}>
                  
                  {/* Animated gradient bar at top */}
                  <div className={`absolute top-0 left-0 right-0 h-1 ${config.iconBg} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
                  
                  <div className="relative flex items-start gap-3">
                    {/* Icon */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-300`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {/* Header with badge and time */}
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className={`px-2 py-0.5 ${config.badgeBg} text-white text-[8px] font-black uppercase tracking-wider rounded-full`}>
                          {post.type}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <div className="w-0.5 h-0.5 bg-gray-400 rounded-full"></div>
                          <span className="font-medium">{timeAgo(post.createdAt)}</span>
                        </div>
                      </div>
                      
                      {/* Title */}
                      <h3 className="text-sm font-black text-gray-900 mb-1.5 leading-tight group-hover:text-primary-600 transition-colors line-clamp-2">
                        {post.title}
                      </h3>
                      
                      {/* Content */}
                      <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                        {post.content}
                      </p>
                      
                      {/* Event date badge */}
                      {post.eventDate && (
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r ${config.bgColor} rounded-lg text-[10px] font-bold text-gray-700 border border-gray-200 mt-2`}>
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(post.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

            {/* View All Button */}
            <div className="mt-5 pt-4 border-t border-gray-200">
              <button 
                onClick={() => navigate('/news')}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold uppercase text-[10px] tracking-wider rounded-lg hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Newspaper className="h-3.5 w-3.5" />
                <span>View All News</span>
              </button>
            </div>
          </div>

          {/* Service Alerts - Only for admin/manager */}
          {(user.role === 'admin' || user.role === 'manager') && vehiclesNeedingService.length > 0 && (
            <div className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 rounded-xl shadow-md border-2 border-orange-300 p-5 max-h-[calc(50vh-2rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-300 scrollbar-track-orange-100">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm relative">
                  <div className="absolute inset-0 bg-orange-500 opacity-20 rounded-lg blur-sm animate-pulse"></div>
                  <Wrench className="h-5 w-5 text-white relative z-10" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-tight">Service Alerts</h3>
                  <p className="text-[10px] text-orange-700 font-bold">
                    {vehiclesNeedingService.length} {vehiclesNeedingService.length === 1 ? 'vehicle' : 'vehicles'} &lt; 500km
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {vehiclesNeedingService.map((vehicle) => {
                  const kmLeft = vehicle.serviceInfo?.kilometersUntilNextService ?? 0;
                  const isUrgent = kmLeft < 100;
                  const isWarning = kmLeft >= 100 && kmLeft < 250;
                  
                  return (
                    <div 
                      key={vehicle._id}
                      onClick={() => navigate('/vehicles')}
                      className={`group relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isUrgent 
                          ? 'bg-red-50 border-red-400 hover:border-red-500 hover:shadow-md' 
                          : isWarning 
                          ? 'bg-orange-50 border-orange-400 hover:border-orange-500 hover:shadow-md'
                          : 'bg-yellow-50 border-yellow-400 hover:border-yellow-500 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
                            isUrgent ? 'bg-red-600' : isWarning ? 'bg-orange-600' : 'bg-yellow-600'
                          }`}>
                            <Truck className="h-4 w-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-bold text-gray-900 truncate">
                              {vehicle.manufacturer} {vehicle.model}
                            </h4>
                            <p className="text-[10px] text-gray-600 font-semibold">
                              {vehicle.plateNumber || 'N/A'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xl font-black ${
                            isUrgent ? 'text-red-700' : isWarning ? 'text-orange-700' : 'text-yellow-700'
                          }`}>
                            {kmLeft}
                          </div>
                          <div className="text-[8px] font-bold text-gray-600 uppercase">KM</div>
                        </div>
                      </div>
                      
                      {isUrgent && (
                        <div className="mt-2 px-2 py-1 bg-red-100 border border-red-300 rounded">
                          <p className="text-[9px] font-black text-red-800 uppercase tracking-wide text-center">⚠️ Critical</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>
      </div>
    </div>
  );
};

export default Dashboard;
