const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Vehicle = require('./src/models/vehicleModel');
const dbConnect = require('./src/config/dbConnect');

dotenv.config();

const clearDummyLocations = async () => {
    try {
        await dbConnect();

        console.log('Clearing dummy location data...');

        const result = await Vehicle.updateMany(
            {},
            {
                $set: {
                    "location.lat": null,
                    "location.lng": null,
                    "location.updatedAt": null,
                    "lastLocationUpdate": null,
                    "isTracking": false
                }
            }
        );

        console.log(`Successfully cleared locations for ${result.modifiedCount} vehicles.`);
        process.exit(0);
    } catch (error) {
        console.error('Error clearing locations:', error);
        process.exit(1);
    }
};

clearDummyLocations();
