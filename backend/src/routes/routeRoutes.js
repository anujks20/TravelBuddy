const express = require("express");
const {
  optimizeRoutes,
} = require("../controllers/routeController");
const {
  authenticate,
} = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authenticate);

router.post("/optimize", optimizeRoutes);

module.exports = router;
