import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

/**
 * Creates a custom colored marker icon based on vehicle status
 * @param {string} status - Vehicle status (active, under_maintenance, inactive)
 * @param {boolean} hasLocation - Whether vehicle has location data
 * @returns {L.DivIcon} Custom Leaflet icon
 */
const createMarkerIcon = (status, hasLocation) => {
  let color = '#6B7280'; // gray - no location
  
  if (hasLocation) {
    switch (status) {
      case 'active':
        color = '#10B981'; // green
        break;
      case 'under_maintenance':
        color = '#F59E0B'; // orange
        break;
      case 'inactive':
        color = '#EF4444'; // red
        break;
      default:
        color = '#6B7280'; // gray
    }
  }

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <path fill="${color}" stroke="#ffffff" stroke-width="1" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle cx="12" cy="9" r="3" fill="#ffffff"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-marker-icon',
    html: svgIcon,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
const formatDate = (date) => {
  if (!date) return 'Never';
  try {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown';
  }
};

/**
 * Get status badge styling
 * @param {string} status - Vehicle status
 * @returns {Object} Tailwind classes for badge
 */
const getStatusBadge = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'under_maintenance':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

/**
 * VehicleMapMarker Component
 * Renders a marker on the map for a vehicle with popup showing details
 * 
 * @param {Object} props
 * @param {Object} props.vehicle - Vehicle data object
 */
const VehicleMapMarker = ({ vehicle }) => {
  const navigate = useNavigate();
  
  const hasLocation = vehicle.location?.lat != null && vehicle.location?.lng != null;
  
  // If no location, don't render marker
  if (!hasLocation) {
    return null;
  }
  
  const position = [vehicle.location.lat, vehicle.location.lng];
  const icon = createMarkerIcon(vehicle.status, hasLocation);
  
  const handleViewDetails = () => {
    navigate(`/vehicles?highlight=${vehicle._id}`);
  };
  
  return (
    <Marker position={position} icon={icon}>
      <Popup className="vehicle-popup" maxWidth={320} minWidth={280}>
        <div className="p-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">
              {vehicle.plateNumber}
            </h3>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${getStatusBadge(vehicle.status)}`}>
              {vehicle.status?.replace('_', ' ') || 'Unknown'}
            </span>
          </div>
          
          {/* Details Grid */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Model</span>
              <span className="text-sm font-bold text-gray-800">{vehicle.model || 'N/A'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</span>
              <span className="text-sm font-bold text-gray-800">
                {vehicle.assignedDriver?.fullName || 'Unassigned'}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Current KM</span>
              <span className="text-sm font-bold text-gray-800">
                {vehicle.currentKm?.toLocaleString() || '0'} km
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</span>
              <span className="text-sm font-medium text-gray-600">
                {formatDate(vehicle.location?.updatedAt)}
              </span>
            </div>
            
            {/* Coordinates */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Coordinates</span>
                <span className="text-xs font-mono text-gray-600">
                  {vehicle.location.lat.toFixed(4)}, {vehicle.location.lng.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action Button */}
          <button
            onClick={handleViewDetails}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

export default VehicleMapMarker;

