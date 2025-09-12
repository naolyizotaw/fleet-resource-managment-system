import React, { useState } from 'react';
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

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const filteredNavigation = navigationItems.filter(item => 
    item.roles.includes(user?.role)
  );

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
              <button className="p-2 rounded-md text-gray-500 hover:text-gray-700">
                <Bell className="h-5 w-5" />
              </button>

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
