import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

/**
 * Custom hook to fetch vehicle locations for the map
 * @returns {Object} { data, loading, error, refetch }
 */
const useFetchVehicleLocations = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVehicleLocations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/vehicles/locations');
      setData(response.data || []);
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to fetch vehicle locations';
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicleLocations();
  }, [fetchVehicleLocations]);

  const refetch = useCallback(() => {
    fetchVehicleLocations();
  }, [fetchVehicleLocations]);

  return { data, loading, error, refetch };
};

export default useFetchVehicleLocations;

