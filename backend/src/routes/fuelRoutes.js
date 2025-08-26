const express = require("express");

const {
    createFuelRequest,
    getFuelRequests,
    getFuelRequestById,
    updateFuelRequest,
    deleteFuelRequest
} = require("../controllers/fuelController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// All fuel routes require a valid token
router.use(verifyToken);

router.post("/", authorizeRoles("driver", "manager", "admin"), createFuelRequest);
router.get("/", authorizeRoles("manager", "admin"), getFuelRequests);
router.get("/:id", authorizeRoles( "manager", "admin"), getFuelRequestById);
router.put("/:id", authorizeRoles("manager", "admin"), updateFuelRequest);
router.delete("/:id", authorizeRoles("admin"), deleteFuelRequest);



module.exports = router;