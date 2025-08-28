import React, { useState, useEffect } from 'react';
import api from '../services/api';

const MaintenanceRequestForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    category: 'Engine',
    description: '',
  });
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    // Fetch vehicles to populate the dropdown
    const fetchVehicles = async () => {
      try {
        const response = await api.get('/vehicles');
        setVehicles(response.data);
        if (response.data.length > 0) {
          setFormData((prev) => ({ ...prev, vehicleId: response.data[0]._id }));
        }
      } catch (error) {
        console.error('Failed to fetch vehicles for form', error);
      }
    };
    fetchVehicles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.vehicleId) {
      alert('Please select a vehicle.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-6">New Maintenance Request</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="vehicleId" className="block text-sm font-medium text-gray-700">Vehicle</label>
          <select id="vehicleId" name="vehicleId" value={formData.vehicleId} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded">
            <option value="" disabled>Select a vehicle</option>
            {vehicles.map((v) => (
              <option key={v._id} value={v._id}>{v.plateNumber} - {v.model}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
          <select id="category" name="category" value={formData.category} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded">
            <option>Engine</option>
            <option>Tires & Wheels</option>
            <option>Brakes</option>
            <option>Electrical</option>
            <option>Cargo</option>
            <option>Machinery</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows="4" className="mt-1 block w-full p-2 border rounded" placeholder="Describe the issue..."></textarea>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" onClick={onCancel} className="mr-4 px-4 py-2 bg-gray-300 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 text-white bg-primary-600 rounded">Submit Request</button>
      </div>
    </form>
  );
};

export default MaintenanceRequestForm;
