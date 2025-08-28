const express = require("express");

const {
    createPerDiemRequest,
    getPerDiemRequests,
    getPerDiemRequestById,
    updatePerDiemRequest,
    deletePerDiemRequest,
    getMyPerDiemRequests
} = require("../controllers/perDiemController");

const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

const router = express.Router();

router.use(verifyToken);

router.post("/", authorizeRoles("driver", "manager", "admin", "user"), createPerDiemRequest);
router.get("/my", authorizeRoles("driver", "user"), getMyPerDiemRequests);
router.get("/", authorizeRoles("manager", "admin"), getPerDiemRequests);
router.get("/:id", authorizeRoles("manager", "admin"), getPerDiemRequestById)
router.put("/:id", authorizeRoles("manager", "admin"), updatePerDiemRequest);
router.delete("/:id", authorizeRoles("admin"), deletePerDiemRequest);



module.exports = router;