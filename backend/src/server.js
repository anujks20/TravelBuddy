const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const userRoutes = require("./routes/userRoutes");
const tripRoutes = require("./routes/tripRoutes");
const hotelStayRoutes = require("./routes/hotelStayRoutes");
const emergencyContactRoutes = require("./routes/emergencyContactRoutes");
const sosRoutes = require("./routes/sosRoutes");
const locationRoutes = require("./routes/locationRoutes");
const policeAuthRoutes = require("./routes/policeAuthRoutes");
const policeSosRoutes = require("./routes/policeSosRoutes");
const hotelAuthRoutes = require("./routes/hotelAuthRoutes");
const hotelPortalRoutes = require("./routes/hotelPortalRoutes");
const aiRoutes = require("./routes/aiRoutes");
const routeRoutes = require("./routes/routeRoutes");
const placeRoutes = require("./routes/placeRoutes");
const whatsappRoutes = require("./routes/whatsappRoutes");
const geofenceRoutes = require("./routes/geofenceRoutes");
const iotRoutes = require("./routes/iotRoutes");
const policeGeofenceRoutes = require("./routes/policeGeofenceRoutes");

const app = express();

const PORT = Number(process.env.PORT) || 5000;
const HOST = process.env.HOST || "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";

/*
 * ---------------------------------------------------------
 * SECURITY
 * ---------------------------------------------------------
 */

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);

/*
 * ---------------------------------------------------------
 * CORS
 * ---------------------------------------------------------
 *
 * During development, requests from any origin are allowed.
 *
 * For production, set:
 *
 * CORS_ORIGINS=https://yourwebsite.com,https://police.yourwebsite.com
 *
 * The frontend/mobile clients will then communicate with the
 * same public TravelBuddy backend from anywhere on the internet.
 */

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients such as Flutter/mobile apps,
    // Postman and server-to-server requests.
    if (!origin) {
      return callback(null, true);
    }

    // Development mode: allow all origins.
    if (NODE_ENV !== "production") {
      return callback(null, true);
    }

    // Production mode: allow only configured origins.
    if (configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(
      new Error("CORS origin is not allowed.")
    );
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-IoT-Device-Key", "x-device-key"],
  credentials: true,
  maxAge: 86400
};

app.use(cors(corsOptions));

/*
 * ---------------------------------------------------------
 * REQUEST BODY LIMIT
 * ---------------------------------------------------------
 */

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

/*
 * ---------------------------------------------------------
 * GLOBAL API RATE LIMIT
 * ---------------------------------------------------------
 *
 * This protects the public API from accidental or malicious
 * request flooding.
 *
 * AI endpoints will later receive a stricter, separate limit.
 */

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  skip: (req) => Boolean(req.originalUrl && req.originalUrl.startsWith("/api/iot")),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

/*
 * ---------------------------------------------------------
 * BASIC ROUTES
 * ---------------------------------------------------------
 */

app.get("/", (req, res) => {
  res.json({
    success: true,
    service: "TravelBuddy Backend",
    message: "TravelBuddy Backend is running.",
    environment: NODE_ENV
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    service: "TravelBuddy API",
    message: "TravelBuddy API is healthy.",
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

/*
 * ---------------------------------------------------------
 * API ROUTES
 * ---------------------------------------------------------
 */

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/hotel-stays", hotelStayRoutes);
app.use("/api/emergency-contacts", emergencyContactRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/locations", locationRoutes);

app.use("/api/police/auth", policeAuthRoutes);
app.use("/api/police/sos", policeSosRoutes);

app.use("/api/hotel/auth", hotelAuthRoutes);
app.use("/api/hotel", hotelPortalRoutes);
app.use("/api/hotel-portal", hotelPortalRoutes);

app.use("/api/ai", aiRoutes);
app.use("/api/routes", routeRoutes);
app.use("/api/places", placeRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api/geofence", geofenceRoutes);
app.use("/api/iot", iotRoutes);
app.use("/api/police/geofence", policeGeofenceRoutes);

/*
 * ---------------------------------------------------------
 * 404 HANDLER
 * ---------------------------------------------------------
 */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found.",
    path: req.originalUrl
  });
});

/*
 * ---------------------------------------------------------
 * GLOBAL ERROR HANDLER
 * ---------------------------------------------------------
 */

app.use((err, req, res, next) => {
  console.error("TravelBuddy API Error:", err);

  if (err.message === "CORS origin is not allowed.") {
    return res.status(403).json({
      success: false,
      message: "Request origin is not allowed."
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large."
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      NODE_ENV === "production"
        ? "Internal server error."
        : err.message || "Internal server error."
  });
});

/*
 * ---------------------------------------------------------
 * SERVER
 * ---------------------------------------------------------
 *
 * IMPORTANT:
 * 0.0.0.0 allows the server to listen on all network
 * interfaces. This is required for container/cloud hosting
 * and remote deployment.
 */

app.listen(PORT, HOST, () => {
  console.log(
    `TravelBuddy backend running on http://${HOST}:${PORT}`
  );
  console.log(`Environment: ${NODE_ENV}`);
});




