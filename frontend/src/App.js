import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Users from './pages/Users';
import Vehicles from './pages/Vehicles';
import Maintenance from './pages/Maintenance';
import Fuel from './pages/Fuel';
import PerDiem from './pages/PerDiem';
import Logs from './pages/Logs';
import Reports from './pages/Reports';
import News from './pages/News';
import Settings from './pages/Settings';
import Map from './pages/Map';
import Inventory from './pages/Inventory';
import SpareParts from './pages/SpareParts';
import WorkOrders from './pages/WorkOrders';
import Chat from './pages/Chat';

function AppRoutes() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <ChatProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Admin & Manager Routes */}
          <Route path="/users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          } />

          <Route path="/vehicles" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Vehicles />
            </ProtectedRoute>
          } />

          <Route path="/map" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Map />
            </ProtectedRoute>
          } />

          <Route path="/maintenance" element={<Maintenance />} />

          <Route path="/work-orders" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <WorkOrders />
            </ProtectedRoute>
          } />

          <Route path="/fuel" element={<Fuel />} />
          <Route path="/perdiem" element={<PerDiem />} />
          <Route path="/logs" element={<Logs />} />

          <Route path="/reports" element={
            <ProtectedRoute allowedRoles={['admin', 'manager']}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/inventory" element={
            <ProtectedRoute allowedRoles={['admin', 'manager', 'user']}>
              <Inventory />
            </ProtectedRoute>
          } />

          <Route path="/spare-parts" element={<SpareParts />} />

          <Route path="/chat" element={<Chat />} />
          <Route path="/news" element={<News />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </ChatProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
