const express = require("express");

const {
    createLog,
    updateLog,
    getLogs,
    getLogById,
    getLogByVehicle,
    deleteLog,
    getMyLogs
} = require("../controllers/logConroller");


const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");


const router = express.Router();

// All log routes require a valid token
router.use(verifyToken);

router.put("/:id", authorizeRoles("driver", "manager", "admin"), updateLog);
router.post("/", authorizeRoles("driver", "manager", "admin"), createLog);
router.get("/my", authorizeRoles("driver", "user"), getMyLogs);
router.get("/", authorizeRoles("manager", "admin"), getLogs);
router.get("/:id", authorizeRoles( "manager", "admin"), getLogById);
router.get("/vehicle/:vehicleId", authorizeRoles("manager", "admin"), getLogByVehicle);
router.delete("/:id", authorizeRoles("admin", "manager", "driver"), deleteLog);
 


module.exports = router;