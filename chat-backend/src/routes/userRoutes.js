const express = require("express");
const { syncUser, allUsers } = require("../controllers/userController");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").get(verifyToken, allUsers);
router.route("/sync").post(verifyToken, syncUser);

module.exports = router;
