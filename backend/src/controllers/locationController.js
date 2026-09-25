const pool = require("../config/db");
const { checkLocationAgainstZones } = require("../services/geofenceService");

async function updateLocation(req, res) {
  try {
    const {
      latitude,
      longitude,
      accuracy,
      speed,
      heading,
      source = "PHONE_GPS"
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required."
      });
    }

    const result = await pool.query(
      `INSERT INTO locations
        (
          user_id,
          latitude,
          longitude,
          accuracy,
          speed,
          heading
        )
       VALUES
        ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.user.id,
        latitude,
        longitude,
        accuracy ?? null,
        speed ?? null,
        heading ?? null
      ]
    );

    // Evaluate Geofence Restricted Zones
    const geofenceCheck = await checkLocationAgainstZones({
      userId: req.user.id,
      latitude,
      longitude,
      source
    });

    return res.status(201).json({
      success: true,
      message: "Location updated successfully.",
      location: result.rows[0],
      geofence: {
        breachDetected: geofenceCheck.breachDetected,
        playSiren: geofenceCheck.playSiren,
        warningMessage: geofenceCheck.message || null,
        dangerZone: geofenceCheck.primaryZone || null
      }
    });
  } catch (error) {
    console.error("Update location error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update location."
    });
  }
}

async function getLatestLocation(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM locations
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No location data available."
      });
    }

    return res.json({
      success: true,
      location: result.rows[0]
    });
  } catch (error) {
    console.error("Get latest location error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch latest location."
    });
  }
}

module.exports = {
  updateLocation,
  getLatestLocation
};