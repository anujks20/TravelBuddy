const pool = require("../config/db");

async function getActiveSos(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        s.id,
        s.sos_reference,
        s.type,
        s.status,
        s.latitude,
        s.longitude,
        s.location_accuracy,
        s.trigger_source,
        COALESCE(s.sos_type, CASE WHEN s.trigger_source ILIKE '%IOT%' THEN 'IOT ALERT' ELSE 'MANUAL' END) AS sos_type,
        s.device_id,
        s.sensor_data,
        s.message,
        s.acknowledged_at,
        s.resolved_at,
        s.created_at,

        u.tourist_uid,
        u.full_name,
        u.phone,
        u.email,
        u.nationality_code,

        latest_location.latitude AS latest_latitude,
        latest_location.longitude AS latest_longitude,
        latest_location.accuracy AS latest_accuracy,
        latest_location.recorded_at AS latest_location_time,

        trip.id AS trip_id,
        trip.title AS trip_title,
        trip.destination AS trip_destination,
        trip.start_date AS trip_start_date,
        trip.end_date AS trip_end_date,

        hotel.id AS hotel_id,
        hotel.name AS hotel_name,
        hotel.address AS hotel_address,
        hotel.city AS hotel_city,
        hotel.state AS hotel_state,

        ec.name AS emergency_contact_name,
        ec.phone AS emergency_contact_phone,
        ec.relationship AS emergency_contact_relationship

      FROM sos_incidents s

      JOIN users u
        ON u.id = s.user_id

      LEFT JOIN LATERAL (
        SELECT
          latitude,
          longitude,
          accuracy,
          recorded_at
        FROM locations
        WHERE user_id = s.user_id
        ORDER BY recorded_at DESC
        LIMIT 1
      ) latest_location ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          t.id,
          t.title,
          t.destination,
          t.start_date,
          t.end_date
        FROM trips t
        WHERE t.user_id = s.user_id
        ORDER BY t.created_at DESC
        LIMIT 1
      ) trip ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          h.id,
          h.name,
          h.address,
          h.city,
          h.state
        FROM hotel_stays hs
        JOIN hotels h
          ON h.id = hs.hotel_id
        WHERE hs.user_id = s.user_id
          AND hs.status = 'ACTIVE'
        ORDER BY hs.check_in DESC
        LIMIT 1
      ) hotel ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          name,
          phone,
          relationship
        FROM emergency_contacts
        WHERE user_id = s.user_id
        ORDER BY priority ASC, created_at ASC
        LIMIT 1
      ) ec ON TRUE

      WHERE s.status IN ('ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED')
      ORDER BY s.created_at DESC`
    );

    return res.json({
      success: true,
      sosIncidents: result.rows
    });
  } catch (error) {
    console.error("Get active SOS error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch active SOS incidents."
    });
  }
}

async function getSosDetails(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        s.*,
        u.tourist_uid,
        u.full_name,
        u.email,
        u.phone,
        u.nationality_code,
        u.language,
        u.identity_type,
        u.identity_verified,

        trip.id AS trip_id,
        trip.title AS trip_title,
        trip.destination AS trip_destination,
        trip.start_date AS trip_start_date,
        trip.end_date AS trip_end_date,

        hotel.id AS hotel_id,
        hotel.name AS hotel_name,
        hotel.address AS hotel_address,
        hotel.city AS hotel_city,
        hotel.state AS hotel_state
      FROM sos_incidents s
      JOIN users u
        ON u.id = s.user_id

      LEFT JOIN LATERAL (
        SELECT
          t.id,
          t.title,
          t.destination,
          t.start_date,
          t.end_date
        FROM trips t
        WHERE t.user_id = s.user_id
        ORDER BY t.created_at DESC
        LIMIT 1
      ) trip ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          h.id,
          h.name,
          h.address,
          h.city,
          h.state
        FROM hotel_stays hs
        JOIN hotels h
          ON h.id = hs.hotel_id
        WHERE hs.user_id = s.user_id
          AND hs.status = 'ACTIVE'
        ORDER BY hs.check_in DESC
        LIMIT 1
      ) hotel ON TRUE

      WHERE s.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "SOS incident not found."
      });
    }

    const incident = result.rows[0];

    const contactsResult = await pool.query(
      `SELECT
        id,
        name,
        phone,
        relationship,
        priority
       FROM emergency_contacts
       WHERE user_id = $1
       ORDER BY priority ASC, created_at ASC`,
      [incident.user_id]
    );

    const eventsResult = await pool.query(
      `SELECT
        id,
        event_type,
        actor_type,
        actor_id,
        metadata,
        created_at
       FROM sos_events
       WHERE sos_incident_id = $1
       ORDER BY created_at ASC`,
      [incident.id]
    );

    const user = {
      id: incident.user_id,
      tourist_uid: incident.tourist_uid,
      full_name: incident.full_name,
      email: incident.email,
      phone: incident.phone,
      nationality_code: incident.nationality_code,
      language: incident.language,
      identity_type: incident.identity_type,
      identity_verified: incident.identity_verified
    };

    return res.json({
      success: true,
      sos: incident,
      user,
      emergencyContacts: contactsResult.rows,
      events: eventsResult.rows
    });
  } catch (error) {
    console.error("Get SOS details error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch SOS details."
    });
  }
}

async function acknowledgeSos(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE sos_incidents
       SET
         status = 'ACKNOWLEDGED',
         acknowledged_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND status = 'ACTIVE'
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active SOS incident not found."
      });
    }

    const incident = result.rows[0];

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
        ($1, 'SOS_ACKNOWLEDGED', 'POLICE', $2, $3)`,
      [
        incident.id,
        req.policeUser.id,
        JSON.stringify({
          station: req.policeUser.station,
          policeRole: req.policeUser.role
        })
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs
        (
          actor_type,
          actor_id,
          action,
          target_type,
          target_id,
          metadata
        )
       VALUES
        (
          'POLICE',
          $1,
          'ACKNOWLEDGE_SOS',
          'SOS_INCIDENT',
          $2,
          $3
        )`,
      [
        req.policeUser.id,
        incident.id,
        JSON.stringify({
          sosReference: incident.sos_reference,
          station: req.policeUser.station
        })
      ]
    );

    return res.json({
      success: true,
      message: "SOS acknowledged successfully.",
      sos: incident
    });
  } catch (error) {
    console.error("Acknowledge SOS error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to acknowledge SOS."
    });
  }
}

async function dispatchSos(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE sos_incidents
       SET
         status = 'DISPATCHED'
       WHERE id = $1
         AND status IN ('ACTIVE', 'ACKNOWLEDGED')
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active or acknowledged SOS incident not found."
      });
    }

    const incident = result.rows[0];

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
        ($1, 'SOS_DISPATCHED', 'POLICE', $2, $3)`,
      [
        incident.id,
        req.policeUser.id,
        JSON.stringify({
          station: req.policeUser.station,
          policeRole: req.policeUser.role
        })
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs
        (
          actor_type,
          actor_id,
          action,
          target_type,
          target_id,
          metadata
        )
       VALUES
        (
          'POLICE',
          $1,
          'DISPATCH_SOS',
          'SOS_INCIDENT',
          $2,
          $3
        )`,
      [
        req.policeUser.id,
        incident.id,
        JSON.stringify({
          sosReference: incident.sos_reference,
          station: req.policeUser.station
        })
      ]
    );

    return res.json({
      success: true,
      message: "Emergency response unit dispatched successfully.",
      sos: incident
    });
  } catch (error) {
    console.error("Dispatch SOS error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to dispatch unit."
    });
  }
}

async function resolveSos(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE sos_incidents
       SET
         status = 'RESOLVED',
         resolved_at = CURRENT_TIMESTAMP,
         resolved_by = $1
       WHERE id = $2
         AND status IN ('ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED')
       RETURNING *`,
      [req.policeUser.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Active SOS incident not found."
      });
    }

    const incident = result.rows[0];

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
        ($1, 'SOS_RESOLVED', 'POLICE', $2, $3)`,
      [
        incident.id,
        req.policeUser.id,
        JSON.stringify({
          station: req.policeUser.station,
          policeRole: req.policeUser.role
        })
      ]
    );

    await pool.query(
      `INSERT INTO audit_logs
        (
          actor_type,
          actor_id,
          action,
          target_type,
          target_id,
          metadata
        )
       VALUES
        (
          'POLICE',
          $1,
          'RESOLVE_SOS',
          'SOS_INCIDENT',
          $2,
          $3
        )`,
      [
        req.policeUser.id,
        incident.id,
        JSON.stringify({
          sosReference: incident.sos_reference,
          station: req.policeUser.station
        })
      ]
    );

    return res.json({
      success: true,
      message: "SOS resolved successfully.",
      sos: incident
    });
  } catch (error) {
    console.error("Resolve SOS error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to resolve SOS."
    });
  }
}

module.exports = {
  getActiveSos,
  getSosDetails,
  acknowledgeSos,
  dispatchSos,
  resolveSos
};