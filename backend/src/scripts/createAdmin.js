require('dotenv').config({ path: '../../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/userModel');
const dbConnect = require('../config/dbConnect');

async function createAdmin() {
  await dbConnect();
  const username = 'admin';
  const password = 'admin123'; // Change this after first login!
  const role = 'admin';
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const exists = await User.findOne({ username });
    if (exists) {
      console.log('Admin already exists.');
      process.exit(0);
    }
    const admin = new User({ username, password: hashedPassword, role });
    await admin.save();
    console.log('Admin user created:', username);
    process.exit(0);
  } catch (err) {
    console.error('Error creating admin:', err);
    process.exit(1);
  }
}

createAdmin();
