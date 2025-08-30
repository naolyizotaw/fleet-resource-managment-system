const express = require("express");

const {
    createFuelRequest,
    getFuelRequests,
    getFuelRequestById,
    updateFuelRequest,
    deleteFuelRequest,
    getMyFuelRequests
} = require("../controllers/fuelController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

// All fuel routes require a valid token
router.use(verifyToken);

router.post("/", authorizeRoles("driver", "manager", "admin", "user"), createFuelRequest);
router.get("/my", authorizeRoles("driver", "user"), getMyFuelRequests);
router.get("/", authorizeRoles("manager", "admin"), getFuelRequests);
router.get("/:id", authorizeRoles( "manager", "admin"), getFuelRequestById);
// Allow all authenticated roles to hit the endpoint; controller enforces fine-grained permissions
router.put("/:id", authorizeRoles("driver", "user", "manager", "admin"), updateFuelRequest);
router.delete("/:id", authorizeRoles("admin"), deleteFuelRequest);



module.exports = router;