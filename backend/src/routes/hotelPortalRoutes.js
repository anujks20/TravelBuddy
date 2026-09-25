const express = require("express");
const {
  searchGuest,
  registerTourist,
  createStay,
  getStays,
  getStayDetails,
  updateStay,
  getHotelProfile
} = require("../controllers/hotelPortalController");
const {
  authenticateHotel
} = require("../middleware/hotelAuthMiddleware");

const router = express.Router();

router.use(authenticateHotel);

router.post("/guests/search", searchGuest);
router.post("/guests/register", registerTourist);
router.post("/stays", createStay);
router.get("/stays", getStays);
router.get("/stays/:id", getStayDetails);
router.patch("/stays/:id", updateStay);
router.get("/profile", getHotelProfile);

module.exports = router;
