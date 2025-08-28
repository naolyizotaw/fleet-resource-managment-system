const express = require("express");

const {
    createLog,
    getLogs,
    getLogById,
    getLogByVehicle,
    deleteLog
} = require("../controllers/logConroller");


const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");


const router = express.Router();

// All log routes require a valid token
router.use(verifyToken);

router.post("/", authorizeRoles("driver", "manager", "admin"), createLog);
router.get("/", authorizeRoles("manager", "admin"), getLogs);
router.get("/:id", authorizeRoles( "manager", "admin"), getLogById);
router.get("/vehicle/:vehicleId", authorizeRoles("manager", "admin"), getLogByVehicle);
router.delete("/:id", authorizeRoles("admin"), deleteLog);
 


module.exports = router;