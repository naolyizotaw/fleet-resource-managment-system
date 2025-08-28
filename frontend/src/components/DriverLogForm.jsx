import React, { useState, useEffect } from 'react';
import api from '../services/api';

const DriverLogForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    vehicleId: '',
    startKm: '',
    endKm: '',
    remarks: '',
  });
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
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
    if (parseInt(formData.endKm) <= parseInt(formData.startKm)) {
      alert('End Km must be greater than Start Km.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-6">Add New Driver Log</h2>
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startKm" className="block text-sm font-medium text-gray-700">Start Km</label>
            <input id="startKm" name="startKm" type="number" value={formData.startKm} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="endKm" className="block text-sm font-medium text-gray-700">End Km</label>
            <input id="endKm" name="endKm" type="number" value={formData.endKm} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" />
          </div>
        </div>
        <div>
          <label htmlFor="remarks" className="block text-sm font-medium text-gray-700">Remarks</label>
          <textarea id="remarks" name="remarks" value={formData.remarks} onChange={handleChange} rows="3" className="mt-1 block w-full p-2 border rounded" placeholder="Any comments..."></textarea>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" onClick={onCancel} className="mr-4 px-4 py-2 bg-gray-300 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 text-white bg-primary-600 rounded">Add Log</button>
      </div>
    </form>
  );
};

export default DriverLogForm;
