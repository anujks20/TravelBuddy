const express = require("express");

const {
  testAi,
  generateGenericAi,
  generateTripItinerary,
  generateWanderGuidePlaces
} = require("../controllers/aiController");

const {
  authenticate,
  optionalAuthenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/test",
  optionalAuthenticate,
  testAi
);

router.post(
  "/json",
  optionalAuthenticate,
  generateGenericAi
);

router.post(
  "/itinerary",
  optionalAuthenticate,
  generateTripItinerary
);

router.post(
  "/wander-places",
  optionalAuthenticate,
  generateWanderGuidePlaces
);

module.exports = router;


