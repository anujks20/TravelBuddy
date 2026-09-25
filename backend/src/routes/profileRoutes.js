const express = require("express");

const {
  getProfile,
  updateProfile,
  changePassword
} = require("../controllers/profileController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authenticate, getProfile);
router.patch("/", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

module.exports = router;