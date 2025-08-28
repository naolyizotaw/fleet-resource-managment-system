import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const navLinks = [
  { to: '/dashboard/vehicles', text: 'Vehicles', icon: '🚗', roles: ['admin', 'manager'] },
  { to: '/dashboard/maintenance', text: 'Maintenance', icon: '🛠️', roles: ['admin', 'manager', 'user'] },
  { to: '/dashboard/fuel', text: 'Fuel', icon: '⛽️', roles: ['admin', 'manager', 'user'] },
  { to: '/dashboard/per-diem', text: 'Per Diem', icon: '💵', roles: ['admin', 'manager', 'user'] },
  { to: '/dashboard/logs', text: 'Driver Logs', icon: '📒', roles: ['admin', 'manager', 'user'] },
  { to: '/dashboard/reports', text: 'Reports', icon: '📊', roles: ['admin', 'manager'] },
  { to: '/dashboard/users', text: 'Users', icon: '👥', roles: ['admin'] },
];

const Sidebar = () => {
  const { user } = useContext(AuthContext);

  const activeLinkStyle = {
    backgroundColor: '#1d4ed8', // primary-700
    color: 'white',
  };

  return (
    <div className="hidden lg:flex flex-col w-64 bg-gray-800 text-white">
      <div className="flex items-center justify-center h-20 border-b border-gray-700">
        <h1 className="text-2xl font-bold">FleetFlow</h1>
      </div>
      <nav className="flex-1 px-2 py-4">
        {navLinks.map((link) =>
          link.roles.includes(user?.role) ? (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => (isActive ? activeLinkStyle : undefined)}
              className="flex items-center px-4 py-2 mt-2 text-gray-300 rounded-md hover:bg-gray-700 hover:text-white"
            >
              <span className="mr-3">{link.icon}</span>
              {link.text}
            </NavLink>
          ) : null
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
