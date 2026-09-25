const pool = require("../config/db");

async function registerDeviceToken(req, res) {
  try {
    const { fcmToken, platform } = req.body;

    if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid fcmToken is required."
      });
    }

    const normalizedToken = fcmToken.trim();
    const normalizedPlatform = (platform && typeof platform === "string")
      ? platform.trim().toUpperCase()
      : "ANDROID";

    const result = await pool.query(
      `INSERT INTO user_device_tokens (user_id, fcm_token, platform, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       ON CONFLICT (fcm_token)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         platform = EXCLUDED.platform,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id, user_id, fcm_token, platform, updated_at`,
      [req.user.id, normalizedToken, normalizedPlatform]
    );

    return res.status(200).json({
      success: true,
      message: "Device token registered successfully.",
      deviceToken: result.rows[0]
    });
  } catch (error) {
    console.error("Register device token error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to register device token."
    });
  }
}

async function removeDeviceToken(req, res) {
  try {
    const { fcmToken } = req.body;

    if (!fcmToken || typeof fcmToken !== "string") {
      return res.status(400).json({
        success: false,
        message: "fcmToken is required."
      });
    }

    await pool.query(
      `DELETE FROM user_device_tokens
       WHERE fcm_token = $1 AND user_id = $2`,
      [fcmToken.trim(), req.user.id]
    );

    return res.status(200).json({
      success: true,
      message: "Device token removed successfully."
    });
  } catch (error) {
    console.error("Remove device token error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to remove device token."
    });
  }
}

module.exports = {
  registerDeviceToken,
  removeDeviceToken
};
