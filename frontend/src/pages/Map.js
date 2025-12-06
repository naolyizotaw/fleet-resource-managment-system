import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import { useAuth } from '../contexts/AuthContext';
import useFetchVehicleLocations from '../hooks/useFetchVehicleLocations';
import VehicleMapMarker from '../components/VehicleMapMarker';
import { MapPin, RefreshCw, AlertTriangle, Truck, Map as MapIcon } from 'lucide-react';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Ethiopia center coordinates
const ETHIOPIA_CENTER = [9.03, 38.74];
const DEFAULT_ZOOM = 7;

/**
 * Map Page Component
 * Displays a map with all vehicle locations for admin and manager users
 */
const Map = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: vehicles, loading, error, refetch } = useFetchVehicleLocations();

  // Redirect drivers to dashboard
  useEffect(() => {
    if (user?.role === 'driver') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Compute vehicle statistics
  const stats = useMemo(() => {
    const total = vehicles.length;
    const withLocation = vehicles.filter(v => v.location?.lat != null && v.location?.lng != null).length;
    const active = vehicles.filter(v => v.status === 'active').length;
    const underMaintenance = vehicles.filter(v => v.status === 'under_maintenance').length;
    const inactive = vehicles.filter(v => v.status === 'inactive').length;
    const noLocation = total - withLocation;
    
    return { total, withLocation, active, underMaintenance, inactive, noLocation };
  }, [vehicles]);

  // If user is driver, don't render (redirect handles navigation)
  if (user?.role === 'driver') {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                <MapIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  Fleet Map Overview
                </h1>
                <p className="text-sm text-gray-500 font-medium">
                  Track all vehicles visually — Phase 1 (manual location updates)
                </p>
              </div>
            </div>
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh Map'}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Truck className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-lg font-black text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">On Map</p>
                <p className="text-lg font-black text-emerald-600">{stats.withLocation}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-green-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Active</p>
                <p className="text-lg font-black text-green-600">{stats.active}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-orange-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Maintenance</p>
                <p className="text-lg font-black text-orange-600">{stats.underMaintenance}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Inactive</p>
                <p className="text-lg font-black text-red-600">{stats.inactive}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">No Location</p>
                <p className="text-lg font-black text-gray-600">{stats.noLocation}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-gray-100 relative min-h-[500px]">
        {/* Loading State */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[1000] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <p className="text-sm font-bold text-gray-600">Loading vehicle locations...</p>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && !loading && (
          <div className="absolute inset-0 bg-white z-[1000] flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Failed to Load Map Data</h3>
              <p className="text-sm text-gray-600 mb-4">{error}</p>
              <button
                onClick={refetch}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
            </div>
          </div>
        )}
        
        {/* No Vehicles State */}
        {!loading && !error && vehicles.length === 0 && (
          <div className="absolute inset-0 bg-white z-[1000] flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Vehicles Found</h3>
              <p className="text-sm text-gray-600 mb-4">
                There are no vehicles in the system yet. Add vehicles to see them on the map.
              </p>
              <button
                onClick={() => navigate('/vehicles')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                <Truck className="h-4 w-4" />
                Go to Vehicles
              </button>
            </div>
          </div>
        )}
        
        {/* No Vehicles with Location State */}
        {!loading && !error && vehicles.length > 0 && stats.withLocation === 0 && (
          <div className="absolute inset-0 bg-white/95 z-[1000] flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No Location Data</h3>
              <p className="text-sm text-gray-600 mb-4">
                {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} found, but none have location data yet. 
                Update vehicle locations to see them on the map.
              </p>
              <button
                onClick={() => navigate('/vehicles')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
              >
                <Truck className="h-4 w-4" />
                Manage Vehicles
              </button>
            </div>
          </div>
        )}

        {/* Leaflet Map */}
        <MapContainer
          center={ETHIOPIA_CENTER}
          zoom={DEFAULT_ZOOM}
          zoomControl={false}
          className="h-full w-full"
          style={{ minHeight: '500px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="topright" />
          
          {/* Render vehicle markers */}
          {vehicles.map((vehicle) => (
            <VehicleMapMarker key={vehicle._id} vehicle={vehicle} />
          ))}
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 z-[1000]">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Legend</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full shadow-sm"></div>
              <span className="text-xs font-medium text-gray-600">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full shadow-sm"></div>
              <span className="text-xs font-medium text-gray-600">Under Maintenance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full shadow-sm"></div>
              <span className="text-xs font-medium text-gray-600">Inactive</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-400 rounded-full shadow-sm"></div>
              <span className="text-xs font-medium text-gray-600">No Location</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles for Leaflet Popup */}
      <style>{`
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .leaflet-popup-content {
          margin: 0;
          min-width: 280px;
        }
        .leaflet-popup-tip {
          box-shadow: 0 3px 14px rgba(0, 0, 0, 0.2);
        }
        .custom-marker-icon {
          background: transparent;
          border: none;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
};

export default Map;

