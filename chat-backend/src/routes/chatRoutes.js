const express = require("express");
const { accessChat, fetchChats, createGroupChat, renameGroup, addToGroup, removeFromGroup } = require("../controllers/chatController");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/").post(verifyToken, accessChat);
router.route("/").get(verifyToken, fetchChats);
router.route("/group").post(verifyToken, createGroupChat);
router.route("/rename").put(verifyToken, renameGroup);
router.route("/groupadd").put(verifyToken, addToGroup);
router.route("/groupremove").put(verifyToken, removeFromGroup);

module.exports = router;
