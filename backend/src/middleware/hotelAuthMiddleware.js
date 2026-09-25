const jwt = require("jsonwebtoken");
const pool = require("../config/db");

async function authenticateHotel(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Hotel staff authentication required."
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    if (!decoded.hotelUserId || decoded.role !== "HOTEL_STAFF") {
      return res.status(401).json({
        success: false,
        message: "Invalid hotel authentication token."
      });
    }

    const result = await pool.query(
      `SELECT
        hu.id,
        hu.hotel_id,
        hu.name,
        hu.email,
        hu.role,
        hu.active,
        hu.created_at,
        h.name AS hotel_name,
        h.address AS hotel_address,
        h.city AS hotel_city,
        h.state AS hotel_state,
        h.country AS hotel_country,
        h.phone AS hotel_phone,
        h.partner_status
       FROM hotel_users hu
       JOIN hotels h ON h.id = hu.hotel_id
       WHERE hu.id = $1`,
      [decoded.hotelUserId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Hotel account not found."
      });
    }

    const hotelUser = result.rows[0];

    if (!hotelUser.active) {
      return res.status(403).json({
        success: false,
        message: "Hotel staff account is inactive."
      });
    }

    req.hotelUser = {
      id: hotelUser.id,
      hotelId: hotelUser.hotel_id,
      name: hotelUser.name,
      email: hotelUser.email,
      role: hotelUser.role,
      active: hotelUser.active,
      createdAt: hotelUser.created_at
    };

    req.hotel = {
      id: hotelUser.hotel_id,
      name: hotelUser.hotel_name,
      address: hotelUser.hotel_address,
      city: hotelUser.hotel_city,
      state: hotelUser.hotel_state,
      country: hotelUser.country || "India",
      phone: hotelUser.hotel_phone,
      partnerStatus: hotelUser.partner_status
    };

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Hotel authentication token has expired."
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid hotel authentication token."
      });
    }

    console.error("Hotel authentication error:", error);

    return res.status(500).json({
      success: false,
      message: "Hotel authentication failed."
    });
  }
}

function requireHotelRole(...roles) {
  return (req, res, next) => {
    if (
      !req.hotelUser ||
      !roles.includes(req.hotelUser.role)
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
  authenticateHotel,
  requireHotelRole
};
