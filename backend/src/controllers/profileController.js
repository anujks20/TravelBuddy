const pool = require("../config/db");
const { updateProfile, changePassword } = require("./authController");

async function getProfile(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        nationality_code,
        profile_photo_url,
        identity_type,
        identity_verified,
        role,
        created_at,
        updated_at
      FROM users
      WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found."
      });
    }

    return res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch profile."
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};