import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';

/**
 * Get colors based on vehicle status
 * @param {string} status - Vehicle status
 * @returns {Object} Color configuration
 */
const getStatusColors = (status) => {
  switch (status) {
    case 'active':
      return {
        primary: '#10B981',
        secondary: '#059669',
        glow: 'rgba(16, 185, 129, 0.4)',
        pulse: true
      };
    case 'under_maintenance':
      return {
        primary: '#F59E0B',
        secondary: '#D97706',
        glow: 'rgba(245, 158, 11, 0.4)',
        pulse: false
      };
    case 'inactive':
      return {
        primary: '#EF4444',
        secondary: '#DC2626',
        glow: 'rgba(239, 68, 68, 0.4)',
        pulse: false
      };
    default:
      return {
        primary: '#6B7280',
        secondary: '#4B5563',
        glow: 'rgba(107, 114, 128, 0.4)',
        pulse: false
      };
  }
};

/**
 * Creates a custom truck marker icon based on vehicle status
 * @param {string} status - Vehicle status (active, under_maintenance, inactive)
 * @param {boolean} hasLocation - Whether vehicle has location data
 * @param {boolean} isHighlighted - Whether the marker is highlighted (from search)
 * @returns {L.DivIcon} Custom Leaflet icon
 */
const createMarkerIcon = (status, hasLocation, isHighlighted = false) => {
  const colors = hasLocation ? getStatusColors(status) : getStatusColors('default');

  // Highlight ring color (blue glow)
  const highlightRing = isHighlighted ? `
    <div style="
      position: absolute;
      top: -4px;
      left: -4px;
      width: 56px;
      height: 56px;
      border: 3px solid #3B82F6;
      border-radius: 50%;
      animation: highlightPulse 1s ease-in-out infinite;
      box-shadow: 0 0 20px rgba(59, 130, 246, 0.6);
    "></div>
  ` : '';

  // Bounce animation for highlighted markers
  const bounceStyle = isHighlighted ? 'animation: bounce 0.6s ease-in-out 3;' : '';

  // Modern truck icon marker with gradient background
  const svgIcon = `
    <div style="position: relative; width: 48px; height: 56px; ${bounceStyle}">
      ${highlightRing}
      ${colors.pulse && !isHighlighted ? `
        <div style="
          position: absolute;
          top: 4px;
          left: 4px;
          width: 40px;
          height: 40px;
          background: ${colors.glow};
          border-radius: 50%;
          animation: pulse 2s infinite;
        "></div>
      ` : ''}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 56" width="48" height="56" style="position: relative; z-index: 2;">
        <!-- Drop shadow -->
        <defs>
          <filter id="shadow-${status}-${isHighlighted ? 'hl' : 'normal'}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="${isHighlighted ? '5' : '3'}" flood-color="${isHighlighted ? '#3B82F6' : '#000'}" flood-opacity="${isHighlighted ? '0.5' : '0.3'}"/>
          </filter>
          <linearGradient id="grad-${status}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${colors.primary};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${colors.secondary};stop-opacity:1" />
          </linearGradient>
        </defs>
        
        <!-- Marker body -->
        <path 
          d="M24 4 C14 4 6 12 6 22 C6 35 24 52 24 52 C24 52 42 35 42 22 C42 12 34 4 24 4 Z" 
          fill="url(#grad-${status})" 
          stroke="${isHighlighted ? '#3B82F6' : '#ffffff'}" 
          stroke-width="${isHighlighted ? '3' : '2'}"
          filter="url(#shadow-${status}-${isHighlighted ? 'hl' : 'normal'})"
        />
        
        <!-- Truck icon inside -->
        <g transform="translate(12, 10)">
          <!-- Truck body -->
          <rect x="0" y="8" width="16" height="10" rx="1" fill="#ffffff"/>
          <!-- Truck cabin -->
          <path d="M16 8 L16 18 L22 18 L22 12 L19 8 Z" fill="#ffffff"/>
          <!-- Truck window -->
          <rect x="17" y="10" width="4" height="4" rx="0.5" fill="${colors.primary}"/>
          <!-- Wheels -->
          <circle cx="5" cy="19" r="2.5" fill="${colors.secondary}"/>
          <circle cx="5" cy="19" r="1" fill="#ffffff"/>
          <circle cx="18" cy="19" r="2.5" fill="${colors.secondary}"/>
          <circle cx="18" cy="19" r="1" fill="#ffffff"/>
        </g>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.3); opacity: 0.5; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes highlightPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
      }
    </style>
  `;

  return L.divIcon({
    className: `custom-truck-marker ${isHighlighted ? 'highlighted' : ''}`,
    html: svgIcon,
    iconSize: [48, 56],
    iconAnchor: [24, 56],
    popupAnchor: [0, -50],
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
 * @param {boolean} props.isHighlighted - Whether this marker is highlighted (from search selection)
 */
const VehicleMapMarker = ({ vehicle, isHighlighted = false }) => {
  const navigate = useNavigate();

  const hasLocation = vehicle.location?.lat != null && vehicle.location?.lng != null;

  // If no location, don't render marker
  if (!hasLocation) {
    return null;
  }

  const position = [vehicle.location.lat, vehicle.location.lng];
  const icon = createMarkerIcon(vehicle.status, hasLocation, isHighlighted);

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

            {/* Online Status Indicator */}
            <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GPS Status</span>
              <div className="flex items-center gap-2">
                {(() => {
                  if (!vehicle.lastLocationUpdate) {
                    return (
                      <>
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        <span className="text-xs font-bold text-gray-600">No Data</span>
                      </>
                    );
                  }
                  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
                  const isOnline = new Date(vehicle.lastLocationUpdate) > fiveMinutesAgo;

                  return isOnline ? (
                    <>
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold text-emerald-600">Online</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-xs font-bold text-gray-600">Offline</span>
                    </>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Updated</span>
              <span className="text-sm font-medium text-gray-600">
                {formatDate(vehicle.lastLocationUpdate || vehicle.location?.updatedAt)}
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

