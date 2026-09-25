const pool = require("../config/db");

/**
 * Returns list of geofence breaches for Police Dashboard with tourist & zone metadata.
 */
async function getGeofenceBreaches(req, res) {
  try {
    const { status } = req.query;

    let query = `
      SELECT 
        gb.id,
        gb.user_id,
        gb.zone_id,
        gb.source,
        gb.latitude,
        gb.longitude,
        gb.distance_to_center_meters,
        gb.status,
        gb.telemetry_data,
        gb.acknowledged_at,
        gb.resolved_at,
        gb.created_at,
        u.tourist_uid,
        u.full_name AS tourist_name,
        u.email AS tourist_email,
        u.phone AS tourist_phone,
        u.nationality_code,
        u.profile_photo_url,
        rz.name AS zone_name,
        rz.description AS zone_description,
        rz.danger_level,
        rz.latitude AS zone_latitude,
        rz.longitude AS zone_longitude,
        rz.radius_meters AS zone_radius
      FROM geofence_breaches gb
      LEFT JOIN users u ON gb.user_id = u.id
      LEFT JOIN restricted_zones rz ON gb.zone_id = rz.id
    `;

    const params = [];
    if (status && status !== "ALL") {
      query += ` WHERE gb.status = $1`;
      params.push(status);
    }

    query += ` ORDER BY gb.created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    return res.json({
      success: true,
      breaches: result.rows
    });
  } catch (error) {
    console.error("Get geofence breaches error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve geofence breaches."
    });
  }
}

/**
 * Acknowledges a geofence breach alert.
 */
async function acknowledgeBreach(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE geofence_breaches
       SET status = 'ACKNOWLEDGED', acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Breach alert not found."
      });
    }

    return res.json({
      success: true,
      message: "Geofence breach acknowledged.",
      breach: result.rows[0]
    });
  } catch (error) {
    console.error("Acknowledge breach error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to acknowledge breach alert."
    });
  }
}

/**
 * Resolves a geofence breach alert.
 */
async function resolveBreach(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE geofence_breaches
       SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Breach alert not found."
      });
    }

    return res.json({
      success: true,
      message: "Geofence breach resolved.",
      breach: result.rows[0]
    });
  } catch (error) {
    console.error("Resolve breach error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resolve breach alert."
    });
  }
}

module.exports = {
  getGeofenceBreaches,
  acknowledgeBreach,
  resolveBreach
};
