require('dotenv').config();
const dbConnect = require('../config/dbConnect');
const DriverLog = require('../models/logModel');

(async () => {
  try {
    await dbConnect();
    console.log('Connected to DB. Syncing indexes...');
    await DriverLog.syncIndexes();
    console.log('Indexes synced successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to sync indexes:', err);
    process.exit(1);
  }
})();
