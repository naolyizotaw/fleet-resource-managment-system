import React, { useState, useEffect } from 'react';

const PerDiemRequestForm = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    purpose: '',
    destination: '',
    startDate: '',
    endDate: '',
    numberOfDays: 0,
  });

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end > start) {
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setFormData((prev) => ({ ...prev, numberOfDays: diffDays }));
      } else {
        setFormData((prev) => ({ ...prev, numberOfDays: 0 }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.numberOfDays <= 0) {
      alert('End date must be after the start date.');
      return;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-xl w-full max-w-lg">
      <h2 className="text-2xl font-bold mb-6">New Per Diem Request</h2>
      <div className="space-y-4">
        <div>
          <label htmlFor="purpose" className="block text-sm font-medium text-gray-700">Purpose</label>
          <input id="purpose" name="purpose" type="text" value={formData.purpose} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" placeholder="e.g., Client Meeting" />
        </div>
        <div>
          <label htmlFor="destination" className="block text-sm font-medium text-gray-700">Destination</label>
          <input id="destination" name="destination" type="text" value={formData.destination} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" placeholder="e.g., New York" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Start Date</label>
            <input id="startDate" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">End Date</label>
            <input id="endDate" name="endDate" type="date" value={formData.endDate} onChange={handleChange} required className="mt-1 block w-full p-2 border rounded" />
          </div>
        </div>
        <div>
          <p className="text-gray-700">
            <span className="font-medium">Number of Days:</span> {formData.numberOfDays}
          </p>
        </div>
      </div>
      <div className="flex justify-end mt-6">
        <button type="button" onClick={onCancel} className="mr-4 px-4 py-2 bg-gray-300 rounded">Cancel</button>
        <button type="submit" className="px-4 py-2 text-white bg-primary-600 rounded">Submit Request</button>
      </div>
    </form>
  );
};

export default PerDiemRequestForm;
