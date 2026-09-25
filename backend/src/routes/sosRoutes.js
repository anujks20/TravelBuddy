const express = require("express");

const {
  createSos,
  getMySos,
  getSosByIdOrReference
} = require("../controllers/sosController");

const {
  authenticate
} = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authenticate, createSos);
router.get("/", authenticate, getMySos);
router.get("/:id", authenticate, getSosByIdOrReference);

module.exports = router;