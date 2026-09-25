const pool = require("../config/db");
const { sendSms } = require("./smsService");
const { sendEmergencyPushToContacts } = require("./firebaseAdminService");

/**
 * Normalizes phone number to digits only, taking the last 10 digits
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

async function prepareSosAlerts(userId, incident) {
  const userResult = await pool.query(
    `SELECT
      id,
      full_name,
      tourist_uid,
      phone
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [userId]
  );

  const user = userResult.rows[0];

  if (!user) {
    throw new Error("Tourist account not found.");
  }

  // Resolve emergency contacts and check if they correspond to registered TravelBuddy users with FCM device tokens.
  // CRITICAL: We ensure u.id != $1 so we NEVER push to the tourist's own device tokens!
  const contactsQuery = await pool.query(
    `SELECT
      ec.id AS contact_id,
      ec.name AS contact_name,
      ec.phone AS contact_phone,
      ec.relationship,
      ec.priority,
      u.id AS friend_user_id,
      u.full_name AS friend_full_name,
      u.phone AS friend_phone,
      udt.fcm_token,
      udt.platform
    FROM emergency_contacts ec
    LEFT JOIN users u
      ON RIGHT(REGEXP_REPLACE(u.phone, '\\D', '', 'g'), 10) = RIGHT(REGEXP_REPLACE(ec.phone, '\\D', '', 'g'), 10)
      AND u.id != $1
    LEFT JOIN user_device_tokens udt
      ON udt.user_id = u.id
    WHERE ec.user_id = $1
    ORDER BY ec.priority ASC, ec.created_at ASC`,
    [userId]
  );

  // Group tokens and details by contact ID
  const contactsMap = new Map();

  for (const row of contactsQuery.rows) {
    if (!contactsMap.has(row.contact_id)) {
      contactsMap.set(row.contact_id, {
        contactId: row.contact_id,
        name: row.contact_name,
        phone: row.contact_phone,
        relationship: row.relationship,
        priority: row.priority,
        isRegisteredUser: Boolean(row.friend_user_id),
        friendUserId: row.friend_user_id || null,
        friendName: row.friend_full_name || null,
        tokens: []
      });
    }

    if (row.fcm_token) {
      contactsMap.get(row.contact_id).tokens.push(row.fcm_token);
    }
  }

  const locationText =
    incident.latitude !== null && incident.longitude !== null
      ? `${incident.latitude}, ${incident.longitude}`
      : "Location unavailable";

  const smsMessage =
    `TravelBuddy EMERGENCY ALERT: ${user.full_name} ` +
    `(${user.tourist_uid}) has activated an SOS. ` +
    `SOS Reference: ${incident.sos_reference}. ` +
    `Location: ${locationText}.`;

  const emergencyContactAlerts = [];

  for (const contact of contactsMap.values()) {
    let pushResult = {
      required: true,
      status: "NOT_REGISTERED",
      tokenCount: 0
    };

    if (contact.isRegisteredUser) {
      if (contact.tokens.length > 0) {
        // Send high-priority FCM emergency push to friend's device(s)
        const pushDispatch = await sendEmergencyPushToContacts({
          tokens: contact.tokens,
          touristName: user.full_name,
          sosReference: incident.sos_reference,
          incidentId: incident.id,
          touristId: user.tourist_uid,
          latitude: incident.latitude,
          longitude: incident.longitude,
          accuracy: incident.location_accuracy,
          type: incident.type
        });

        pushResult = {
          required: true,
          status: pushDispatch.status,
          successCount: pushDispatch.successCount || 0,
          failureCount: pushDispatch.failureCount || 0,
          tokenCount: contact.tokens.length,
          message: pushDispatch.message || null
        };

        await pool.query(
          `INSERT INTO sos_events
            (sos_incident_id, event_type, actor_type, actor_id, metadata)
           VALUES ($1, 'PUSH_ALERT_DISPATCHED', 'SYSTEM', NULL, $2)`,
          [
            incident.id,
            JSON.stringify({
              contactId: contact.contactId,
              friendUserId: contact.friendUserId,
              tokensAttempted: contact.tokens.length,
              status: pushDispatch.status
            })
          ]
        );
      } else {
        pushResult = {
          required: true,
          status: "NO_ACTIVE_DEVICE_TOKENS",
          tokenCount: 0,
          message: "Contact is registered but has not logged into mobile device."
        };
      }
    }

    // Always attempt mock SMS fallback
    const smsResult = await sendSms({
      to: contact.phone,
      message: smsMessage,
      sosReference: incident.sos_reference
    });

    emergencyContactAlerts.push({
      contactId: contact.contactId,
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      priority: contact.priority,
      isRegisteredUser: contact.isRegisteredUser,
      push: pushResult,
      sms: {
        required: true,
        status: smsResult.status,
        provider: smsResult.provider || null,
        message: smsMessage
      }
    });

    await pool.query(
      `INSERT INTO sos_events
        (sos_incident_id, event_type, actor_type, actor_id, metadata)
       VALUES ($1, 'SMS_ALERT_ATTEMPTED', 'SYSTEM', NULL, $2)`,
      [
        incident.id,
        JSON.stringify({
          contactId: contact.contactId,
          phone: contact.phone,
          status: smsResult.status,
          provider: smsResult.provider || "MOCK_SMS"
        })
      ]
    );
  }

  const alerts = {
    tourist: {
      siren: {
        required: true,
        status: "TRIGGER_LOCAL_APP"
      }
    },
    emergencyContacts: emergencyContactAlerts,
    police: {
      required: true,
      status: "AVAILABLE_IN_ACTIVE_SOS_FEED",
      sosReference: incident.sos_reference
    }
  };

  await pool.query(
    `INSERT INTO sos_events
      (sos_incident_id, event_type, actor_type, actor_id, metadata)
     VALUES ($1, 'ALERTS_PREPARED', 'SYSTEM', NULL, $2)`,
    [
      incident.id,
      JSON.stringify({
        emergencyContactCount: contactsMap.size,
        pushDispatchedCount: emergencyContactAlerts.filter(a => a.push.status === "DELIVERED").length,
        smsAlertCount: emergencyContactAlerts.length,
        policeAlert: true,
        touristSiren: true
      })
    ]
  );

  return alerts;
}

module.exports = {
  prepareSosAlerts,
  normalizePhone
};