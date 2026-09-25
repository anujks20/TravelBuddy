const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

function createPoliceToken(policeUser) {
  return jwt.sign(
    {
      policeUserId: policeUser.id,
      role: "POLICE"
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d"
    }
  );
}

async function loginPolice(req, res) {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase();

    const result = await pool.query(
      `SELECT *
       FROM police_users
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid police email or password."
      });
    }

    const policeUser = result.rows[0];

    if (!policeUser.active) {
      return res.status(403).json({
        success: false,
        message: "Police account is inactive."
      });
    }

    const passwordValid = await bcrypt.compare(
      password,
      policeUser.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid police email or password."
      });
    }

    const token = createPoliceToken(policeUser);

    return res.json({
      success: true,
      message: "Police login successful.",
      token,
      policeUser: {
        id: policeUser.id,
        name: policeUser.name,
        email: policeUser.email,
        role: policeUser.role,
        station: policeUser.station,
        active: policeUser.active
      }
    });
  } catch (error) {
    console.error("Police login error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to login police user."
    });
  }
}

async function getPoliceProfile(req, res) {
  return res.json({
    success: true,
    policeUser: req.policeUser
  });
}

async function updatePoliceProfile(req, res) {
  try {
    const { name } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Officer name cannot be empty."
      });
    }

    const result = await pool.query(
      `UPDATE police_users
       SET name = $1
       WHERE id = $2
       RETURNING id, name, email, role, station, active, created_at`,
      [name.trim(), req.policeUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Police officer account not found."
      });
    }

    return res.json({
      success: true,
      message: "Officer profile updated successfully.",
      policeUser: result.rows[0]
    });
  } catch (error) {
    console.error("Update police profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update police officer profile."
    });
  }
}

async function changePolicePassword(req, res) {
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
      "SELECT id, password_hash FROM police_users WHERE id = $1",
      [req.policeUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Police officer account not found."
      });
    }

    const officer = result.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, officer.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      "UPDATE police_users SET password_hash = $1 WHERE id = $2",
      [newHash, req.policeUser.id]
    );

    return res.json({
      success: true,
      message: "Police password changed successfully."
    });
  } catch (error) {
    console.error("Change police password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password."
    });
  }
}

module.exports = {
  loginPolice,
  getPoliceProfile,
  updatePoliceProfile,
  changePolicePassword
};