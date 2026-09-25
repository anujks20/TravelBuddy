const crypto = require("crypto");
const pool = require("../config/db");
const { prepareSosAlerts } = require("../services/sosAlertService");

function generateSosReference() {
  const randomPart = crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase();

  return `SOS-${randomPart}`;
}

async function createSos(req, res) {
  try {
    const {
      type,
      latitude,
      longitude,
      locationAccuracy,
      triggerSource,
      message
    } = req.body;

    if (!type || !triggerSource) {
      return res.status(400).json({
        success: false,
        message: "SOS type and trigger source are required."
      });
    }

    const allowedTypes = [
      "MEDICAL",
      "POLICE",
      "FIRE",
      "ACCIDENT",
      "GENERAL"
    ];

    const normalizedType = type.trim().toUpperCase();
    const normalizedTriggerSource = triggerSource.trim().toUpperCase();

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid SOS type."
      });
    }

    const sosReference = generateSosReference();

    // Get the tourist's most recently stored location.
    const latestLocationResult = await pool.query(
      `SELECT
        latitude,
        longitude,
        accuracy
       FROM locations
       WHERE user_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const latestLocation = latestLocationResult.rows[0] || null;

    // Use coordinates supplied with the SOS when available.
    // Otherwise use the tourist's latest stored location.
    const finalLatitude =
      latitude !== undefined
        ? latitude
        : latestLocation
          ? latestLocation.latitude
          : null;

    const finalLongitude =
      longitude !== undefined
        ? longitude
        : latestLocation
          ? latestLocation.longitude
          : null;

    const finalAccuracy =
      locationAccuracy !== undefined
        ? locationAccuracy
        : latestLocation
          ? latestLocation.accuracy
          : null;

    // Create the main SOS incident.
    const result = await pool.query(
      `INSERT INTO sos_incidents
        (
          sos_reference,
          user_id,
          type,
          status,
          latitude,
          longitude,
          location_accuracy,
          trigger_source,
          sos_type,
          message
        )
       VALUES
        ($1, $2, $3, 'ACTIVE', $4, $5, $6, $7, 'MANUAL', $8)
       RETURNING *`,
      [
        sosReference,
        req.user.id,
        normalizedType,
        finalLatitude,
        finalLongitude,
        finalAccuracy,
        normalizedTriggerSource,
        message ? message.trim() : null
      ]
    );

    const incident = result.rows[0];

    // Record the SOS creation event.
    await pool.query(
      `INSERT INTO sos_events
        (
          sos_incident_id,
          event_type,
          actor_type,
          actor_id,
          metadata
        )
       VALUES
        ($1, 'SOS_CREATED', 'TOURIST', $2, $3)`,
      [
        incident.id,
        req.user.id,
        JSON.stringify({
          triggerSource: normalizedTriggerSource,
          locationSource:
            latitude !== undefined && longitude !== undefined
              ? "SOS_REQUEST"
              : latestLocation
                ? "LATEST_STORED_LOCATION"
                : "UNAVAILABLE"
        })
      ]
    );

    // Prepare alerts for the tourist, emergency contacts,
    // and police dashboard.
    const alerts = await prepareSosAlerts(
      req.user.id,
      incident
    );

    return res.status(201).json({
      success: true,
      message: "SOS activated successfully.",
      sos: incident,
      alerts
    });
  } catch (error) {
    console.error("Create SOS error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to activate SOS."
    });
  }
}

async function getMySos(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM sos_incidents
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      sosIncidents: result.rows
    });
  } catch (error) {
    console.error("Get SOS history error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch SOS history."
    });
  }
}

async function getSosByIdOrReference(req, res) {
  try {
    const { id } = req.params;

    const reqUserResult = await pool.query(
      `SELECT id, phone, role FROM users WHERE id = $1`,
      [req.user.id]
    );
    const reqUser = reqUserResult.rows[0];
    if (!reqUser) {
      return res.status(401).json({ success: false, message: "User not found." });
    }

    const result = await pool.query(
      `SELECT
        s.*,
        u.tourist_uid,
        u.full_name,
        u.phone,
        u.email,
        latest_loc.latitude AS latest_latitude,
        latest_loc.longitude AS latest_longitude,
        latest_loc.accuracy AS latest_accuracy,
        latest_loc.recorded_at AS latest_location_time
       FROM sos_incidents s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN LATERAL (
         SELECT latitude, longitude, accuracy, recorded_at
         FROM locations
         WHERE user_id = s.user_id
         ORDER BY recorded_at DESC
         LIMIT 1
       ) latest_loc ON TRUE
       WHERE (s.id::text = $1 OR s.sos_reference = $1)
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "SOS incident not found."
      });
    }

    const incident = result.rows[0];

    const isOwner = incident.user_id === reqUser.id;

    let isAuthorizedContact = false;
    if (!isOwner && reqUser.phone) {
      const contactCheck = await pool.query(
        `SELECT 1 FROM emergency_contacts
         WHERE user_id = $1
           AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE($2, '\\D', '', 'g'), 10)
         LIMIT 1`,
        [incident.user_id, reqUser.phone]
      );
      isAuthorizedContact = contactCheck.rows.length > 0;
    }

    const isPrivileged = reqUser.role === "POLICE" || reqUser.role === "ADMIN";

    if (!isOwner && !isAuthorizedContact && !isPrivileged) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this emergency incident."
      });
    }

    return res.json({
      success: true,
      sos: {
        id: incident.id,
        sos_reference: incident.sos_reference,
        type: incident.type,
        status: incident.status,
        latitude: incident.latest_latitude !== null ? incident.latest_latitude : incident.latitude,
        longitude: incident.latest_longitude !== null ? incident.latest_longitude : incident.longitude,
        location_accuracy: incident.latest_accuracy !== null ? incident.latest_accuracy : incident.location_accuracy,
        initial_latitude: incident.latitude,
        initial_longitude: incident.longitude,
        trigger_source: incident.trigger_source,
        message: incident.message,
        created_at: incident.created_at,
        acknowledged_at: incident.acknowledged_at,
        resolved_at: incident.resolved_at
      },
      tourist: {
        id: incident.user_id,
        tourist_uid: incident.tourist_uid,
        full_name: incident.full_name,
        phone: incident.phone
      }
    });
  } catch (error) {
    console.error("Get SOS details error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch SOS details."
    });
  }
}

module.exports = {
  createSos,
  getMySos,
  getSosByIdOrReference
};