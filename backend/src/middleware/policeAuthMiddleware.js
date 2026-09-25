const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function authenticatePolice(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Police authentication required."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.policeUserId || decoded.role !== "POLICE") {
      return res.status(401).json({
        success: false,
        message: "Invalid police authentication token."
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        name,
        email,
        role,
        station,
        active,
        created_at
       FROM police_users
       WHERE id = $1`,
      [decoded.policeUserId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Police account not found."
      });
    }

    const policeUser = result.rows[0];

    if (!policeUser.active) {
      return res.status(403).json({
        success: false,
        message: "Police account is inactive."
      });
    }

    req.policeUser = policeUser;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Police authentication token has expired."
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid police authentication token."
      });
    }

    console.error("Police authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Police authentication failed."
    });
  }
}

function requirePoliceRole(...roles) {
  return (req, res, next) => {
    if (
      !req.policeUser ||
      !roles.includes(req.policeUser.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action."
      });
    }

    next();
  };
}

module.exports = {
  authenticatePolice,
  requirePoliceRole
};