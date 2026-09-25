const express = require("express");
const {
  getRestrictedZones,
  checkLocation,
  createRestrictedZone,
  deleteRestrictedZone
} = require("../controllers/geofenceController");
const { optionalAuthenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/zones", getRestrictedZones);
router.post("/check", optionalAuthenticate, checkLocation);
router.post("/zones", createRestrictedZone);
router.delete("/zones/:id", deleteRestrictedZone);

module.exports = router;
