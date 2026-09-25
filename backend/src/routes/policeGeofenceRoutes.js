const express = require("express");
const {
  getGeofenceBreaches,
  acknowledgeBreach,
  resolveBreach
} = require("../controllers/policeGeofenceController");
const { authenticatePolice } = require("../middleware/policeAuthMiddleware");

const router = express.Router();

router.use(authenticatePolice);

router.get("/breaches", getGeofenceBreaches);
router.patch("/breaches/:id/acknowledge", acknowledgeBreach);
router.patch("/breaches/:id/resolve", resolveBreach);

module.exports = router;
