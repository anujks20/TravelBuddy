const express = require("express");

const {
  updateLocation,
  getLatestLocation
} = require("../controllers/locationController");

const {
  authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, updateLocation);
router.get("/latest", authenticate, getLatestLocation);

module.exports = router;