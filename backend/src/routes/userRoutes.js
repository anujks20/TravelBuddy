const express = require("express");
const {
  registerDeviceToken,
  removeDeviceToken
} = require("../controllers/deviceTokenController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/device-token", authenticate, registerDeviceToken);
router.delete("/device-token", authenticate, removeDeviceToken);

module.exports = router;
