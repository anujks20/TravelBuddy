const express = require("express");

const {
  loginPolice,
  getPoliceProfile,
  updatePoliceProfile,
  changePolicePassword
} = require("../controllers/policeAuthController");

const {
  authenticatePolice
} = require("../middleware/policeAuthMiddleware");

const router = express.Router();

router.post("/login", loginPolice);
router.get("/me", authenticatePolice, getPoliceProfile);
router.patch("/profile", authenticatePolice, updatePoliceProfile);
router.post("/change-password", authenticatePolice, changePolicePassword);

module.exports = router;