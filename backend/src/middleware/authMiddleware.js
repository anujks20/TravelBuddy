const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId || !UUID_REGEX.test(decoded.userId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid user token identity."
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        profile_photo_url,
        identity_type,
        identity_verified,
        role,
        created_at,
        updated_at
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "User account not found."
      });
    }

    req.user = result.rows[0];

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired."
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token."
      });
    }

    console.error("Authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Authentication failed."
    });
  }
}

async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];

    if (!token || token === "null" || token === "undefined") {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId || !UUID_REGEX.test(decoded.userId)) {
      req.user = null;
      return next();
    }

    const result = await pool.query(
      `SELECT
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        profile_photo_url,
        identity_type,
        identity_verified,
        role,
        created_at,
        updated_at
       FROM users
       WHERE id = $1`,
      [decoded.userId]
    );

    if (result.rows.length > 0) {
      req.user = result.rows[0];
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource."
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole
};
