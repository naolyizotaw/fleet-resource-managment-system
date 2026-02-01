import React, { useEffect, useState, useRef } from 'react';
import { api } from '../services/api';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Truck,
  Wrench,
  Fuel,
  Receipt,
  FileText,
  BarChart3,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  ChevronDown,
  TrendingUp,
  Newspaper,
  MapPin,
  Package,
  ClipboardList,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const notifRef = useRef(null);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifPage, setNotifPage] = useState(1);
  const [notifLimit] = useState(10);
  const [notifTotal, setNotifTotal] = useState(0);
  const [notifTab, setNotifTab] = useState('all'); // 'all' | 'unread'

  // Map type to an icon
  const typeIcon = (type) => {
    switch (String(type || '').toLowerCase()) {
      case 'fuel':
        return <Fuel className="h-4 w-4 text-purple-600 group-hover:text-white transition-colors" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-yellow-600 group-hover:text-white transition-colors" />;
      case 'perdiem':
      case 'per_diem':
      case 'perdiemrequest':
      case 'per diem':
        return <Receipt className="h-4 w-4 text-indigo-600 group-hover:text-white transition-colors" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400 group-hover:text-white transition-colors" />;
    }
  };

  // Relative time helper
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

  // Derive status from meta/title/message
  const deriveStatus = (item) => {
    const m = item?.meta || {};
    const fromMeta = (m.newStatus || m.status || '').toString().toLowerCase();
    if (fromMeta) return fromMeta;
    const hay = `${item?.title || ''} ${item?.message || ''}`.toLowerCase();
    if (hay.includes('approved')) return 'approved';
    if (hay.includes('rejected')) return 'rejected';
    if (hay.includes('completed')) return 'completed';
    if (hay.includes('pending')) return 'pending';
    return '';
  };

  const statusChip = (status) => {
    const s = (status || '').toLowerCase();
    let cls = 'bg-gray-100 text-gray-700';
    let label = s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
    if (s === 'pending') cls = 'bg-yellow-100 text-yellow-800';
    else if (s === 'approved') cls = 'bg-green-100 text-green-800';
    else if (s === 'rejected') cls = 'bg-red-100 text-red-800';
    else if (s === 'completed') cls = 'bg-emerald-100 text-emerald-800';
    return { cls, label };
  };

  // Build concise details from notification meta (e.g., plate, destination, qty)
  const buildMetaDetails = (item) => {
    try {
      const m = item?.meta || {};
      const parts = [];
      const plate = m.vehicle?.plateNumber || m.vehiclePlate || m.plateNumber;
      if (plate) parts.push(`Plate: ${plate}`);
      if (m.destination) parts.push(`Dest: ${m.destination}`);
      if (m.category) parts.push(`Cat: ${m.category}`);
      if (m.quantity) parts.push(`Qty: ${m.quantity}`);
      if (m.cost) parts.push(`Cost: $${m.cost}`);
      if (m.amount) parts.push(`Amount: $${m.amount}`);
      const by = m.requestedByName || m.driverName || m.userName;
      if (by) parts.push(`By: ${by}`);
      return parts.join(' · ');
    } catch {
      return '';
    }
  };

  // Build a safe navigation URL that includes ?highlight=<entityId> when available
  const buildLinkWithHighlight = (item) => {
    try {
      const base = item?.actionUrl || (item?.type === 'fuel' ? '/fuel' : item?.type === 'maintenance' ? '/maintenance' : item?.type === 'perdiem' ? '/perdiem' : '/dashboard');
      if (!item?.entityId) return base;
      if (base.includes('highlight=')) return base; // already present
      const hasQuery = base.includes('?');
      return `${base}${hasQuery ? '&' : '?'}highlight=${item.entityId}`;
    } catch {
      return '/dashboard';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Fetch unread count periodically
  useEffect(() => {
    let timer;
    const pull = async () => {
      try {
        const [unreadRes, pendingRes] = await Promise.all([
          api.get('/api/notifications/unread-count'),
          api.get('/api/notifications/pending-requests'),
        ]);
        setUnreadCount(unreadRes.data?.count || 0);
        const pData = pendingRes.data?.data || [];
        setPendingCount(Array.isArray(pData) ? pData.length : 0);
      } catch (e) {
        // ignore
      }
    };
    if (user) {
      pull();
      timer = setInterval(pull, 30000);
    }
    return () => timer && clearInterval(timer);
  }, [user]);

  // toggle dropdown
  const openNotif = () => setNotifOpen((o) => !o);

  // close dropdown on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // fetch notifications and pending when open
  useEffect(() => {
    const fetchList = async () => {
      if (!notifOpen) return;
      setNotifLoading(true);
      try {
        const params = { page: notifPage, limit: notifLimit };
        if (notifTab === 'unread') params.status = 'unread';
        const [notifRes, pendingRes] = await Promise.all([
          api.get('/api/notifications', { params }),
          api.get('/api/notifications/pending-requests'),
        ]);
        const list = notifRes.data?.data || [];
        const pData = pendingRes.data?.data || [];

        // Deduplicate pending items first
        const uniquePendingMap = new Map();
        pData.forEach(p => {
          const key = p.entityId || p._id;
          if (key && !uniquePendingMap.has(key)) {
            uniquePendingMap.set(key, p);
          }
        });
        const uniquePending = Array.from(uniquePendingMap.values());

        // Filter out notifications that are also pending requests to prevent duplication
        // Check both _id and entityId to catch all duplicates
        const pendingKeys = new Set();
        uniquePending.forEach(p => {
          if (p._id) pendingKeys.add(p._id);
          if (p.entityId) pendingKeys.add(p.entityId);
        });

        const filteredList = list.filter(n => {
          // Don't show if notification's _id or entityId matches any pending request
          if (n._id && pendingKeys.has(n._id)) return false;
          if (n.entityId && pendingKeys.has(n.entityId)) return false;
          return true;
        });

        // Deduplicate the filtered list as well
        const uniqueNotifMap = new Map();
        filteredList.forEach(n => {
          const key = n.entityId || n._id;
          if (key && !uniqueNotifMap.has(key)) {
            uniqueNotifMap.set(key, n);
          }
        });
        const uniqueNotifications = Array.from(uniqueNotifMap.values());

        if (notifPage === 1) {
          setNotifications(uniqueNotifications);
        } else {
          setNotifications((prev) => [...prev, ...uniqueNotifications]);
        }
        setNotifTotal(Number(notifRes.data?.total || 0) - (list.length - uniqueNotifications.length));
        setPendingItems(uniquePending);
        setPendingCount(uniquePending.length);
      } catch (e) {
        // ignore
      } finally {
        setNotifLoading(false);
      }
    };
    fetchList();
  }, [notifOpen, notifPage, notifLimit, notifTab]);

  const hasMoreNotifications = notifications.length < notifTotal;

  const switchTab = (tab) => {
    if (notifTab === tab) return;
    setNotifTab(tab);
    setNotifPage(1);
  };

  const loadMoreNotifications = () => {
    if (!hasMoreNotifications || notifLoading) return;
    setNotifPage((p) => p + 1);
  };

  const markOneRead = async (id) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, status: 'read' } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      if (notifTab === 'unread') {
        setNotifications([]);
        setNotifTotal(0);
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      }
      setUnreadCount(0);
    } catch { }
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'manager', 'user'] },
    { name: 'News', href: '/news', icon: Newspaper, roles: ['admin', 'manager', 'user'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
    { name: 'Vehicles', href: '/vehicles', icon: Truck, roles: ['admin', 'manager'] },
    { name: 'Map', href: '/map', icon: MapPin, roles: ['admin', 'manager'] },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'manager', 'user'] },
    { name: 'Work Orders', href: '/work-orders', icon: ClipboardList, roles: ['admin', 'manager'] },
    { name: 'Fuel', href: '/fuel', icon: Fuel, roles: ['admin', 'manager', 'user'] },
    { name: 'Per Diem', href: '/perdiem', icon: Receipt, roles: ['admin', 'manager', 'user'] },
    { name: 'Logs', href: '/logs', icon: FileText, roles: ['admin', 'manager', 'user'] },
    { name: 'Inventory', href: '/inventory', icon: Package, roles: ['admin', 'manager', 'user'] },
    { name: 'Spare Parts Requests', href: '/spare-parts', icon: Package, roles: ['admin', 'manager', 'user'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { name: 'Settings', href: '/settings', icon: User, roles: ['admin', 'manager', 'user'] },
  ];

  const filteredNavigation = navigationItems.filter(item => item.roles.includes(user?.role));

  return (
    <div className="h-screen overflow-hidden bg-gray-50 lg:flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-20' : 'w-72'} bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 shadow-2xl transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
        <div className="flex items-center justify-between h-20 px-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-600 rounded-xl blur opacity-40"></div>
              <div className="relative w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-xl flex items-center justify-center shadow-lg">
                <Truck className="h-6 w-6" />
              </div>
            </div>
            <div className={`${collapsed ? 'hidden' : ''}`}>
              <h1 className="text-lg font-black text-white uppercase tracking-tight leading-none">FleetPro</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-0.5">Management</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User info */}
        <div className={`${collapsed ? 'px-2 py-4' : 'px-4 py-4'} border-b border-white/10`}>
          <div className={`${collapsed ? 'flex justify-center' : 'bg-white/5 backdrop-blur-sm rounded-xl p-3 border border-white/10'}`}>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-11 h-11 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-lg ring-2 ring-white/20">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className={`${collapsed ? 'hidden' : 'flex-1'}`}>
                <p className="text-sm font-bold text-white leading-none truncate">{user?.fullName || user?.username}</p>
                <p className="text-xs text-primary-400 capitalize font-semibold mt-1">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          <div className={`${collapsed ? 'hidden' : 'mb-3 px-3 flex items-center gap-2'}`}>
            <div className="w-1 h-1 bg-primary-500 rounded-full"></div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Main</span>
          </div>
          <div className="space-y-1.5">
            {filteredNavigation.filter(i => ['Dashboard', 'News', 'Reports'].includes(i.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group relative flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all ${isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full"></div>
                  )}
                  <item.icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                  <span className={`${collapsed ? 'hidden' : 'font-bold text-sm'}`}>{item.name}</span>
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </div>

          <div className={`${collapsed ? 'hidden' : 'mb-3 mt-6 px-3 flex items-center gap-2'}`}>
            <div className="w-1 h-1 bg-primary-500 rounded-full"></div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Management</span>
          </div>
          <div className="space-y-1.5">
            {filteredNavigation.filter(i => ['Users', 'Vehicles', 'Map', 'Maintenance', 'Work Orders', 'Fuel', 'Per Diem', 'Logs', 'Inventory', 'Spare Parts Requests'].includes(i.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group relative flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all ${isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full"></div>
                  )}
                  <item.icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                  <span className={`${collapsed ? 'hidden' : 'font-bold text-sm'}`}>{item.name}</span>
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Settings in separate section */}
          <div className={`${collapsed ? 'hidden' : 'mb-3 mt-6 px-3 flex items-center gap-2'}`}>
            <div className="w-1 h-1 bg-primary-500 rounded-full"></div>
            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-black">Account</span>
          </div>
          <div className="space-y-1.5">
            {filteredNavigation.filter(i => ['Settings'].includes(i.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`group relative flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-all ${isActive
                    ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  {isActive && !collapsed && (
                    <div className="absolute left-0 w-1 h-8 bg-white rounded-r-full"></div>
                  )}
                  <item.icon className={`h-5 w-5 ${isActive ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                  <span className={`${collapsed ? 'hidden' : 'font-bold text-sm'}`}>{item.name}</span>
                  {isActive && !collapsed && (
                    <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar vertical collapse handle */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2 hidden lg:block">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center justify-center h-16 w-5 bg-gradient-to-r from-gray-800 to-gray-900 border border-white/10 hover:from-primary-600 hover:to-primary-700 rounded-l-lg shadow-xl transition-all group"
          >
            <svg className={`h-3 w-3 text-gray-400 group-hover:text-white transform ${collapsed ? 'rotate-180' : ''} transition-all`} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
          </button>
        </div>
        {/* Logout */}
        <div className={`border-t border-white/10 p-3 ${collapsed ? 'px-2' : 'px-4'}`}>
          <button
            onClick={handleLogout}
            className={`group w-full flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 text-sm font-bold text-gray-300 hover:bg-red-500/20 hover:text-red-400 rounded-xl transition-all border-2 border-transparent hover:border-red-500/30`}
          >
            <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center group-hover:bg-red-500/20 transition-all">
              <LogOut className="h-5 w-5" />
            </div>
            <span className={`${collapsed ? 'hidden' : ''} uppercase tracking-wide`}>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white sticky top-0 z-40 shadow-md border-b-4 border-primary-600 flex-shrink-0">
          <div className="flex items-center justify-between h-20 px-6">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-primary-600 hover:bg-primary-50 transition-all"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/dashboard')}>
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all">
                    <Truck className="h-7 w-7" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-primary-700 bg-clip-text text-transparent uppercase tracking-tighter leading-none">
                    FleetPro
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-1 h-1 bg-primary-600 rounded-full"></div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Management System</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats in Header */}
              <div className="hidden xl:flex items-center gap-4 ml-8 pl-8 border-l-2 border-gray-200">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wide">System Active</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg">
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Live Dashboard</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* notification bell */}
              <div className="relative" ref={notifRef}>
                <button onClick={openNotif} className="relative p-3 rounded-xl bg-gray-100 text-gray-600 hover:bg-primary-50 hover:text-primary-600 transition-all group">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1">
                    {pendingCount > 0 ? (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-5 text-center shadow-lg animate-pulse ring-2 ring-white" aria-label={`${pendingCount} pending requests`}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    ) : unreadCount > 0 ? (
                      <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 rounded-full bg-primary-500 text-white text-[10px] font-bold leading-5 text-center shadow-lg ring-2 ring-white" aria-label={`${unreadCount} unread notifications`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-green-500 ring-2 ring-white" aria-label="notification center"></span>
                    )}
                  </span>
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black text-white uppercase tracking-wide">Notifications</h3>
                        <button onClick={markAllRead} className="text-xs text-white/90 hover:text-white font-bold uppercase tracking-wide hover:underline">Mark all read</button>
                      </div>
                      {/* Tabs */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => switchTab('all')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${notifTab === 'all' ? 'bg-white text-primary-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => switchTab('unread')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all ${notifTab === 'unread' ? 'bg-white text-primary-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}
                        >
                          Unread
                          {unreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-black shadow-md">{unreadCount}</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifLoading ? (
                        <div className="p-8 text-center">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-3"></div>
                          <p className="text-sm text-gray-500 font-semibold">Loading notifications...</p>
                        </div>
                      ) : pendingItems.length === 0 && notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Bell className="h-7 w-7 text-gray-400" />
                          </div>
                          <p className="text-sm text-gray-600 font-semibold">No notifications</p>
                          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                        </div>
                      ) : (
                        <div>
                          {pendingItems.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
                                  <span className="text-[11px] uppercase tracking-widest font-black text-red-700">Pending Actions</span>
                                  <span className="ml-auto text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">{pendingItems.length}</span>
                                </div>
                              </div>
                              {pendingItems.map((p) => (
                                <button
                                  key={`p-${p.type}-${p._id}`}
                                  onClick={() => { navigate(buildLinkWithHighlight(p)); setNotifOpen(false); }}
                                  className="group w-full text-left px-4 py-3 border-b last:border-0 hover:bg-primary-50 transition-all"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary-600 transition-all">
                                      {typeIcon(p.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-bold text-gray-900 truncate">{p.title}</p>
                                        {(() => {
                                          const st = statusChip(deriveStatus(p));
                                          return st.label ? (
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                                          ) : null;
                                        })()}
                                      </div>
                                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">{p.message}</p>
                                      {buildMetaDetails(p) && (
                                        <p className="text-[10px] text-gray-500 font-medium mb-1">{buildMetaDetails(p)}</p>
                                      )}
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{timeAgo(p.createdAt)}</p>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {notifications.length > 0 && (
                            <div>
                              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                                  <span className="text-[11px] uppercase tracking-widest font-black text-gray-600">Recent Activity</span>
                                </div>
                              </div>
                              {notifications.map((n) => (
                                <button
                                  key={n._id}
                                  onClick={() => {
                                    if (n.status === 'unread') markOneRead(n._id);
                                    navigate(buildLinkWithHighlight(n));
                                    setNotifOpen(false);
                                  }}
                                  className={`group w-full text-left px-4 py-3 border-b last:border-0 hover:bg-primary-50 transition-all ${n.status === 'unread' ? 'bg-primary-50/30 border-l-4 border-l-primary-600' : 'border-l-4 border-l-transparent'
                                    }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="relative mt-0.5 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-primary-600 transition-all">
                                      {typeIcon(n.type)}
                                      {n.status === 'unread' && (
                                        <span className="absolute -top-1 -right-1 inline-block h-2.5 w-2.5 rounded-full bg-primary-600 ring-2 ring-white"></span>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className={`text-sm font-bold truncate ${n.status === 'unread' ? 'text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                                        {(() => {
                                          const st = statusChip(deriveStatus(n));
                                          return st.label ? (
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${st.cls}`}>{st.label}</span>
                                          ) : null;
                                        })()}
                                      </div>
                                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">{n.message}</p>
                                      {buildMetaDetails(n) && (
                                        <p className="text-[10px] text-gray-500 font-medium mb-1">{buildMetaDetails(n)}</p>
                                      )}
                                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{timeAgo(n.createdAt)}</p>
                                    </div>
                                    {n.status === 'unread' && (
                                      <button onClick={(e) => { e.stopPropagation(); markOneRead(n._id); }} className="text-xs text-primary-600 hover:text-primary-700 font-bold uppercase tracking-wide">✓</button>
                                    )}
                                  </div>
                                </button>
                              ))}

                              {hasMoreNotifications && (
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                  <button
                                    onClick={loadMoreNotifications}
                                    disabled={notifLoading}
                                    className="w-full text-center text-xs font-bold uppercase tracking-wide px-4 py-2.5 rounded-lg border-2 border-primary-200 hover:bg-primary-50 hover:border-primary-300 text-primary-700 transition-all disabled:opacity-50"
                                  >
                                    {notifLoading ? 'Loading…' : 'Load More'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* user menu */}
              <div className="relative">
                <button onClick={() => setUserMenuOpen(v => !v)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 transition-all group shadow-lg hover:shadow-xl">
                  <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-bold text-white leading-none">{user?.fullName || user?.username}</p>
                    <p className="text-[10px] text-white/70 uppercase tracking-wide font-semibold mt-0.5">{user?.role}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-white/80 group-hover:text-white transition-colors" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-primary-100 rounded-xl shadow-2xl overflow-hidden">
                    <div className="bg-gradient-to-r from-primary-50 to-blue-50 px-4 py-4 border-b-2 border-primary-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-700 rounded-lg flex items-center justify-center shadow-md">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-gray-900 leading-none">{user?.fullName || user?.username}</p>
                          <p className="text-xs text-gray-600 capitalize font-bold mt-0.5">{user?.role}</p>
                        </div>
                      </div>
                    </div>
                    <div className="py-2">
                      <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="w-full text-left px-4 py-3 text-sm font-bold text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors flex items-center gap-3 group">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-primary-600 transition-all">
                          <User className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                        </div>
                        <span>Account Settings</span>
                      </button>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3 border-t-2 border-gray-100 group">
                        <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-600 transition-all">
                          <LogOut className="h-4 w-4 text-red-600 group-hover:text-white transition-colors" />
                        </div>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6 flex-1 overflow-y-auto dot-pattern-bg">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
