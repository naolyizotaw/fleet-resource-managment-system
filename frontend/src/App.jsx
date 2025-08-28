import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginPage from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';

import Maintenance from './pages/Maintenance';
import Fuel from './pages/Fuel';

// Placeholder for the actual dashboard pages
const DashboardHome = () => <h2>Dashboard Home</h2>;
const Vehicles = () => <h2>Vehicles</h2>;
const PerDiem = () => <h2>Per Diem</h2>;
const DriverLogs = () => <h2>Driver Logs</h2>;
const Reports = () => <h2>Reports</h2>;
const Users = () => <h2>Users</h2>;


// A simple component to handle root URL redirection
const Root = () => {
  const { user, loading } = React.useContext(AuthContext);

  if (loading) {
    return <div>Loading...</div>;
  }

  return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/dashboard" element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="vehicles" element={<Vehicles />} />
              <Route path="maintenance" element={<Maintenance />} />
              <Route path="fuel" element={<Fuel />} />
              <Route path="per-diem" element={<PerDiem />} />
              <Route path="logs" element={<DriverLogs />} />
              <Route path="reports" element={<Reports />} />
              <Route path="users" element={<Users />} />
            </Route>
          </Route>

          <Route path="/" element={<Root />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
