const express = require("express");
const {
  createTrip,
  getMyTrips,
  getTripById,
  updateTrip,
  deleteTrip
} = require("../controllers/tripController");
const { authenticate } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.post("/", createTrip);
router.get("/", getMyTrips);
router.get("/:id", getTripById);
router.patch("/:id", updateTrip);
router.delete("/:id", deleteTrip);

module.exports = router;
