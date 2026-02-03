const express = require("express");
const { sendMessage, allMessages, markAsRead, getUnreadCount } = require("../controllers/messageController");
const { verifyToken } = require("../middlewares/authMiddleware");

const router = express.Router();

router.route("/:chatId").get(verifyToken, allMessages);
router.route("/").post(verifyToken, sendMessage);
router.route("/read").put(verifyToken, markAsRead);
router.route("/unread/count").get(verifyToken, getUnreadCount);

module.exports = router;
