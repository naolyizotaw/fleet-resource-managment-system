const express = require("express");
const dotenv = require("dotenv").config();
const dbConnect = require("./config/dbConnect");
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');

const userRoutes = require('./routes/userRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const perDiemRoutes = require('./routes/perDiemRoutes');
const logRoutes = require('./routes/logRoutes');


const app = express();
app.use(cors());
dbConnect();

//Middleware 
app.use(express.json());



//Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); 
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/per-diem', perDiemRoutes);
app.use('/api/logs', logRoutes);


//start server 
const PORT = process.env.PORT || 7002;
app.listen(PORT, () => {
    console.log(`Server is running at port ${PORT}`)
});