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

  const typeIcon = (type) => {
    switch (type) {
      case 'fuel':
        return <Fuel className="h-5 w-5 text-purple-600" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5 text-yellow-600" />;
      case 'perdiem':
        return <Receipt className="h-5 w-5 text-indigo-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
  <p className="text-gray-600">Welcome back, {user.fullName || user.username}! Here's what's happening today.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {user.role === 'admin' && (
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        )}

        {(user.role === 'admin' || user.role === 'manager') && (
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Truck className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalVehicles}</p>
              </div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Wrench className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingMaintenance}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Fuel className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Fuel</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingFuel}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Receipt className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Per Diem</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingPerDiem}</p>
            </div>
          </div>
        </div>

        {user.role === 'user' && (
          <div className="card">
            <div className="flex items-center">
              <div className="p-2 bg-gray-100 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Logs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Requests</h2>
          <TrendingUp className="h-5 w-5 text-gray-400" />
        </div>
        
        {recentRequests.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent requests found.</p>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <button
                key={`${request.type}-${request._id}`}
                onClick={() => navigate(buildLinkWithHighlight(request))}
                className="w-full text-left flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
              >
                <div className="flex items-center space-x-3">
                  {typeIcon(request.type)}
                  <div>
                    <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                      {getRequestTypeLabel(request.type)} Request
                      <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </p>
                    <div className="text-xs text-gray-600 mt-0.5">{renderDetails(request)}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {timeAgo(request.createdAt)} · {new Date(request.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeColor(request.priority)}`}>
                  {request.priority || 'N/A'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors duration-200">
            <Wrench className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Submit Maintenance Request</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors duration-200">
            <Fuel className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Submit Fuel Request</p>
          </button>
          <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors duration-200">
            <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Log Daily Trip</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
