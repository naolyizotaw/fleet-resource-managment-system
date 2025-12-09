/**
 * Script to seed random vehicle locations across Ethiopia
 * Run with: node scripts/seedVehicleLocations.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Ethiopia major cities and areas with their approximate coordinates
const ETHIOPIA_LOCATIONS = [
  // Addis Ababa and surrounding areas
  { name: 'Addis Ababa Center', lat: 9.0192, lng: 38.7525, radius: 0.05 },
  { name: 'Addis Ababa Bole', lat: 8.9806, lng: 38.7998, radius: 0.03 },
  { name: 'Addis Ababa Merkato', lat: 9.0167, lng: 38.7333, radius: 0.02 },
  { name: 'Addis Ababa Megenagna', lat: 9.0167, lng: 38.7833, radius: 0.02 },
  
  // Major regional cities
  { name: 'Dire Dawa', lat: 9.5931, lng: 41.8661, radius: 0.03 },
  { name: 'Bahir Dar', lat: 11.5936, lng: 37.3908, radius: 0.03 },
  { name: 'Gondar', lat: 12.6030, lng: 37.4521, radius: 0.02 },
  { name: 'Mekelle', lat: 13.4967, lng: 39.4753, radius: 0.03 },
  { name: 'Hawassa', lat: 7.0504, lng: 38.4955, radius: 0.03 },
  { name: 'Adama (Nazret)', lat: 8.5400, lng: 39.2700, radius: 0.02 },
  { name: 'Jimma', lat: 7.6667, lng: 36.8333, radius: 0.02 },
  { name: 'Dessie', lat: 11.1333, lng: 39.6333, radius: 0.02 },
  { name: 'Harar', lat: 9.3100, lng: 42.1200, radius: 0.02 },
  { name: 'Debre Markos', lat: 10.3333, lng: 37.7333, radius: 0.02 },
  
  // Highway routes (simulate vehicles on roads)
  { name: 'Highway to Debre Zeit', lat: 8.7500, lng: 38.9833, radius: 0.04 },
  { name: 'Highway to Modjo', lat: 8.5833, lng: 39.1167, radius: 0.03 },
  { name: 'Highway North (Debre Birhan)', lat: 9.6833, lng: 39.5333, radius: 0.03 },
  { name: 'Highway South (Ziway)', lat: 7.9333, lng: 38.7167, radius: 0.03 },
];

/**
 * Generate a random coordinate within a radius of a center point
 */
function randomLocationNear(centerLat, centerLng, radiusDegrees) {
  const latOffset = (Math.random() - 0.5) * 2 * radiusDegrees;
  const lngOffset = (Math.random() - 0.5) * 2 * radiusDegrees;
  return {
    lat: parseFloat((centerLat + latOffset).toFixed(6)),
    lng: parseFloat((centerLng + lngOffset).toFixed(6)),
  };
}

/**
 * Get a random location from Ethiopia locations
 */
function getRandomEthiopiaLocation() {
  const location = ETHIOPIA_LOCATIONS[Math.floor(Math.random() * ETHIOPIA_LOCATIONS.length)];
  return randomLocationNear(location.lat, location.lng, location.radius);
}

/**
 * Generate a random date within the last 24 hours
 */
function getRandomRecentDate() {
  const now = new Date();
  const hoursAgo = Math.floor(Math.random() * 24);
  const minutesAgo = Math.floor(Math.random() * 60);
  return new Date(now.getTime() - (hoursAgo * 60 + minutesAgo) * 60 * 1000);
}

async function seedVehicleLocations() {
  try {
    // Connect to MongoDB
    const dbConnect = require('../src/config/dbConnect');
    await dbConnect();
    
    console.log('✅ Connected to MongoDB');
    
    // Import Vehicle model
    const Vehicle = require('../src/models/vehicleModel');
    
    // Get all vehicles
    const vehicles = await Vehicle.find({});
    console.log(`📍 Found ${vehicles.length} vehicles to update`);
    
    if (vehicles.length === 0) {
      console.log('⚠️  No vehicles found in database. Add some vehicles first!');
      process.exit(0);
    }
    
    // Update each vehicle with random location
    let updated = 0;
    for (const vehicle of vehicles) {
      const coords = getRandomEthiopiaLocation();
      
      vehicle.location = {
        lat: coords.lat,
        lng: coords.lng,
        updatedAt: getRandomRecentDate(),
      };
      
      await vehicle.save();
      updated++;
      console.log(`  ✓ ${vehicle.plateNumber}: [${coords.lat}, ${coords.lng}]`);
    }
    
    console.log(`\n🎉 Successfully updated ${updated} vehicles with random locations!`);
    console.log('📍 Locations are spread across major Ethiopian cities and highways.');
    console.log('\n🗺️  Open the Map page in your browser to see the vehicles!');
    
  } catch (error) {
    console.error('❌ Error seeding vehicle locations:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed.');
    process.exit(0);
  }
}

// Run the script
seedVehicleLocations();


