const express = require("express");

const {
  createHotelStay,
  getMyHotelStays
} = require("../controllers/hotelStayController");

const {
  authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, createHotelStay);
router.get("/", authenticate, getMyHotelStays);

module.exports = router;