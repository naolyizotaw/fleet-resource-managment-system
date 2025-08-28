import React, { useState, useEffect } from 'react';

const VehicleForm = ({ onSave, onCancel, vehicle, isEditMode }) => {
  const [formData, setFormData] = useState({
    plateNumber: '',
    type: 'Automobile',
    model: '',
    manufacturer: '',
    year: '',
    fuelType: 'Petrol',
    currentKm: '',
  });

  useEffect(() => {
    if (isEditMode && vehicle) {
      setFormData({
        plateNumber: vehicle.plateNumber || '',
        type: vehicle.type || 'Automobile',
        model: vehicle.model || '',
        manufacturer: vehicle.manufacturer || '',
        year: vehicle.year || '',
        fuelType: vehicle.fuelType || 'Petrol',
        currentKm: vehicle.currentKm || '',
      });
    }
  }, [vehicle, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="plateNumber" value={formData.plateNumber} onChange={handleChange} placeholder="Plate Number" required className="p-2 border rounded" />
        <input name="model" value={formData.model} onChange={handleChange} placeholder="Model" required className="p-2 border rounded" />
        <input name="manufacturer" value={formData.manufacturer} onChange={handleChange} placeholder="Manufacturer" className="p-2 border rounded" />
        <input name="year" type="number" value={formData.year} onChange={handleChange} placeholder="Year" className="p-2 border rounded" />
        <input name="currentKm" type="number" value={formData.currentKm} onChange={handleChange} placeholder="Current Kilometers" required className="p-2 border rounded" />
        <select name="type" value={formData.type} onChange={handleChange} className="p-2 border rounded">
          <option>Automobile</option>
          <option>Light Duty</option>
          <option>Heavy Duty</option>
          <option>Machinery</option>
          <option>Other</option>
        </select>
        <select name="fuelType" value={formData.fuelType} onChange={handleChange} className="p-2 border rounded">
          <option>Petrol</option>
          <option>Diesel</option>
          <option>Electric</option>
          <option>Hybrid</option>
        </select>
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" onClick={onCancel} className="mr-4 px-4 py-2 bg-gray-300 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 text-white bg-primary-600 rounded">{isEditMode ? 'Save Changes' : 'Add Vehicle'}</button>
      </div>
    </form>
  );
};

export default VehicleForm;
