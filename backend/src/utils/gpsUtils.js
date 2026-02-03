// GPS Utility Functions
// Helper functions for GPS calculations and route processing

/**
 * Calculate distance between two GPS points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lng1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lng2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = toRadians(lat2 - lat1);
    const dLng = toRadians(lng2 - lng1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Calculate total distance for a route
 * @param {Array} locationHistory - Array of location points with lat/lng
 * @returns {number} Total distance in kilometers
 */
function calculateRouteDistance(locationHistory) {
    if (!locationHistory || locationHistory.length < 2) {
        return 0;
    }

    let totalDistance = 0;
    for (let i = 1; i < locationHistory.length; i++) {
        const prev = locationHistory[i - 1];
        const curr = locationHistory[i];
        totalDistance += calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }

    return totalDistance;
}

/**
 * Segment route into trips based on stop duration
 * A trip ends when vehicle stops for more than stopThresholdMinutes
 * @param {Array} locationHistory - Array of location points
 * @param {number} stopThresholdMinutes - Minutes of inactivity to consider a stop
 * @returns {Array} Array of trip objects with start, end, duration, distance
 */
function segmentTrips(locationHistory, stopThresholdMinutes = 30) {
    if (!locationHistory || locationHistory.length < 2) {
        return [];
    }

    const trips = [];
    let currentTrip = {
        startIndex: 0,
        points: [locationHistory[0]]
    };

    for (let i = 1; i < locationHistory.length; i++) {
        const prev = locationHistory[i - 1];
        const curr = locationHistory[i];

        const timeDiff = (new Date(curr.timestamp) - new Date(prev.timestamp)) / 1000 / 60; // minutes

        if (timeDiff > stopThresholdMinutes) {
            // End current trip
            currentTrip.endIndex = i - 1;
            currentTrip.startTime = locationHistory[currentTrip.startIndex].timestamp;
            currentTrip.endTime = prev.timestamp;
            currentTrip.duration = (new Date(currentTrip.endTime) - new Date(currentTrip.startTime)) / 1000 / 60; // minutes
            currentTrip.distance = calculateRouteDistance(currentTrip.points);
            trips.push(currentTrip);

            // Start new trip
            currentTrip = {
                startIndex: i,
                points: [curr]
            };
        } else {
            currentTrip.points.push(curr);
        }
    }

    // Add final trip if it has points
    if (currentTrip.points.length > 1) {
        currentTrip.endIndex = locationHistory.length - 1;
        currentTrip.startTime = locationHistory[currentTrip.startIndex].timestamp;
        currentTrip.endTime = locationHistory[currentTrip.endIndex].timestamp;
        currentTrip.duration = (new Date(currentTrip.endTime) - new Date(currentTrip.startTime)) / 1000 / 60;
        currentTrip.distance = calculateRouteDistance(currentTrip.points);
        trips.push(currentTrip);
    }

    return trips;
}

/**
 * Simplify route using Douglas-Peucker algorithm
 * Reduces number of points while maintaining route shape
 * @param {Array} locationHistory - Array of location points
 * @param {number} tolerance - Tolerance in degrees (default 0.0001 ≈ 11 meters)
 * @returns {Array} Simplified array of location points
 */
function simplifyRoute(locationHistory, tolerance = 0.0001) {
    if (!locationHistory || locationHistory.length < 3) {
        return locationHistory;
    }

    // Douglas-Peucker algorithm
    function perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.lng - lineStart.lng;
        const dy = lineEnd.lat - lineStart.lat;

        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
            const u = ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / (mag * mag);
            const intersectionLng = lineStart.lng + u * dx;
            const intersectionLat = lineStart.lat + u * dy;
            const distLng = point.lng - intersectionLng;
            const distLat = point.lat - intersectionLat;
            return Math.sqrt(distLng * distLng + distLat * distLat);
        }

        const distLng = point.lng - lineStart.lng;
        const distLat = point.lat - lineStart.lat;
        return Math.sqrt(distLng * distLng + distLat * distLat);
    }

    function douglasPeucker(points, tolerance) {
        if (points.length < 3) return points;

        let maxDistance = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const distance = perpendicularDistance(points[i], points[0], points[end]);
            if (distance > maxDistance) {
                maxDistance = distance;
                index = i;
            }
        }

        if (maxDistance > tolerance) {
            const left = douglasPeucker(points.slice(0, index + 1), tolerance);
            const right = douglasPeucker(points.slice(index), tolerance);
            return left.slice(0, -1).concat(right);
        }

        return [points[0], points[end]];
    }

    return douglasPeucker(locationHistory, tolerance);
}

module.exports = {
    calculateDistance,
    calculateRouteDistance,
    segmentTrips,
    simplifyRoute
};
