const express = require("express");

const {
  processWhatsAppTrip
} = require("../controllers/whatsappController");

const router = express.Router();

router.post(
  "/process-trip",
  processWhatsAppTrip
);

module.exports = router;
