const express = require("express");

const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  logout
} = require("../controllers/authController");

const {
  authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", authenticate, me);
router.patch("/profile", authenticate, updateProfile);
router.post("/change-password", authenticate, changePassword);

router.post("/logout", authenticate, logout);

module.exports = router;