const express = require("express");
const {
  ingestTelemetry,
  getLatestTelemetry,
  getDeviceHealth
} = require("../controllers/iotController");

const router = express.Router();

router.post("/telemetry", ingestTelemetry);
router.get("/telemetry/latest/:deviceId", getLatestTelemetry);
router.get("/telemetry/health/:deviceId", getDeviceHealth);

module.exports = router;
