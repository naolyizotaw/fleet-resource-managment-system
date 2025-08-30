import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { maintenanceAPI, fuelAPI, perDiemAPI, logsAPI, vehiclesAPI } from '../services/api';
import { BarChart3, TrendingUp, DollarSign, Fuel, Wrench, FileText, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('month');
  const [reports, setReports] = useState({
    maintenance: [],
    fuel: [],
    perDiem: [],
    logs: [],
    vehicles: [],
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      const [maintenanceRes, fuelRes, perDiemRes, logsRes, vehiclesRes] = await Promise.all([
        maintenanceAPI.getAll(),
        fuelAPI.getAll(),
        perDiemAPI.getAll(),
        logsAPI.getAll(),
        vehiclesAPI.getAll(),
      ]);

      setReports({
        maintenance: maintenanceRes.data,
        fuel: fuelRes.data,
        perDiem: perDiemRes.data,
        logs: logsRes.data,
        vehicles: vehiclesRes.data,
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRangeData = (data, dateField = 'createdAt') => {
    const now = new Date();
    let startDate;
    
    switch (dateRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return data.filter(item => new Date(item[dateField]) >= startDate);
  };

  const getMaintenanceCostData = () => {
    const filteredData = getDateRangeData(reports.maintenance);
    const vehicleCosts = {};
    
    filteredData.forEach(item => {
      if (item.vehicleId && item.estimatedCost) {
        const vehicle = reports.vehicles.find(v => v._id === item.vehicleId);
        const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown';
        vehicleCosts[vehicleName] = (vehicleCosts[vehicleName] || 0) + parseFloat(item.estimatedCost);
      }
    });

    return Object.entries(vehicleCosts).map(([name, cost]) => ({ name, cost }));
  };

  const getFuelConsumptionData = () => {
    const filteredData = getDateRangeData(reports.fuel);
    const vehicleFuel = {};
    
    filteredData.forEach(item => {
      if (item.vehicleId && item.quantity) {
        const vehicle = reports.vehicles.find(v => v._id === item.vehicleId);
        const vehicleName = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : 'Unknown';
        vehicleFuel[vehicleName] = (vehicleFuel[vehicleName] || 0) + parseFloat(item.quantity);
      }
    });

    return Object.entries(vehicleFuel).map(([name, quantity]) => ({ name, quantity }));
  };

  const getPerDiemData = () => {
    const filteredData = getDateRangeData(reports.perDiem);
    const monthlyCosts = {};
    
    filteredData.forEach(item => {
      if (item.amount) {
        const month = new Date(item.tripDate || item.createdAt).toLocaleDateString('en-US', { month: 'short' });
        monthlyCosts[month] = (monthlyCosts[month] || 0) + parseFloat(item.amount);
      }
    });

    return Object.entries(monthlyCosts).map(([month, amount]) => ({ month, amount }));
  };

  const getRequestStatusData = () => {
    const maintenanceStatus = reports.maintenance.reduce((acc, item) => {
      acc[item.status || 'pending'] = (acc[item.status || 'pending'] || 0) + 1;
      return acc;
    }, {});

    const fuelStatus = reports.fuel.reduce((acc, item) => {
      acc[item.status || 'pending'] = (acc[item.status || 'pending'] || 0) + 1;
      return acc;
    }, {});

    const perDiemStatus = reports.perDiem.reduce((acc, item) => {
      acc[item.status || 'pending'] = (acc[item.status || 'pending'] || 0) + 1;
      return acc;
    }, {});

    return [
      { name: 'Maintenance', ...maintenanceStatus },
      { name: 'Fuel', ...fuelStatus },
      { name: 'Per Diem', ...perDiemStatus },
    ];
  };

  const getSummaryStats = () => {
    const filteredMaintenance = getDateRangeData(reports.maintenance);
    const filteredFuel = getDateRangeData(reports.fuel);
    const filteredPerDiem = getDateRangeData(reports.perDiem);
    const filteredLogs = getDateRangeData(reports.logs, 'date');

    const totalMaintenanceCost = filteredMaintenance.reduce((sum, item) => sum + (parseFloat(item.estimatedCost) || 0), 0);
    const totalFuelCost = filteredFuel.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
    const totalPerDiemCost = filteredPerDiem.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalDistance = filteredLogs.reduce((sum, item) => {
      const distance = (parseFloat(item.endOdometer) || 0) - (parseFloat(item.startOdometer) || 0);
      return sum + (distance > 0 ? distance : 0);
    }, 0);

    return {
      totalMaintenanceCost: totalMaintenanceCost.toFixed(2),
      totalFuelCost: totalFuelCost.toFixed(2),
      totalPerDiemCost: totalPerDiemCost.toFixed(2),
      totalDistance: totalDistance.toFixed(1),
      totalCost: (totalMaintenanceCost + totalFuelCost + totalPerDiemCost).toFixed(2),
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const summaryStats = getSummaryStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Comprehensive insights into fleet operations</p>
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field"
          >
            <option value="week">Last Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Costs</p>
              <p className="text-2xl font-bold text-gray-900">${summaryStats.totalCost}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wrench className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Maintenance</p>
              <p className="text-2xl font-bold text-gray-900">${summaryStats.totalMaintenanceCost}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Fuel className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Fuel Costs</p>
              <p className="text-2xl font-bold text-gray-900">${summaryStats.totalFuelCost}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Distance</p>
              <p className="text-2xl font-bold text-gray-900">{summaryStats.totalDistance} km</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Costs by Vehicle */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Maintenance Costs by Vehicle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getMaintenanceCostData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Cost']} />
              <Bar dataKey="cost" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fuel Consumption by Vehicle */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fuel Consumption by Vehicle</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getFuelConsumptionData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => [`${value}L`, 'Quantity']} />
              <Bar dataKey="quantity" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per Diem Costs by Month */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Per Diem Costs by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getPerDiemData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              <Bar dataKey="amount" fill="#F59E0B" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Request Status Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getRequestStatusData()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pending" fill="#F59E0B" />
              <Bar dataKey="approved" fill="#10B981" />
              <Bar dataKey="rejected" fill="#EF4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vehicles by Cost */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Vehicles by Maintenance Cost</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getMaintenanceCostData()
                  .sort((a, b) => b.cost - a.cost)
                  .slice(0, 5)
                  .map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">${item.cost.toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[...reports.maintenance, ...reports.fuel, ...reports.perDiem]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {item.description || item.notes || 'Request'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'approved' ? 'bg-green-100 text-green-800' :
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
