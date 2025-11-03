import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { maintenanceAPI, fuelAPI, perDiemAPI, logsAPI, vehiclesAPI } from '../services/api';
import { BarChart3, TrendingUp, DollarSign, Fuel, Wrench, FileText, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadialBarChart, RadialBar } from 'recharts';

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

  const formatNumber = (num) => {
    return num?.toLocaleString() || '';
  };  const getMaintenanceCostData = () => {
    const filteredData = getDateRangeData(reports.maintenance);
    const vehicleCosts = {};
    
    filteredData.forEach(item => {
      if (item.vehicleId) {
        // Handle both populated vehicleId (object) and string ID
        const vehicleId = typeof item.vehicleId === 'object' ? item.vehicleId._id : item.vehicleId;
        const vehicleObj = typeof item.vehicleId === 'object' ? item.vehicleId : reports.vehicles.find(v => v._id === vehicleId);
        
        const vehicleName = vehicleObj 
          ? `${vehicleObj.year || ''} ${vehicleObj.manufacturer || vehicleObj.make || ''} ${vehicleObj.model || ''}`.trim() 
          : 'Unknown Vehicle';
        
        // Use actual cost if available, otherwise use estimated cost
        const cost = parseFloat(item.cost) || parseFloat(item.estimatedCost) || 0;
        vehicleCosts[vehicleName] = (vehicleCosts[vehicleName] || 0) + cost;
      }
    });

    return Object.entries(vehicleCosts).map(([name, cost]) => ({ name, cost }));
  };

  const getFuelConsumptionData = () => {
    const filteredData = getDateRangeData(reports.fuel);
    const vehicleFuel = {};
    
    filteredData.forEach(item => {
      if (item.vehicleId && item.quantity) {
        // Handle both populated vehicleId (object) and string ID
        const vehicleId = typeof item.vehicleId === 'object' ? item.vehicleId._id : item.vehicleId;
        const vehicleObj = typeof item.vehicleId === 'object' ? item.vehicleId : reports.vehicles.find(v => v._id === vehicleId);
        
        const vehicleName = vehicleObj 
          ? `${vehicleObj.year || ''} ${vehicleObj.manufacturer || vehicleObj.make || ''} ${vehicleObj.model || ''}`.trim() 
          : 'Unknown Vehicle';
        
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

    const totalMaintenanceCost = filteredMaintenance.reduce((sum, item) => {
      // Use actual cost if available, otherwise use estimated cost
      const cost = parseFloat(item.cost) || parseFloat(item.estimatedCost) || 0;
      return sum + cost;
    }, 0);
    const totalFuelCost = filteredFuel.reduce((sum, item) => sum + (parseFloat(item.cost) || 0), 0);
    const totalPerDiemCost = filteredPerDiem.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const totalDistance = filteredLogs.reduce((sum, item) => {
      const distance = (parseFloat(item.endOdometer) || 0) - (parseFloat(item.startOdometer) || 0);
      return sum + (distance > 0 ? distance : 0);
    }, 0);

    return {
      totalMaintenanceCost: formatNumber(totalMaintenanceCost.toFixed(2)),
      totalFuelCost: formatNumber(totalFuelCost.toFixed(2)),
      totalPerDiemCost: formatNumber(totalPerDiemCost.toFixed(2)),
      totalDistance: totalDistance.toFixed(1),
      totalCost: formatNumber((totalMaintenanceCost + totalFuelCost + totalPerDiemCost).toFixed(2)),
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Loading Reports...</p>
        </div>
      </div>
    );
  }

  const summaryStats = getSummaryStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-lg p-5 shadow-lg overflow-hidden border border-white/10">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        </div>
        
        <div className="relative">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-0.5 h-5 bg-primary-500 rounded-full"></div>
                <span className="text-[10px] uppercase tracking-widest font-black text-white/70">Analytics Dashboard</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tight leading-none mb-2">
                Fleet Reports
              </h1>
              <div className="flex items-center gap-3 text-white/60">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold">Live Data</span>
                </div>
                <div className="w-px h-3 bg-white/20"></div>
                <span className="text-xs font-bold">Real-time Analytics</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                <Calendar className="h-3.5 w-3.5 text-white/70" />
                <span className="text-xs text-white font-bold uppercase tracking-wide">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="pl-3 pr-9 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold uppercase tracking-wide rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 appearance-none cursor-pointer transition-all shadow-lg"
                >
                  <option value="week" className="text-gray-900">Last Week</option>
                  <option value="month" className="text-gray-900">This Month</option>
                  <option value="quarter" className="text-gray-900">This Quarter</option>
                  <option value="year" className="text-gray-900">This Year</option>
                </select>
                <Filter className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-white pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="group relative bg-white border-l-4 border-blue-600 rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-600 transition-all">
                <DollarSign className="h-5 w-5 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-widest rounded">Total</div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Costs</p>
            <p className="text-2xl font-black text-gray-900 mb-0.5">ETB {summaryStats.totalCost}</p>
            <p className="text-[10px] text-gray-500 font-semibold">All expenses</p>
          </div>
        </div>

        <div className="group relative bg-white border-l-4 border-green-600 rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-green-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-all">
                <Wrench className="h-5 w-5 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <div className="px-2 py-0.5 bg-green-100 text-green-700 text-[9px] font-black uppercase tracking-widest rounded">Repairs</div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Maintenance</p>
            <p className="text-2xl font-black text-gray-900 mb-0.5">ETB {summaryStats.totalMaintenanceCost}</p>
            <p className="text-[10px] text-gray-500 font-semibold">Repairs & services</p>
          </div>
        </div>

        <div className="group relative bg-white border-l-4 border-purple-600 rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-purple-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-600 transition-all">
                <Fuel className="h-5 w-5 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black uppercase tracking-widest rounded">Fuel</div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Fuel Costs</p>
            <p className="text-2xl font-black text-gray-900 mb-0.5">ETB {summaryStats.totalFuelCost}</p>
            <p className="text-[10px] text-gray-500 font-semibold">Fuel expenses</p>
          </div>
        </div>

        <div className="group relative bg-white border-l-4 border-indigo-600 rounded-lg shadow-md p-4 hover:shadow-lg transition-all cursor-pointer overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-all">
                <TrendingUp className="h-5 w-5 text-indigo-600 group-hover:text-white transition-colors" />
              </div>
              <div className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded">Distance</div>
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Distance</p>
            <p className="text-2xl font-black text-gray-900 mb-0.5">{summaryStats.totalDistance} km</p>
            <p className="text-[10px] text-gray-500 font-semibold">Distance traveled</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Maintenance Costs by Vehicle - Donut Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-primary-600"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Cost Breakdown</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Maintenance Costs Distribution</h3>
          </div>
          {getMaintenanceCostData().length > 0 ? (
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <defs>
                    {getMaintenanceCostData().map((entry, index) => (
                      <linearGradient key={`gradient-${index}`} id={`maintenanceGradient${index}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.7} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Pie
                    data={getMaintenanceCostData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="cost"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  >
                    {getMaintenanceCostData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#maintenanceGradient${index})`} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`ETB ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Cost']}
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: 'none', 
                      borderRadius: '12px', 
                      padding: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                <p className="text-3xl font-black text-gray-900">
                  {getMaintenanceCostData().reduce((sum, item) => sum + item.cost, 0).toFixed(0)}
                </p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">ETB Total</p>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No maintenance data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Fuel Consumption - Area Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-green-500"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Consumption Trend</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Fuel Consumption Overview</h3>
          </div>
          {getFuelConsumptionData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getFuelConsumptionData()}>
                <defs>
                  <linearGradient id="fuelAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#9ca3af" 
                  fontSize={10}
                  fontWeight="600"
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={11}
                  fontWeight="600"
                  tickFormatter={(value) => `${value}L`}
                />
                <Tooltip 
                  formatter={(value) => [`${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} Liters`, 'Consumption']}
                  contentStyle={{ 
                    backgroundColor: '#065f46', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontWeight: 'bold'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="quantity" 
                  stroke="#059669" 
                  strokeWidth={3}
                  fill="url(#fuelAreaGradient)" 
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Fuel className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No fuel data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Per Diem Costs - Area Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-yellow-500"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Monthly Trend</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Per Diem Expenses</h3>
          </div>
          {getPerDiemData().length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={getPerDiemData()}>
                <defs>
                  <linearGradient id="perdiemAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  stroke="#9ca3af" 
                  fontSize={11}
                  fontWeight="600"
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={11}
                  fontWeight="600"
                  tickFormatter={(value) => `${value.toLocaleString()}`}
                />
                <Tooltip 
                  formatter={(value) => [`ETB ${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'Amount']}
                  contentStyle={{ 
                    backgroundColor: '#92400e', 
                    border: 'none', 
                    borderRadius: '12px', 
                    padding: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                    color: '#fff',
                    fontWeight: 'bold'
                  }}
                  labelStyle={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#d97706" 
                  strokeWidth={3}
                  fill="url(#perdiemAreaGradient)" 
                  dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
                  activeDot={{ r: 7, fill: '#d97706', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <div className="text-center">
                <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No per diem data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Request Status Distribution - Donut Chart */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-primary-600"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Status Overview</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Request Status Distribution</h3>
          </div>
          {(() => {
            const statusData = getRequestStatusData();
            const allStatuses = statusData.flatMap(item => 
              ['pending', 'approved', 'rejected'].map(status => ({
                name: status.charAt(0).toUpperCase() + status.slice(1),
                value: item[status] || 0,
                category: item.name
              }))
            ).filter(item => item.value > 0);
            
            const statusColors = {
              'Pending': '#f59e0b',
              'Approved': '#10b981',
              'Rejected': '#ef4444'
            };
            
            return allStatuses.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allStatuses}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {allStatuses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusColors[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [`${value} requests`, props.payload.name]}
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: 'none', 
                        borderRadius: '12px', 
                        padding: '12px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                        color: '#fff',
                        fontWeight: 'bold'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <p className="text-3xl font-black text-gray-900">{allStatuses.reduce((sum, item) => sum + item.value, 0)}</p>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total</p>
                </div>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-semibold">No status data available</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Vehicles by Cost - Horizontal Progress Bars */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-primary-600"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Top Performers</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Highest Maintenance Costs</h3>
          </div>
          {getMaintenanceCostData().length > 0 ? (
            <div className="space-y-4">
              {getMaintenanceCostData()
                .sort((a, b) => b.cost - a.cost)
                .slice(0, 5)
                .map((item, index) => {
                  const maxCost = Math.max(...getMaintenanceCostData().map(d => d.cost));
                  const percentage = (item.cost / maxCost) * 100;
                  const barColors = ['bg-blue-600', 'bg-green-600', 'bg-purple-600', 'bg-orange-600', 'bg-pink-600'];
                  const bgColors = ['bg-blue-100', 'bg-green-100', 'bg-purple-100', 'bg-orange-100', 'bg-pink-100'];
                  
                  return (
                    <div key={index} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 ${bgColors[index % bgColors.length]} rounded flex items-center justify-center`}>
                            <span className="text-xs font-black text-gray-700">{index + 1}</span>
                          </div>
                          <span className="text-sm font-bold text-gray-900">{item.name}</span>
                        </div>
                        <span className="text-sm font-black text-gray-900">ETB {item.cost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                      </div>
                      <div className={`h-3 ${bgColors[index % bgColors.length]} rounded-full overflow-hidden`}>
                        <div 
                          className={`h-full ${barColors[index % barColors.length]} rounded-full transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm font-semibold">No maintenance cost data available</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-8 bg-primary-600"></div>
              <span className="text-xs uppercase tracking-widest font-bold text-gray-500">Activity Feed</span>
            </div>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Recent Activity</h3>
          </div>
          <div className="space-y-3">
            {[...reports.maintenance, ...reports.fuel, ...reports.perDiem]
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map((item, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-primary-50 border-2 border-transparent hover:border-primary-200 transition-all group">
                  <div className="w-3 h-3 bg-primary-600 rounded-full group-hover:scale-125 transition-transform"></div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 mb-1">
                      {item.description || item.notes || 'Request'}
                    </p>
                    <p className="text-xs text-gray-500 uppercase tracking-wide">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1.5 text-xs font-black rounded-full uppercase tracking-wide ${
                    item.status === 'approved' ? 'bg-green-100 text-green-800' :
                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            {[...reports.maintenance, ...reports.fuel, ...reports.perDiem].length === 0 && (
              <div className="py-12 text-center text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-semibold">No recent activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
