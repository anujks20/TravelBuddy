const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function createHotelToken(hotelUser) {
  return jwt.sign(
    {
      hotelUserId: hotelUser.id,
      hotelId: hotelUser.hotel_id,
      role: "HOTEL_STAFF"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

async function loginHotel(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const result = await pool.query(
      `SELECT
        hu.id,
        hu.hotel_id,
        hu.name,
        hu.email,
        hu.password_hash,
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
       WHERE hu.email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid hotel staff email or password."
      });
    }

    const hotelUser = result.rows[0];

    if (!hotelUser.active) {
      return res.status(403).json({
        success: false,
        message: "Hotel staff account is inactive."
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      hotelUser.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid hotel staff email or password."
      });
    }

    const token = createHotelToken(hotelUser);

    return res.json({
      success: true,
      message: "Hotel staff login successful.",
      token,
      hotelUser: {
        id: hotelUser.id,
        hotelId: hotelUser.hotel_id,
        name: hotelUser.name,
        email: hotelUser.email,
        role: hotelUser.role,
        active: hotelUser.active,
        createdAt: hotelUser.created_at
      },
      hotel: {
        id: hotelUser.hotel_id,
        name: hotelUser.hotel_name,
        address: hotelUser.hotel_address,
        city: hotelUser.hotel_city,
        state: hotelUser.hotel_state,
        country: hotelUser.hotel_country || "India",
        phone: hotelUser.hotel_phone,
        partnerStatus: hotelUser.partner_status
      }
    });
  } catch (error) {
    console.error("Hotel staff login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login hotel staff."
    });
  }
}

async function getHotelStaffProfile(req, res) {
  return res.json({
    success: true,
    hotelUser: req.hotelUser,
    hotel: req.hotel
  });
}

async function updateHotelProfile(req, res) {
  try {
    const { name, phone } = req.body;

    if (name && name.trim() !== "") {
      await pool.query(
        "UPDATE hotel_users SET name = $1 WHERE id = $2",
        [name.trim(), req.hotelUser.id]
      );
      req.hotelUser.name = name.trim();
    }

    if (phone !== undefined && req.hotel?.id) {
      await pool.query(
        "UPDATE hotels SET phone = $1 WHERE id = $2",
        [phone.trim() === "" ? null : phone.trim(), req.hotel.id]
      );
      req.hotel.phone = phone.trim() === "" ? null : phone.trim();
    }

    return res.json({
      success: true,
      message: "Hotel staff profile updated successfully.",
      hotelUser: req.hotelUser,
      hotel: req.hotel
    });
  } catch (error) {
    console.error("Update hotel profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update hotel staff profile."
    });
  }
}

async function changeHotelPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long."
      });
    }

    const result = await pool.query(
      "SELECT id, password_hash FROM hotel_users WHERE id = $1",
      [req.hotelUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hotel staff account not found."
      });
    }

    const staff = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, staff.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE hotel_users SET password_hash = $1 WHERE id = $2",
      [newHash, req.hotelUser.id]
    );

    return res.json({
      success: true,
      message: "Password changed successfully."
    });
  } catch (error) {
    console.error("Change hotel password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password."
    });
  }
}

module.exports = {
  loginHotel,
  getHotelStaffProfile,
  updateHotelProfile,
  changeHotelPassword
};
