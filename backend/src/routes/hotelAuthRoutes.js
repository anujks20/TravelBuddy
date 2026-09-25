const express = require("express");
const {
  loginHotel,
  getHotelStaffProfile,
  updateHotelProfile,
  changeHotelPassword
} = require("../controllers/hotelAuthController");
const {
  authenticateHotel
} = require("../middleware/hotelAuthMiddleware");

const router = express.Router();

router.post("/login", loginHotel);
router.get("/me", authenticateHotel, getHotelStaffProfile);
router.patch("/profile", authenticateHotel, updateHotelProfile);
router.post("/change-password", authenticateHotel, changeHotelPassword);

module.exports = router;
