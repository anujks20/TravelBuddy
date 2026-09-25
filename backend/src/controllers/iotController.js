const crypto = require("crypto");
const pool = require("../config/db");
const {
  checkLocationAgainstZones,
  evaluateMpu6050Fall
} = require("../services/geofenceService");
const { prepareSosAlerts } = require("../services/sosAlertService");

// Configurable heartbeat / stale timeout (in milliseconds)
const STALE_TIMEOUT_MS = parseInt(process.env.IOT_STALE_TIMEOUT_MS || "12000", 10); // 12 seconds
const EXPECTED_DEVICE_KEY = process.env.IOT_DEVICE_KEY || "tb_iot_esp32_sec_2026";

// In-memory device heartbeat & telemetry state registry
// Map<deviceId, { lastRealTelemetryAt: number, wasOnline: boolean, lastRealPayload: object }>
const deviceHeartbeats = new Map();

/**
 * Validates device credentials and authorization.
 */
function isAuthorizedDevice(req) {
  const headerKey = req.headers["x-iot-device-key"] || req.headers["x-device-key"];
  const authHeader = req.headers["authorization"];
  let bearerKey = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerKey = authHeader.substring(7).trim();
  }
  const bodyKey = req.body && req.body.device_key;

  const providedKey = headerKey || bearerKey || bodyKey;

  // If no secret key is configured in env, allow default fallback key
  return providedKey === EXPECTED_DEVICE_KEY;
}

/**
 * Validates numeric ranges for MPU6050 & device sensor metrics.
 */
function validateTelemetryRanges({ ax, ay, az, gx, gy, gz, pitch, roll, battery_level }) {
  const isNum = (v) => v !== undefined && v !== null && !isNaN(Number(v)) && isFinite(Number(v));

  // Accelerometer range check: -16g to +16g
  if (isNum(ax) && (Number(ax) < -16 || Number(ax) > 16)) return false;
  if (isNum(ay) && (Number(ay) < -16 || Number(ay) > 16)) return false;
  if (isNum(az) && (Number(az) < -16 || Number(az) > 16)) return false;

  // Gyroscope range check: -2000 to +2000 deg/s
  if (isNum(gx) && (Number(gx) < -2000 || Number(gx) > 2000)) return false;
  if (isNum(gy) && (Number(gy) < -2000 || Number(gy) > 2000)) return false;
  if (isNum(gz) && (Number(gz) < -2000 || Number(gz) > 2000)) return false;

  // Inclinometer angles: -180 to +180 deg
  if (isNum(pitch) && (Number(pitch) < -180 || Number(pitch) > 180)) return false;
  if (isNum(roll) && (Number(roll) < -180 || Number(roll) > 180)) return false;

  // Battery percentage: 0 to 100 %
  if (isNum(battery_level) && (Number(battery_level) < 0 || Number(battery_level) > 100)) return false;

  return true;
}

/**
 * Ingests telemetry packet from REAL ESP32 + MPU6050 IoT sensor node.
 */
async function ingestTelemetry(req, res) {
  try {
    // 1. Device Security & Authentication Check
    if (!isAuthorizedDevice(req)) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Invalid or missing IoT device authentication key."
      });
    }

    const {
      device_id,
      user_id = null,
      ax,
      ay,
      az,
      gx,
      gy,
      gz,
      pitch,
      roll,
      latitude,
      longitude,
      battery_level
    } = req.body;

    // 2. Validate Device ID format
    if (!device_id || typeof device_id !== "string" || device_id.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Valid device_id is required."
      });
    }

    const trimmedDeviceId = device_id.trim();

    // 3. Validate Telemetry Ranges
    if (!validateTelemetryRanges(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Malformed telemetry: sensor values outside physically possible ranges."
      });
    }

    // 3. Identify Telemetry Source (REAL vs DEMO)
    const rawSource = req.body.source || req.headers["x-telemetry-source"];
    const isDemo = typeof rawSource === "string" && rawSource.trim().toUpperCase() === "DEMO";
    const telemetrySource = isDemo ? "DEMO" : "REAL";

    // 4. Update Heartbeat & Log Connection Status
    const now = Date.now();
    let existing = deviceHeartbeats.get(trimmedDeviceId);
    if (!existing) {
      existing = {
        lastRealTelemetryAt: 0,
        lastDemoTelemetryAt: 0,
        wasOnline: false,
        lastRealPayload: null,
        lastDemoPayload: null
      };
      deviceHeartbeats.set(trimmedDeviceId, existing);
    }

    if (telemetrySource === "DEMO") {
      const isReturningFromOffline = existing.lastDemoTelemetryAt > 0 && (now - existing.lastDemoTelemetryAt > STALE_TIMEOUT_MS);
      if (!existing.lastDemoTelemetryAt) {
        console.log(`[IoT] DEMO simulator online: ${trimmedDeviceId}`);
      } else if (isReturningFromOffline) {
        console.log(`[IoT] DEMO telemetry restored for: ${trimmedDeviceId}`);
      }
      existing.lastDemoTelemetryAt = now;
    } else {
      const isReturningFromOffline = existing.lastRealTelemetryAt > 0 && (now - existing.lastRealTelemetryAt > STALE_TIMEOUT_MS);
      if (!existing.lastRealTelemetryAt) {
        console.log(`[IoT] REAL ESP32 online: ${trimmedDeviceId}`);
      } else if (isReturningFromOffline) {
        console.log(`[IoT] REAL telemetry restored for: ${trimmedDeviceId}`);
      }
      existing.lastRealTelemetryAt = now;
    }

    existing.wasOnline = true;
    existing.lastTelemetryAt = now;
    existing.lastSource = telemetrySource;

    // 5. Evaluate MPU6050 accelerometer & gyro for free-fall or shock
    const fallAnalysis = evaluateMpu6050Fall({ ax, ay, az, gx, gy, gz });
    const isFall = Boolean(req.body.fall_detected ?? fallAnalysis.fallDetected);

    console.log(
      `[IoT] ${telemetrySource} telemetry received: ${trimmedDeviceId} (gForce=${fallAnalysis.gForce}, fall=${isFall})`
    );

    // 5b. Automated Emergency Incident Creation on Dangerous IoT Impact / Fall
    let createdSosIncident = null;
    if (isFall) {
      try {
        let targetUserId = user_id;
        if (!targetUserId) {
          const userLookup = await pool.query(
            `SELECT id, tourist_uid FROM users WHERE role = 'TOURIST' ORDER BY updated_at DESC LIMIT 1`
          );
          if (userLookup.rows.length > 0) {
            targetUserId = userLookup.rows[0].id;
          }
        }

        if (targetUserId) {
          // Prevent spamming new incidents on every packet if an active SOS already exists
          const existingActive = await pool.query(
            `SELECT id, sos_reference, status FROM sos_incidents 
             WHERE user_id = $1 AND status IN ('ACTIVE', 'ACKNOWLEDGED', 'DISPATCHED')
             LIMIT 1`,
            [targetUserId]
          );

          if (existingActive.rows.length === 0) {
            const randomHex = crypto.randomBytes(4).toString("hex").toUpperCase();
            const sosRef = `SOS-IOT-${randomHex}`;

            const impactDescription = fallAnalysis.isViolentImpact
              ? `High-G violent impact (${fallAnalysis.gForce}G > 2.8G threshold)`
              : `Sudden free-fall and shock (${fallAnalysis.gForce}G)`;

            const incidentResult = await pool.query(
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
                  device_id,
                  sensor_data,
                  message
                )
               VALUES
                ($1, $2, 'ACCIDENT', 'ACTIVE', $3, $4, 10.0, 'IOT_ALERT', 'IOT ALERT', $5, $6, $7)
               RETURNING *`,
              [
                sosRef,
                targetUserId,
                latitude !== undefined ? Number(latitude) : null,
                longitude !== undefined ? Number(longitude) : null,
                trimmedDeviceId,
                JSON.stringify({
                  gForce: fallAnalysis.gForce,
                  gyroMagnitude: fallAnalysis.gyroMagnitude,
                  isFreeFall: fallAnalysis.isFreeFall,
                  isViolentImpact: fallAnalysis.isViolentImpact,
                  ax,
                  ay,
                  az,
                  gx,
                  gy,
                  gz,
                  pitch,
                  roll,
                  battery_level,
                  source: telemetrySource
                }),
                `🚨 [AUTOMATED IOT IMPACT ALERT] Dangerous event detected by node ${trimmedDeviceId}. ${impactDescription}. Rotation: ${fallAnalysis.gyroMagnitude || 0}°/s.`
              ]
            );

            createdSosIncident = incidentResult.rows[0];

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
                ($1, 'IOT_FALL_DETECTED', 'IOT_DEVICE', $2, $3)`,
              [
                createdSosIncident.id,
                targetUserId,
                JSON.stringify({
                  deviceId: trimmedDeviceId,
                  telemetrySource,
                  gForce: fallAnalysis.gForce,
                  isFreeFall: fallAnalysis.isFreeFall,
                  isViolentImpact: fallAnalysis.isViolentImpact
                })
              ]
            );

            try {
              await prepareSosAlerts(targetUserId, createdSosIncident);
            } catch (alertErr) {
              console.error("[IoT] Error preparing SOS alerts:", alertErr);
            }

            console.log(`[IoT] 🚨 Emergency SOS Created: ${createdSosIncident.sos_reference} (Type: IOT ALERT)`);
          } else {
            console.log(`[IoT] Active SOS already exists for tourist (${existingActive.rows[0].sos_reference}). Suppressing duplicate alert.`);
          }
        }
      } catch (sosCreateErr) {
        console.error("[IoT] Failed to create emergency incident from telemetry:", sosCreateErr);
      }
    }

    // 6. Check geofence status if GPS coordinates are provided by the node
    let geofenceResult = { breachDetected: false, playSiren: false };
    if (latitude !== undefined && longitude !== undefined) {
      geofenceResult = await checkLocationAgainstZones({
        userId: user_id,
        latitude,
        longitude,
        source: telemetrySource === "DEMO" ? "IOT_SENSOR_DEMO" : "IOT_SENSOR_ESP32",
        telemetry: {
          device_id: trimmedDeviceId,
          source: telemetrySource,
          ax,
          ay,
          az,
          gx,
          gy,
          gz,
          pitch,
          roll,
          battery_level,
          fall_detected: isFall,
          gForce: fallAnalysis.gForce
        }
      });
    }

    // 7. Insert telemetry into iot_telemetry table with source = telemetrySource
    const result = await pool.query(
      `INSERT INTO iot_telemetry
        (
          device_id,
          user_id,
          ax,
          ay,
          az,
          gx,
          gy,
          gz,
          pitch,
          roll,
          fall_detected,
          latitude,
          longitude,
          battery_level,
          raw_payload,
          source
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        trimmedDeviceId,
        user_id,
        ax !== undefined ? Number(ax) : null,
        ay !== undefined ? Number(ay) : null,
        az !== undefined ? Number(az) : null,
        gx !== undefined ? Number(gx) : null,
        gy !== undefined ? Number(gy) : null,
        gz !== undefined ? Number(gz) : null,
        pitch !== undefined ? Number(pitch) : null,
        roll !== undefined ? Number(roll) : null,
        isFall,
        latitude !== undefined ? Number(latitude) : null,
        longitude !== undefined ? Number(longitude) : null,
        battery_level !== undefined ? Number(battery_level) : null,
        JSON.stringify(req.body),
        telemetrySource
      ]
    );

    if (telemetrySource === "DEMO") {
      existing.lastDemoPayload = result.rows[0];
    } else {
      existing.lastRealPayload = result.rows[0];
    }

    const statusLabel = telemetrySource === "DEMO" ? "🟢 DEMO IoT ONLINE" : "🟢 REAL IoT ONLINE";

    return res.status(201).json({
      success: true,
      source: telemetrySource,
      online: true,
      status_label: statusLabel,
      message: `${telemetrySource} IoT telemetry processed successfully.`,
      device_id: trimmedDeviceId,
      fall_detected: isFall,
      gForce: fallAnalysis.gForce,
      geofence_breach: geofenceResult.breachDetected,
      play_siren: geofenceResult.playSiren,
      zone_warning: geofenceResult.message || null,
      sos_incident: createdSosIncident ? {
        id: createdSosIncident.id,
        sos_reference: createdSosIncident.sos_reference,
        sos_type: "IOT ALERT",
        status: createdSosIncident.status
      } : null,
      telemetry: {
        ...result.rows[0],
        source: telemetrySource,
        online: true,
        status_label: statusLabel,
        last_seen: new Date(now).toISOString()
      }
    });
  } catch (error) {
    console.error("Ingest IoT telemetry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process IoT telemetry."
    });
  }
}

/**
 * Generates smooth, realistic simulated telemetry values.
 * This runs when no real ESP32 is connected or when the connection goes stale.
 */
function generateSimulatedTelemetry(deviceId) {
  // Minor natural human tremor noise around 1G stationary upright position
  const noiseX = (Math.random() - 0.5) * 0.04;
  const noiseY = (Math.random() - 0.5) * 0.04;
  const noiseZ = (Math.random() - 0.5) * 0.04;

  const ax = Number((0.02 + noiseX).toFixed(4));
  const ay = Number((-0.01 + noiseY).toFixed(4));
  const az = Number((0.98 + noiseZ).toFixed(4));

  const gx = Number(((Math.random() - 0.5) * 1.5).toFixed(2));
  const gy = Number(((Math.random() - 0.5) * 1.5).toFixed(2));
  const gz = Number(((Math.random() - 0.5) * 0.8).toFixed(2));

  const gForce = Number(Math.sqrt(ax * ax + ay * ay + az * az).toFixed(2));
  const pitch = Number((Math.atan2(ay, Math.sqrt(ax * ax + az * az)) * (180 / Math.PI)).toFixed(2));
  const roll = Number((Math.atan2(-ax, az) * (180 / Math.PI)).toFixed(2));

  return {
    id: "simulated-" + Date.now(),
    device_id: deviceId,
    ax,
    ay,
    az,
    gx,
    gy,
    gz,
    pitch,
    roll,
    gForce,
    fall_detected: false,
    free_fall: false,
    impact: false,
    latitude: 30.0895,
    longitude: 78.2730,
    battery_level: 92.0,
    source: "SIMULATION",
    online: false,
    recorded_at: new Date().toISOString()
  };
}

/**
 * Gets latest telemetry for a device.
 * Automatically selects REAL telemetry when ESP32 is online.
 * Selects DEMO telemetry when DEMO simulator is active.
 * Automatically falls back to SIMULATION when both are offline or stale.
 */
async function getLatestTelemetry(req, res) {
  try {
    const { deviceId } = req.params;

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: "deviceId parameter is required."
      });
    }

    const now = Date.now();
    const heartbeat = deviceHeartbeats.get(deviceId);
    const isRealActive = Boolean(heartbeat && heartbeat.lastRealTelemetryAt && (now - heartbeat.lastRealTelemetryAt <= STALE_TIMEOUT_MS));
    const isDemoActive = Boolean(!isRealActive && heartbeat && heartbeat.lastDemoTelemetryAt && (now - heartbeat.lastDemoTelemetryAt <= STALE_TIMEOUT_MS));

    // If device was online but just crossed the stale threshold:
    if (heartbeat && heartbeat.wasOnline && !isRealActive && !isDemoActive) {
      heartbeat.wasOnline = false;
      console.log(`[IoT] Device offline / stale: ${deviceId}`);
      console.log(`[IoT] SIMULATION fallback active for: ${deviceId}`);
    }

    // SCENARIO 1: REAL ESP32 TELEMETRY IS ACTIVE
    if (isRealActive) {
      const result = await pool.query(
        `SELECT *
         FROM iot_telemetry
         WHERE device_id = $1 AND source = 'REAL'
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [deviceId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const numAx = Number(row.ax ?? 0);
        const numAy = Number(row.ay ?? 0);
        const numAz = Number(row.az ?? 1);
        const gForce = Number(Math.sqrt(numAx * numAx + numAy * numAy + numAz * numAz).toFixed(2));

        return res.json({
          success: true,
          source: "REAL",
          online: true,
          status_label: "🟢 REAL IoT ONLINE",
          last_seen: new Date(heartbeat.lastRealTelemetryAt).toISOString(),
          telemetry: {
            ...row,
            gForce,
            source: "REAL",
            online: true,
            status_label: "🟢 REAL IoT ONLINE",
            last_seen: new Date(heartbeat.lastRealTelemetryAt).toISOString()
          }
        });
      }
    }

    // SCENARIO 2: DEMO SIMULATOR TELEMETRY IS ACTIVE
    if (isDemoActive) {
      const result = await pool.query(
        `SELECT *
         FROM iot_telemetry
         WHERE device_id = $1 AND source = 'DEMO'
         ORDER BY recorded_at DESC
         LIMIT 1`,
        [deviceId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        const numAx = Number(row.ax ?? 0);
        const numAy = Number(row.ay ?? 0);
        const numAz = Number(row.az ?? 1);
        const gForce = Number(Math.sqrt(numAx * numAx + numAy * numAy + numAz * numAz).toFixed(2));

        return res.json({
          success: true,
          source: "DEMO",
          online: true,
          status_label: "🟢 DEMO IoT ONLINE",
          last_seen: new Date(heartbeat.lastDemoTelemetryAt).toISOString(),
          telemetry: {
            ...row,
            gForce,
            source: "DEMO",
            online: true,
            status_label: "🟢 DEMO IoT ONLINE",
            last_seen: new Date(heartbeat.lastDemoTelemetryAt).toISOString()
          }
        });
      }
    }

    // SCENARIO 3: NEITHER REAL NOR DEMO IS ACTIVE -> SIMULATION FALLBACK
    const simulated = generateSimulatedTelemetry(deviceId);
    const lastActiveTime = heartbeat
      ? Math.max(heartbeat.lastRealTelemetryAt || 0, heartbeat.lastDemoTelemetryAt || 0)
      : 0;

    return res.json({
      success: true,
      source: "SIMULATION",
      online: false,
      status_label: "🟡 SIMULATION / DEVICE OFFLINE",
      last_seen: lastActiveTime > 0 ? new Date(lastActiveTime).toISOString() : null,
      telemetry: {
        ...simulated,
        status_label: "🟡 SIMULATION / DEVICE OFFLINE"
      }
    });
  } catch (error) {
    console.error("Get latest telemetry error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve telemetry."
    });
  }
}

/**
 * Gets real-time connection and telemetry health for an IoT device.
 */
async function getDeviceHealth(req, res) {
  try {
    const { deviceId } = req.params;
    const now = Date.now();
    const heartbeat = deviceHeartbeats.get(deviceId);
    const isRealActive = Boolean(heartbeat && heartbeat.lastRealTelemetryAt && (now - heartbeat.lastRealTelemetryAt <= STALE_TIMEOUT_MS));
    const isDemoActive = Boolean(!isRealActive && heartbeat && heartbeat.lastDemoTelemetryAt && (now - heartbeat.lastDemoTelemetryAt <= STALE_TIMEOUT_MS));

    let activeSource = "SIMULATION";
    let isOnline = false;
    let statusLabel = "🟡 SIMULATION / DEVICE OFFLINE";

    if (isRealActive) {
      activeSource = "REAL";
      isOnline = true;
      statusLabel = "🟢 REAL IoT ONLINE";
    } else if (isDemoActive) {
      activeSource = "DEMO";
      isOnline = true;
      statusLabel = "🟢 DEMO IoT ONLINE";
    }

    const lastActiveTime = heartbeat
      ? Math.max(heartbeat.lastRealTelemetryAt || 0, heartbeat.lastDemoTelemetryAt || 0)
      : 0;

    return res.json({
      success: true,
      deviceId,
      source: activeSource,
      online: isOnline,
      status_label: statusLabel,
      last_seen: lastActiveTime > 0 ? new Date(lastActiveTime).toISOString() : null,
      staleTimeoutSeconds: Math.round(STALE_TIMEOUT_MS / 1000)
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check device health."
    });
  }
}

module.exports = {
  ingestTelemetry,
  getLatestTelemetry,
  getDeviceHealth
};
