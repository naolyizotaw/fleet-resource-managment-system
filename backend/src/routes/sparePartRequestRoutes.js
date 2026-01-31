const express = require("express");
const router = express.Router();
const {
  createRequest,
  getAllRequests,
  getMyRequests,
  updateRequestStatus,
  deleteRequest,
} = require("../controllers/sparePartRequestController");
const { verifyToken } = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");

// All routes are protected
router.use(verifyToken);

// Request routes
router.post(
  "/",
  authorizeRoles("admin", "manager", "user"),
  createRequest
);

router.get(
    "/", 
    authorizeRoles("admin", "manager"), 
    getAllRequests
);

router.get(
    "/my-requests", 
    getMyRequests
);

router.put(
  "/:id/status",
  authorizeRoles("admin", "manager"),
  updateRequestStatus
);

router.delete(
    "/:id",
    deleteRequest
);

module.exports = router;
