const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const path = require('path');

const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const perDiemRoutes = require('./routes/perDiemRoutes');
const logRoutes = require('./routes/logRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const newsRoutes = require('./routes/newsRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const sparePartRequestRoutes = require('./routes/sparePartRequestRoutes');
const workOrderRoutes = require('./routes/workOrderRoutes');
const gpsRoutes = require('./routes/gpsRoutes');


const app = express();
app.use(cors());
dbConnect();

//Middleware 
app.use(express.json());
// Serve static files from public directory (for mobile tracker)
app.use(express.static(path.join(__dirname, '../public')));
// Serve uploaded files (maintenance images, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));



//Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/per-diem', perDiemRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/spare-parts', sparePartRequestRoutes);
app.use('/api/work-orders', workOrderRoutes);
// Public GPS tracking routes (no authentication required)
app.use('/api/gps', gpsRoutes);


//start server 
const PORT = process.env.PORT || 7002;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
});