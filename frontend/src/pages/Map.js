import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { useAuth } from '../contexts/AuthContext';
import useFetchVehicleLocations from '../hooks/useFetchVehicleLocations';
import VehicleMapMarker from '../components/VehicleMapMarker';
import { MapPin, RefreshCw, AlertTriangle, Truck, Map as MapIcon, Search, X, ChevronRight, Navigation } from 'lucide-react';

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
const FOCUSED_ZOOM = 14;

/**
 * MapController Component
 * Handles programmatic map movements (fly to location)
 */
const MapController = ({ selectedVehicle, onFlyComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedVehicle && selectedVehicle.location?.lat && selectedVehicle.location?.lng) {
      map.flyTo(
        [selectedVehicle.location.lat, selectedVehicle.location.lng],
        FOCUSED_ZOOM,
        { duration: 1.5 }
      );

      // Notify when fly animation completes
      const timer = setTimeout(() => {
        if (onFlyComplete) onFlyComplete();
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [selectedVehicle, map, onFlyComplete]);

  return null;
};

/**
 * Get status color for search results
 */
const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return 'bg-green-500';
    case 'under_maintenance':
      return 'bg-orange-500';
    case 'inactive':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
};

/**
 * Map Page Component
 * Displays a map with all vehicle locations for admin and manager users
 */
const Map = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: vehicles, loading, error, refetch } = useFetchVehicleLocations();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [highlightedVehicleId, setHighlightedVehicleId] = useState(null);
  const searchRef = useRef(null);

  // Auto-refresh state for real-time GPS tracking
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(15); // seconds
  const autoRefreshRef = useRef(null);

  // Redirect drivers to dashboard
  useEffect(() => {
    if (user?.role === 'driver') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-refresh effect for real-time GPS tracking
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(() => {
        refetch();
      }, refreshInterval * 1000);
    } else {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
        autoRefreshRef.current = null;
      }
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refetch]);

  // Filter vehicles based on search query
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    return vehicles.filter(v => {
      const plateMatch = v.plateNumber?.toLowerCase().includes(query);
      const modelMatch = v.model?.toLowerCase().includes(query);
      const driverMatch = v.assignedDriver?.fullName?.toLowerCase().includes(query);
      return plateMatch || modelMatch || driverMatch;
    }).slice(0, 8); // Limit to 8 results
  }, [searchQuery, vehicles]);

  // Vehicles with location for quick list
  const vehiclesWithLocation = useMemo(() => {
    return vehicles.filter(v => v.location?.lat != null && v.location?.lng != null);
  }, [vehicles]);

  // Handle vehicle selection from search
  const handleSelectVehicle = (vehicle) => {
    if (!vehicle.location?.lat || !vehicle.location?.lng) {
      return; // Can't fly to vehicle without location
    }
    setSelectedVehicle(vehicle);
    setHighlightedVehicleId(vehicle._id);
    setIsSearchOpen(false);
    setSearchQuery(vehicle.plateNumber);
  };

  // Clear search and selection
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedVehicle(null);
    setHighlightedVehicleId(null);
    setIsSearchOpen(false);
  };

  // Reset to default view
  const handleResetView = () => {
    setSelectedVehicle({ location: { lat: ETHIOPIA_CENTER[0], lng: ETHIOPIA_CENTER[1] } });
    setHighlightedVehicleId(null);
    setTimeout(() => setSelectedVehicle(null), 100);
  };

  // Compute vehicle statistics including online status
  const stats = useMemo(() => {
    const total = vehicles.length;
    const withLocation = vehicles.filter(v => v.location?.lat != null && v.location?.lng != null).length;
    const active = vehicles.filter(v => v.status === 'active').length;
    const underMaintenance = vehicles.filter(v => v.status === 'under_maintenance').length;
    const inactive = vehicles.filter(v => v.status === 'inactive').length;
    const noLocation = total - withLocation;

    // Calculate online vehicles (location updated within last 5 minutes)
    const online = vehicles.filter(v => {
      if (!v.lastLocationUpdate) return false;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return new Date(v.lastLocationUpdate) > fiveMinutesAgo;
    }).length;

    return { total, withLocation, active, underMaintenance, inactive, noLocation, online };
  }, [vehicles]);

  // If user is driver, don't render (redirect handles navigation)
  if (user?.role === 'driver') {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
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

          <div className="flex items-center gap-3">
            {/* Search Box */}
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Search by plate, model, or driver..."
                  className="w-64 sm:w-80 pl-10 pr-10 py-2.5 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              {/* Search Dropdown */}
              {isSearchOpen && (searchQuery.trim() || vehiclesWithLocation.length > 0) && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-gray-100 rounded-xl shadow-2xl overflow-hidden z-[1001]">
                  {searchQuery.trim() ? (
                    // Search Results
                    <div>
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {searchResults.length} Result{searchResults.length !== 1 ? 's' : ''} Found
                        </p>
                      </div>
                      {searchResults.length === 0 ? (
                        <div className="p-4 text-center">
                          <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 font-medium">No vehicles found</p>
                          <p className="text-xs text-gray-400">Try a different search term</p>
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          {searchResults.map((vehicle) => (
                            <button
                              key={vehicle._id}
                              onClick={() => handleSelectVehicle(vehicle)}
                              disabled={!vehicle.location?.lat}
                              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${!vehicle.location?.lat ? 'opacity-50 cursor-not-allowed' : ''
                                } ${highlightedVehicleId === vehicle._id ? 'bg-blue-50' : ''}`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(vehicle.status)}`}>
                                <Truck className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                  {vehicle.plateNumber}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {vehicle.model} {vehicle.assignedDriver?.fullName ? `• ${vehicle.assignedDriver.fullName}` : ''}
                                </p>
                              </div>
                              {vehicle.location?.lat ? (
                                <Navigation className="h-4 w-4 text-blue-500 flex-shrink-0" />
                              ) : (
                                <span className="text-[10px] font-bold text-gray-400 uppercase">No GPS</span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    // Quick Select - Recent/All vehicles with location
                    <div>
                      <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                          Quick Select — {vehiclesWithLocation.length} Vehicles on Map
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {vehiclesWithLocation.slice(0, 8).map((vehicle) => (
                          <button
                            key={vehicle._id}
                            onClick={() => handleSelectVehicle(vehicle)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${highlightedVehicleId === vehicle._id ? 'bg-blue-50' : ''
                              }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(vehicle.status)}`}>
                              <Truck className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {vehicle.plateNumber}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {vehicle.model}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auto-Refresh Toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all ${autoRefresh
                  ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200'
                }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{autoRefresh ? 'Live Tracking' : 'Auto-Refresh Off'}</span>
            </button>

            {/* Manual Refresh Button */}
            <button
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
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

          <div className="bg-white rounded-xl p-3 shadow-md border-2 border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Online Now</p>
                <p className="text-lg font-black text-emerald-600">{stats.online}</p>
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

        {/* Selected Vehicle Info Banner */}
        {highlightedVehicleId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border-2 border-blue-200 px-4 py-3 z-[1000] flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getStatusColor(vehicles.find(v => v._id === highlightedVehicleId)?.status)}`}>
              <Truck className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                {vehicles.find(v => v._id === highlightedVehicleId)?.plateNumber}
              </p>
              <p className="text-xs text-gray-500">
                {vehicles.find(v => v._id === highlightedVehicleId)?.model}
              </p>
            </div>
            <button
              onClick={handleClearSearch}
              className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
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

          {/* Map Controller for programmatic movement */}
          <MapController selectedVehicle={selectedVehicle} />

          {/* Render vehicle markers */}
          {vehicles.map((vehicle) => (
            <VehicleMapMarker
              key={vehicle._id}
              vehicle={vehicle}
              isHighlighted={highlightedVehicleId === vehicle._id}
            />
          ))}
        </MapContainer>

        {/* Reset View Button */}
        {highlightedVehicleId && (
          <button
            onClick={handleResetView}
            className="absolute top-4 right-16 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 px-3 py-2 z-[1000] flex items-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <MapPin className="h-4 w-4 text-gray-600" />
            <span className="text-xs font-bold text-gray-700">Reset View</span>
          </button>
        )}

        {/* Map Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 z-[1000]">
          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Vehicle Status</h4>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-7 h-7 bg-gradient-to-b from-green-500 to-green-600 rounded-lg shadow-md flex items-center justify-center">
                  <Truck className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-xs font-semibold text-gray-700">Active</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-b from-orange-500 to-orange-600 rounded-lg shadow-md flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Under Maintenance</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-b from-red-500 to-red-600 rounded-lg shadow-md flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">Inactive</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gradient-to-b from-gray-400 to-gray-500 rounded-lg shadow-md flex items-center justify-center">
                <Truck className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-gray-700">No Location</span>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles for Leaflet Popup and Markers */}
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
        .custom-truck-marker {
          background: transparent !important;
          border: none !important;
        }
        .custom-truck-marker > div {
          transition: transform 0.2s ease;
        }
        .custom-truck-marker:hover > div {
          transform: scale(1.1);
        }
        .custom-truck-marker.highlighted > div {
          transform: scale(1.2);
          filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.8));
        }
        .leaflet-container {
          font-family: inherit;
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.5; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .highlighted-marker {
          animation: bounce 0.5s ease-in-out 3;
        }
      `}</style>
    </div>
  );
};

export default Map;
