const express = require("express");

const {
  getCityPlaces,
  getCityAutocomplete,
  clearPlacesCache
} = require("../controllers/placeController");

const {
  optionalAuthenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/autocomplete", getCityAutocomplete);

router.post(
  "/city",
  optionalAuthenticate,
  getCityPlaces
);

router.all("/clear-cache", clearPlacesCache);

module.exports = router;
