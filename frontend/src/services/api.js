import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: 'http://localhost:7001', // Update this to match your backend port
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/api/users'),
  getDrivers: () => api.get('/api/users/drivers'),
  update: (id, userData) => api.put(`/api/users/${id}`, userData),
  resetPassword: (id, body) => api.put(`/api/users/${id}/password`, body),
  delete: (id) => api.delete(`/api/users/${id}`),
  getMe: () => api.get('/api/users/me'),
};

// Vehicles API
export const vehiclesAPI = {
  getAll: () => api.get('/api/vehicles'),
  getMine: () => api.get('/api/vehicles/mine'),
  getById: (id) => api.get(`/api/vehicles/${id}`),
  create: (vehicleData) => api.post('/api/vehicles', vehicleData),
  update: (id, vehicleData) => api.put(`/api/vehicles/${id}`, vehicleData),
  delete: (id) => api.delete(`/api/vehicles/${id}`),
  // Map feature endpoints (Phase 1)
  getLocations: () => api.get('/api/vehicles/locations'),
  updateLocation: (id, locationData) => api.put(`/api/vehicles/${id}/location`, locationData),
};

// Maintenance API
export const maintenanceAPI = {
  getAll: () => api.get('/api/maintenance'),
  getById: (id) => api.get(`/api/maintenance/${id}`),
  getMyRequests: () => api.get('/api/maintenance/my'),
  create: (maintenanceData) => api.post('/api/maintenance', maintenanceData),
  update: (id, maintenanceData) => api.patch(`/api/maintenance/${id}`, maintenanceData),
  delete: (id) => api.delete(`/api/maintenance/${id}`),
};

// Fuel API
export const fuelAPI = {
  getAll: () => api.get('/api/fuel'),
  getById: (id) => api.get(`/api/fuel/${id}`),
  getMyRequests: () => api.get('/api/fuel/my'),
  create: (fuelData) => api.post('/api/fuel', fuelData),
  update: (id, fuelData) => api.put(`/api/fuel/${id}`, fuelData),
  delete: (id) => api.delete(`/api/fuel/${id}`),
};

// Per Diem API
export const perDiemAPI = {
  getAll: () => api.get('/api/per-diem'),
  getById: (id) => api.get(`/api/per-diem/${id}`),
  getMyRequests: () => api.get('/api/per-diem/my'),
  create: (perDiemData) => api.post('/api/per-diem', perDiemData),
  update: (id, perDiemData) => api.put(`/api/per-diem/${id}`, perDiemData),
  delete: (id) => api.delete(`/api/per-diem/${id}`),
};

// Logs API
export const logsAPI = {
  getAll: () => api.get('/api/logs'),
  getById: (id) => api.get(`/api/logs/${id}`),
  getMyLogs: () => api.get('/api/logs/my'),
  getByVehicle: (vehicleId) => api.get(`/api/logs/vehicle/${vehicleId}`),
  create: (logData) => api.post('/api/logs', logData),
  update: (id, logData) => api.put(`/api/logs/${id}`, logData),
  delete: (id) => api.delete(`/api/logs/${id}`),
};

// News API
export const newsAPI = {
  getAll: (params) => api.get('/api/news', { params }),
  getRecent: () => api.get('/api/news/recent'),
  getById: (id) => api.get(`/api/news/${id}`),
  create: (newsData) => api.post('/api/news', newsData),
  update: (id, newsData) => api.put(`/api/news/${id}`, newsData),
  toggleActive: (id) => api.patch(`/api/news/${id}/toggle`),
  delete: (id) => api.delete(`/api/news/${id}`),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/api/inventory', { params }),
  getById: (id) => api.get(`/api/inventory/${id}`),
  getStats: () => api.get('/api/inventory/stats'),
  getLowStock: () => api.get('/api/inventory/low-stock'),
  getHistory: (id) => api.get(`/api/inventory/${id}/history`),
  create: (inventoryData) => api.post('/api/inventory', inventoryData),
  update: (id, inventoryData) => api.put(`/api/inventory/${id}`, inventoryData),
  adjustStock: (id, adjustmentData) => api.patch(`/api/inventory/${id}/adjust`, adjustmentData),
  delete: (id) => api.delete(`/api/inventory/${id}`),
};

// Spare Parts Request API
export const sparePartsAPI = {
  create: (data) => api.post('/api/spare-parts', data),
  getAll: () => api.get('/api/spare-parts'),
  getMyRequests: () => api.get('/api/spare-parts/my-requests'),
  updateStatus: (id, data) => api.put(`/api/spare-parts/${id}/status`, data),
  delete: (id) => api.delete(`/api/spare-parts/${id}`),
};

export default api;
