const pool = require("../config/db");
const { checkLocationAgainstZones } = require("../services/geofenceService");

/**
 * Returns all active restricted danger zones for map rendering.
 */
async function getRestrictedZones(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, description, latitude, longitude, radius_meters, danger_level, active, created_at
       FROM restricted_zones
       WHERE active = TRUE
       ORDER BY created_at ASC`
    );

    return res.json({
      success: true,
      zones: result.rows
    });
  } catch (error) {
    console.error("Get restricted zones error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve restricted zones."
    });
  }
}

/**
 * Checks a given latitude and longitude against restricted zones.
 */
async function checkLocation(req, res) {
  try {
    const { latitude, longitude, source } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required."
      });
    }

    const userId = req.user ? req.user.id : null;
    const checkResult = await checkLocationAgainstZones({
      userId,
      latitude,
      longitude,
      source: source || "CLIENT_CHECK"
    });

    return res.json({
      success: true,
      ...checkResult
    });
  } catch (error) {
    console.error("Geofence check location error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to perform geofence check."
    });
  }
}

/**
 * Creates a new restricted danger zone.
 */
async function createRestrictedZone(req, res) {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      radius_meters = 300,
      danger_level = "HIGH"
    } = req.body;

    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, latitude, and longitude are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO restricted_zones
        (name, description, latitude, longitude, radius_meters, danger_level)
       VALUES
        ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, latitude, longitude, radius_meters, danger_level]
    );

    return res.status(201).json({
      success: true,
      message: "Restricted danger zone created successfully.",
      zone: result.rows[0]
    });
  } catch (error) {
    console.error("Create restricted zone error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create restricted zone."
    });
  }
}

/**
 * Deactivates or removes a restricted zone.
 */
async function deleteRestrictedZone(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE restricted_zones
       SET active = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Restricted zone not found."
      });
    }

    return res.json({
      success: true,
      message: "Restricted zone deactivated successfully."
    });
  } catch (error) {
    console.error("Delete restricted zone error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate restricted zone."
    });
  }
}

module.exports = {
  getRestrictedZones,
  checkLocation,
  createRestrictedZone,
  deleteRestrictedZone
};
