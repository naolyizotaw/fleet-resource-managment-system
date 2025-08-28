import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

const Reports = () => {
  const [fuelData, setFuelData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fuelRes, maintenanceRes] = await Promise.all([
          api.get('/fuel'),
          api.get('/maintenance'),
        ]);

        // Process fuel data for chart (cost per month)
        const monthlyFuelCosts = fuelRes.data.reduce((acc, req) => {
          if (req.status === 'approved' && req.cost) {
            const month = new Date(req.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
            acc[month] = (acc[month] || 0) + req.cost;
          }
          return acc;
        }, {});
        setFuelData(Object.entries(monthlyFuelCosts).map(([name, cost]) => ({ name, cost })));

        // Process maintenance data for chart (cost per category)
        const categoryMaintenanceCosts = maintenanceRes.data.reduce((acc, req) => {
            if (req.status === 'completed' && req.cost) {
                const category = req.category;
                acc[category] = (acc[category] || 0) + req.cost;
            }
            return acc;
        }, {});
        setMaintenanceData(Object.entries(categoryMaintenanceCosts).map(([name, cost]) => ({ name, cost })));

      } catch (error) {
        toast.error('Failed to fetch report data.');
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleExport = () => {
    // This functionality requires jspdf and xlsx libraries, which could not be installed.
    toast.error('Export functionality is not available at the moment.');
  }

  if (loading) {
    return <div>Loading reports...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Reports</h2>
        <div>
          <button onClick={handleExport} className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 mr-2">Export Excel</button>
          <button onClick={handleExport} className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">Export PDF</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-4 bg-white rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-4">Monthly Fuel Costs</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fuelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="cost" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-4">Maintenance Costs by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={maintenanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="cost" fill="#82ca9d" />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
