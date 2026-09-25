const express = require("express");

const {
  addEmergencyContact,
  getEmergencyContacts
} = require("../controllers/emergencyContactController");

const {
  authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, addEmergencyContact);
router.get("/", authenticate, getEmergencyContacts);

module.exports = router;