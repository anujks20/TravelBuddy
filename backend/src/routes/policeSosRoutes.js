const express = require("express");

const {
  getActiveSos,
  getSosDetails,
  acknowledgeSos,
  dispatchSos,
  resolveSos
} = require("../controllers/policeSosController");

const {
  authenticatePolice
} = require("../middleware/policeAuthMiddleware");

const router = express.Router();

router.get(
  "/active",
  authenticatePolice,
  getActiveSos
);

router.get(
  "/:id",
  authenticatePolice,
  getSosDetails
);

router.post(
  "/:id/acknowledge",
  authenticatePolice,
  acknowledgeSos
);

router.post(
  "/:id/dispatch",
  authenticatePolice,
  dispatchSos
);

router.post(
  "/:id/resolve",
  authenticatePolice,
  resolveSos
);

module.exports = router;