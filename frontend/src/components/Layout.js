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
        return <Fuel className="h-4 w-4 text-amber-600" />;
      case 'maintenance':
        return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'perdiem':
      case 'per_diem':
      case 'perdiemrequest':
      case 'per diem':
        return <Receipt className="h-4 w-4 text-emerald-600" />;
      default:
        return <Bell className="h-4 w-4 text-gray-400" />;
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
        if (notifPage === 1) {
          setNotifications(list);
        } else {
          setNotifications((prev) => [...prev, ...list]);
        }
        setNotifTotal(Number(notifRes.data?.total || 0));
        const pData = pendingRes.data?.data || [];
        setPendingItems(pData);
        setPendingCount(Array.isArray(pData) ? pData.length : 0);
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
    } catch {}
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
    } catch {}
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, roles: ['admin', 'manager', 'user'] },
    { name: 'Users', href: '/users', icon: Users, roles: ['admin'] },
    { name: 'Vehicles', href: '/vehicles', icon: Truck, roles: ['admin', 'manager'] },
    { name: 'Maintenance', href: '/maintenance', icon: Wrench, roles: ['admin', 'manager', 'user'] },
    { name: 'Fuel', href: '/fuel', icon: Fuel, roles: ['admin', 'manager', 'user'] },
    { name: 'Per Diem', href: '/perdiem', icon: Receipt, roles: ['admin', 'manager', 'user'] },
    { name: 'Logs', href: '/logs', icon: FileText, roles: ['admin', 'manager', 'user'] },
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
      <div className={`fixed inset-y-0 left-0 z-50 ${collapsed ? 'w-20' : 'w-64'} bg-white shadow-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-600 text-white rounded-md flex items-center justify-center font-bold">FM</div>
            <h1 className={`text-lg font-semibold text-gray-900 ${collapsed ? 'hidden' : ''}`}>Fleet Management</h1>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* User info */}
        <div className={`${collapsed ? 'px-2 py-4' : 'px-6 py-4'} border-b border-gray-200`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-primary-600" />
            </div>
            <div className={`${collapsed ? 'hidden' : ''}`}>
              <p className="text-sm font-medium text-gray-900">{user?.fullName || user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-2">
          <div className={`${collapsed ? 'hidden' : 'mb-3 px-3'} text-xs text-gray-400 uppercase tracking-wider`}>Main</div>
          <div className="space-y-1">
            {filteredNavigation.filter(i => ['Dashboard','Reports'].includes(i.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-md hover:bg-gray-100 ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}>
                  <item.icon className="h-5 w-5" />
                  <span className={`${collapsed ? 'hidden' : ''}`}>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className={`${collapsed ? 'hidden' : 'mb-3 mt-4 px-3'} text-xs text-gray-400 uppercase tracking-wider`}>Management</div>
          <div className="space-y-1">
            {filteredNavigation.filter(i => ['Users','Vehicles','Maintenance','Fuel','Per Diem','Logs','Settings'].includes(i.name)).map(item => {
              const isActive = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2 rounded-md hover:bg-gray-100 ${isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-700'}`}>
                  <item.icon className="h-5 w-5" />
                  <span className={`${collapsed ? 'hidden' : ''}`}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Sidebar vertical collapse handle */}
        <div className="absolute top-1/2 right-0 transform -translate-y-1/2">
          <button onClick={() => setCollapsed(c => !c)} className="flex items-center justify-center h-12 w-4 bg-white border-l border-gray-200 hover:bg-gray-50 rounded-l-md shadow-sm">
            <svg className={`h-3 w-3 text-gray-600 transform ${collapsed ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/></svg>
          </button>
        </div>
        {/* Logout (moved above collapse handle) */}
        <div className={`absolute bottom-3 left-0 right-0 p-2 ${collapsed ? 'px-2' : ''}`}>
          <button onClick={handleLogout} className={`flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-md ${collapsed ? 'justify-center w-10' : ''}`}>
            <LogOut className="h-5 w-5" />
            <span className={`${collapsed ? 'hidden' : ''}`}>Logout</span>
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white sticky top-0 z-40 shadow-sm border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="w-8 h-8 bg-primary-600 text-white rounded-md flex items-center justify-center font-bold">FM</div>
                <h2 className="text-lg font-semibold text-gray-900">Fleet Management</h2>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* notification bell */}
              <div className="relative" ref={notifRef}>
                <button onClick={openNotif} className="relative p-2 rounded-md text-gray-500 hover:text-gray-700">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1">
                    {pendingCount > 0 ? (
                      <span className="inline-block h-5 min-w-[1.25rem] px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center" aria-label={`${pendingCount} pending requests`}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    ) : unreadCount > 0 ? (
                      <span className="inline-block h-5 min-w-[1.25rem] px-1 rounded-full bg-red-500 text-white text-[10px] leading-5 text-center" aria-label={`${unreadCount} unread notifications`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    ) : (
                      <span className="inline-block h-2 w-2 rounded-full bg-gray-300" aria-label="notification center"></span>
                    )}
                  </span>
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border rounded-md shadow-lg overflow-hidden">
                    <div className="px-3 py-2 border-b">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Notifications</span>
                        <button onClick={markAllRead} className="text-xs text-primary-600 hover:underline">Mark all as read</button>
                      </div>
                      {/* Tabs */}
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => switchTab('all')}
                          className={`px-2 py-1 rounded text-xs border ${notifTab === 'all' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-600 border-gray-200'}`}
                        >
                          All
                        </button>
                        <button
                          onClick={() => switchTab('unread')}
                          className={`px-2 py-1 rounded text-xs border flex items-center gap-1 ${notifTab === 'unread' ? 'bg-primary-50 text-primary-700 border-primary-200' : 'bg-white text-gray-600 border-gray-200'}`}
                        >
                          Unread
                          {unreadCount > 0 && (
                            <span className="ml-1 inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-red-500 text-white text-[10px]">{unreadCount}</span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifLoading ? (
                        <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                      ) : pendingItems.length === 0 && notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">No notifications</div>
                      ) : (
                        <div>
                          {pendingItems.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">Pending</div>
                              {pendingItems.map((p) => (
                                <button
                                  key={`p-${p.type}-${p._id}`}
                                  onClick={() => { navigate(buildLinkWithHighlight(p)); setNotifOpen(false); }}
                                  className="w-full text-left px-3 py-2 border-b last:border-0 hover:bg-gray-50"
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5">{typeIcon(p.type)}</div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                        {p.title}
                                        {(() => {
                                          const st = statusChip(deriveStatus(p));
                                          return st.label ? (
                                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
                                          ) : null;
                                        })()}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-0.5">{p.message}</div>
                                      {buildMetaDetails(p) && (
                                        <div className="text-[10px] text-gray-500 mt-0.5">{buildMetaDetails(p)}</div>
                                      )}
                                      <div className="text-[10px] text-gray-400 mt-1">{timeAgo(p.createdAt)} · {new Date(p.createdAt).toLocaleString()}</div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {notifications.length > 0 && (
                            <div>
                              <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-400">Recent</div>
                              {notifications.map((n) => (
                                <button
                                  key={n._id}
                                  onClick={() => {
                                    if (n.status === 'unread') markOneRead(n._id);
                                    navigate(buildLinkWithHighlight(n));
                                    setNotifOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 border-b last:border-0 hover:bg-gray-50 ${
                                    n.status === 'unread' ? 'bg-primary-50/50' : ''
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    <div className="relative mt-0.5">
                                      {typeIcon(n.type)}
                                      {n.status === 'unread' && (
                                        <span className="absolute -top-0.5 -right-0.5 inline-block h-2 w-2 rounded-full bg-primary-600"></span>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                        {n.title}
                                        {(() => {
                                          const st = statusChip(deriveStatus(n));
                                          return st.label ? (
                                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${st.cls}`}>{st.label}</span>
                                          ) : null;
                                        })()}
                                      </div>
                                      <div className="text-xs text-gray-600 mt-0.5">{n.message}</div>
                                      {buildMetaDetails(n) && (
                                        <div className="text-[10px] text-gray-500 mt-0.5">{buildMetaDetails(n)}</div>
                                      )}
                                      <div className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)} · {new Date(n.createdAt).toLocaleString()}</div>
                                    </div>
                                    {n.status === 'unread' && (
                                      <button onClick={(e) => { e.stopPropagation(); markOneRead(n._id); }} className="text-xs text-primary-600 hover:underline">Mark read</button>
                                    )}
                                  </div>
                                </button>
                              ))}

                              {hasMoreNotifications && (
                                <div className="px-3 py-2">
                                  <button
                                    onClick={loadMoreNotifications}
                                    disabled={notifLoading}
                                    className="w-full text-center text-xs px-3 py-2 rounded border border-gray-200 hover:bg-gray-50 text-gray-700"
                                  >
                                    {notifLoading ? 'Loading…' : 'Load more'}
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
                <button onClick={() => setUserMenuOpen(v => !v)} className="flex items-center gap-2 p-1 rounded-md hover:bg-gray-50">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-primary-600" />
                  </div>
                  <span className="text-sm text-gray-700 hidden sm:inline">{user?.fullName || user?.username}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white border rounded-md shadow-lg py-1">
                    <button onClick={() => { setUserMenuOpen(false); navigate('/settings'); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</button>
                    <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"><LogOut className="h-4 w-4"/>Logout</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6 flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
