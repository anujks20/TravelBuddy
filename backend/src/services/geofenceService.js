const pool = require("../config/db");

/**
 * Calculates the Haversine distance between two GPS coordinates in meters.
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates MPU6050 accelerometer & gyroscope metrics for freefall or high-G impact.
 */
function evaluateMpu6050Fall({ ax, ay, az, gx, gy, gz }) {
  if (ax === undefined || ay === undefined || az === undefined) {
    return { fallDetected: false, gForce: 1.0 };
  }

  const numAx = Number(ax);
  const numAy = Number(ay);
  const numAz = Number(az);

  // Acceleration magnitude in Gs
  const gForce = Math.sqrt(numAx * numAx + numAy * numAy + numAz * numAz);

  // Freefall condition (near 0 G) or Violent Impact (> 2.8 G)
  const isFreeFall = gForce < 0.35;
  const isViolentImpact = gForce > 2.8;

  // Angular velocity magnitude (deg/s)
  let gyroMagnitude = 0;
  if (gx !== undefined && gy !== undefined && gz !== undefined) {
    gyroMagnitude = Math.sqrt(
      Number(gx) * Number(gx) +
      Number(gy) * Number(gy) +
      Number(gz) * Number(gz)
    );
  }

  const fallDetected = (isFreeFall || isViolentImpact) && (gyroMagnitude > 150 || isViolentImpact);

  return {
    fallDetected: Boolean(fallDetected),
    gForce: Number(gForce.toFixed(2)),
    gyroMagnitude: Number(gyroMagnitude.toFixed(2)),
    isFreeFall,
    isViolentImpact
  };
}

/**
 * Checks a given latitude and longitude against all active restricted zones.
 * If breached, records an active breach in database and returns warning metadata.
 */
async function checkLocationAgainstZones({
  userId = null,
  latitude,
  longitude,
  source = "PHONE_GPS",
  telemetry = null
}) {
  if (latitude === undefined || longitude === undefined) {
    return { breachDetected: false, zones: [] };
  }

  const numLat = Number(latitude);
  const numLng = Number(longitude);

  const zonesResult = await pool.query(
    `SELECT id, name, description, latitude, longitude, radius_meters, danger_level
     FROM restricted_zones
     WHERE active = TRUE`
  );

  const breachedZones = [];

  for (const zone of zonesResult.rows) {
    const zoneLat = Number(zone.latitude);
    const zoneLng = Number(zone.longitude);
    const radius = Number(zone.radius_meters);

    const distance = calculateDistanceMeters(numLat, numLng, zoneLat, zoneLng);

    if (distance <= radius) {
      breachedZones.push({
        ...zone,
        distanceMeters: Math.round(distance),
        penetrationMeters: Math.max(0, Math.round(radius - distance))
      });
    }
  }

  if (breachedZones.length > 0) {
    const primaryZone = breachedZones[0];

    // Log or update the breach in geofence_breaches table
    let breachRecord = null;
    try {
      const deviceId = telemetry?.device_id || null;

      // Check if an ACTIVE breach already exists for this device/user in this zone
      const existingActive = await pool.query(
        `SELECT id FROM geofence_breaches
         WHERE zone_id = $1
           AND status = 'ACTIVE'
           AND (
             ($2::uuid IS NOT NULL AND user_id = $2)
             OR ($2::uuid IS NULL AND (
               source = $3
               OR ($4::text IS NOT NULL AND telemetry_data->>'device_id' = $4)
             ))
           )
         ORDER BY created_at DESC
         LIMIT 1`,
        [primaryZone.id, userId, source, deviceId]
      );

      if (existingActive.rows.length > 0) {
        // Update existing active breach with latest coordinates and telemetry
        const updateResult = await pool.query(
          `UPDATE geofence_breaches
           SET latitude = $1,
               longitude = $2,
               distance_to_center_meters = $3,
               telemetry_data = $4
           WHERE id = $5
           RETURNING *`,
          [
            numLat,
            numLng,
            primaryZone.distanceMeters,
            telemetry ? JSON.stringify(telemetry) : null,
            existingActive.rows[0].id
          ]
        );
        breachRecord = updateResult.rows[0];
      } else {
        const insertResult = await pool.query(
          `INSERT INTO geofence_breaches
            (
              user_id,
              zone_id,
              source,
              latitude,
              longitude,
              distance_to_center_meters,
              status,
              telemetry_data
            )
           VALUES
            ($1, $2, $3, $4, $5, $6, 'ACTIVE', $7)
           RETURNING *`,
          [
            userId,
            primaryZone.id,
            source,
            numLat,
            numLng,
            primaryZone.distanceMeters,
            telemetry ? JSON.stringify(telemetry) : null
          ]
        );
        breachRecord = insertResult.rows[0];
      }
    } catch (dbErr) {
      console.error("Failed to record geofence breach:", dbErr.message);
    }

    return {
      breachDetected: true,
      playSiren: true,
      primaryZone,
      allBreachedZones: breachedZones,
      breachRecord,
      message: `WARNING: You have entered a restricted danger area (${primaryZone.name}). Immediate retreat recommended.`
    };
  }

  // If outside all danger zones, auto-resolve any prior ACTIVE breach for this device
  try {
    const deviceId = telemetry?.device_id || null;
    await pool.query(
      `UPDATE geofence_breaches
       SET status = 'RESOLVED',
           resolved_at = NOW()
       WHERE status = 'ACTIVE'
         AND (
           ($1::uuid IS NOT NULL AND user_id = $1)
           OR ($1::uuid IS NULL AND (
             source = $2
             OR ($3::text IS NOT NULL AND telemetry_data->>'device_id' = $3)
           ))
         )`,
      [userId, source, deviceId]
    );
  } catch (_) {
    // Non-fatal cleanup
  }

  return {
    breachDetected: false,
    playSiren: false,
    breachedZones: []
  };
}

module.exports = {
  calculateDistanceMeters,
  evaluateMpu6050Fall,
  checkLocationAgainstZones
};
