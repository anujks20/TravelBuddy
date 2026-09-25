const pool = require("../config/db");
const { generateTouristUid } = require("../services/uidService");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");

function deriveIdentityPart(identityNumber) {
  if (!identityNumber || typeof identityNumber !== "string") {
    return "";
  }
  const normalized = identityNumber.trim().toUpperCase();
  const hash = crypto
    .createHash("sha256")
    .update(normalized)
    .digest("hex")
    .toUpperCase();
  return hash.slice(0, 4);
}

async function searchGuest(req, res) {
  try {
    const {
      touristUid,
      identityType,
      identityNumber,
      query,
      phone,
      email
    } = req.body || {};

    let sql = `
      SELECT
        u.id,
        u.tourist_uid,
        u.full_name,
        u.email,
        u.phone,
        u.language,
        u.nationality_code,
        u.identity_type,
        u.identity_verified,
        u.created_at,
        recent_stay.id AS current_stay_id,
        recent_stay.status AS current_stay_status,
        recent_stay.check_in AS current_stay_check_in,
        recent_stay.check_out AS current_stay_check_out,
        recent_stay.booking_reference AS current_stay_booking_ref
      FROM users u
      LEFT JOIN LATERAL (
        SELECT id, status, check_in, check_out, booking_reference
        FROM hotel_stays
        WHERE user_id = u.id AND hotel_id = $1
        ORDER BY check_in DESC
        LIMIT 1
      ) recent_stay ON TRUE
      WHERE 1=1
    `;

    const params = [req.hotel.id];
    let conditions = [];

    if (touristUid && typeof touristUid === "string" && touristUid.trim()) {
      params.push(`%${touristUid.trim().toUpperCase()}%`);
      conditions.push(`UPPER(u.tourist_uid) LIKE $${params.length}`);
    }

    if (identityType && typeof identityType === "string" && identityType.trim()) {
      params.push(identityType.trim().toUpperCase());
      conditions.push(`UPPER(u.identity_type) = $${params.length}`);
    }

    if (identityNumber && typeof identityNumber === "string" && identityNumber.trim().length >= 2) {
      const idPart = deriveIdentityPart(identityNumber);
      params.push(`%-${idPart}-%`);
      conditions.push(`u.tourist_uid LIKE $${params.length}`);
    }

    if (phone && typeof phone === "string" && phone.trim()) {
      const cleanPhone = phone.replace(/\D/g, "");
      params.push(`%${cleanPhone}%`);
      conditions.push(`regexp_replace(u.phone, '[^0-9]', '', 'g') LIKE $${params.length}`);
    }

    if (email && typeof email === "string" && email.trim()) {
      params.push(`%${email.trim().toLowerCase()}%`);
      conditions.push(`LOWER(u.email) LIKE $${params.length}`);
    }

    if (query && typeof query === "string" && query.trim()) {
      const cleanQuery = query.trim();
      params.push(`%${cleanQuery}%`);
      const qIndex = params.length;
      conditions.push(`(
        u.tourist_uid ILIKE $${qIndex} OR
        u.full_name ILIKE $${qIndex} OR
        u.email ILIKE $${qIndex} OR
        u.phone ILIKE $${qIndex}
      )`);
    }

    if (conditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a Tourist UID, Identity Number, Phone, Email, or Search query."
      });
    }

    sql += " AND (" + conditions.join(" OR ") + ")";
    sql += " ORDER BY u.created_at DESC LIMIT 20";

    const result = await pool.query(sql, params);

    return res.json({
      success: true,
      count: result.rows.length,
      tourists: result.rows
    });
  } catch (error) {
    console.error("Hotel search guest error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to search for tourist."
    });
  }
}

async function createStay(req, res) {
  try {
    const {
      userId,
      touristUid,
      checkIn,
      checkOut,
      bookingReference,
      status
    } = req.body || {};

    if (!checkIn) {
      return res.status(400).json({
        success: false,
        message: "Check-in date/time is required."
      });
    }

    let targetUserId = userId;

    if (!targetUserId && touristUid) {
      const userLookup = await pool.query(
        "SELECT id FROM users WHERE UPPER(tourist_uid) = $1 LIMIT 1",
        [touristUid.trim().toUpperCase()]
      );

      if (userLookup.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Tourist not found with the specified UID."
        });
      }

      targetUserId = userLookup.rows[0].id;
    }

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: "Tourist User ID or Tourist UID is required."
      });
    }

    const userResult = await pool.query(
      `SELECT id, tourist_uid, full_name, email, phone, nationality_code, identity_type, identity_verified
       FROM users WHERE id = $1`,
      [targetUserId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Tourist record not found."
      });
    }

    const tourist = userResult.rows[0];

    const result = await pool.query(
      `INSERT INTO hotel_stays
        (
          user_id,
          hotel_id,
          booking_reference,
          check_in,
          check_out,
          status,
          source
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, 'HOTEL_PORTAL')
       RETURNING *`,
      [
        tourist.id,
        req.hotel.id,
        bookingReference ? bookingReference.trim() : null,
        checkIn,
        checkOut || null,
        status ? status.trim().toUpperCase() : "ACTIVE"
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Hotel stay recorded successfully.",
      stay: result.rows[0],
      tourist
    });
  } catch (error) {
    console.error("Hotel create stay error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to create hotel stay record."
    });
  }
}

async function getStays(req, res) {
  try {
    const { status, query } = req.query || {};

    let sql = `
      SELECT
        hs.id,
        hs.user_id,
        hs.hotel_id,
        hs.trip_id,
        hs.booking_reference,
        hs.check_in,
        hs.check_out,
        hs.status,
        hs.source,
        hs.created_at,
        u.tourist_uid,
        u.full_name AS tourist_name,
        u.email AS tourist_email,
        u.phone AS tourist_phone,
        u.nationality_code,
        u.identity_type,
        u.identity_verified
      FROM hotel_stays hs
      JOIN users u ON u.id = hs.user_id
      WHERE hs.hotel_id = $1
    `;

    const params = [req.hotel.id];

    if (status && status.toUpperCase() !== "ALL") {
      params.push(status.trim().toUpperCase());
      sql += ` AND hs.status = $${params.length}`;
    }

    if (query && query.trim()) {
      params.push(`%${query.trim()}%`);
      const qIndex = params.length;
      sql += ` AND (
        u.full_name ILIKE $${qIndex} OR
        u.tourist_uid ILIKE $${qIndex} OR
        hs.booking_reference ILIKE $${qIndex} OR
        u.phone ILIKE $${qIndex}
      )`;
    }

    sql += " ORDER BY hs.check_in DESC";

    const result = await pool.query(sql, params);

    return res.json({
      success: true,
      count: result.rows.length,
      stays: result.rows
    });
  } catch (error) {
    console.error("Hotel get stays error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch hotel stays."
    });
  }
}

async function getStayDetails(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT
        hs.id,
        hs.user_id,
        hs.hotel_id,
        hs.trip_id,
        hs.booking_reference,
        hs.check_in,
        hs.check_out,
        hs.status,
        hs.source,
        hs.created_at,
        u.tourist_uid,
        u.full_name AS tourist_name,
        u.email AS tourist_email,
        u.phone AS tourist_phone,
        u.language AS tourist_language,
        u.nationality_code,
        u.identity_type,
        u.identity_verified
      FROM hotel_stays hs
      JOIN users u ON u.id = hs.user_id
      WHERE hs.id = $1 AND hs.hotel_id = $2`,
      [id, req.hotel.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stay record not found."
      });
    }

    const stay = result.rows[0];

    const pastStaysResult = await pool.query(
      `SELECT id, booking_reference, check_in, check_out, status, created_at
       FROM hotel_stays
       WHERE user_id = $1 AND hotel_id = $2 AND id != $3
       ORDER BY check_in DESC`,
      [stay.user_id, req.hotel.id, stay.id]
    );

    return res.json({
      success: true,
      stay,
      guestHistory: pastStaysResult.rows
    });
  } catch (error) {
    console.error("Hotel get stay details error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch stay details."
    });
  }
}

async function updateStay(req, res) {
  try {
    const { id } = req.params;
    const { status, checkOut, bookingReference } = req.body || {};

    const allowedStatuses = ["ACTIVE", "COMPLETED", "CANCELLED"];

    if (status && !allowedStatuses.includes(status.trim().toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed: ACTIVE, COMPLETED, CANCELLED."
      });
    }

    const result = await pool.query(
      `UPDATE hotel_stays
       SET
         status = COALESCE($1, status),
         check_out = COALESCE($2, check_out),
         booking_reference = COALESCE($3, booking_reference)
       WHERE id = $4 AND hotel_id = $5
       RETURNING *`,
      [
        status ? status.trim().toUpperCase() : null,
        checkOut || null,
        bookingReference ? bookingReference.trim() : null,
        id,
        req.hotel.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Stay record not found."
      });
    }

    return res.json({
      success: true,
      message: "Stay record updated successfully.",
      stay: result.rows[0]
    });
  } catch (error) {
    console.error("Hotel update stay error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to update stay record."
    });
  }
}

async function getHotelProfile(req, res) {
  try {
    const hotelResult = await pool.query(
      `SELECT * FROM hotels WHERE id = $1`,
      [req.hotel.id]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found."
      });
    }

    const hotel = hotelResult.rows[0];

    const statsResult = await pool.query(
      `SELECT
        COUNT(*) AS total_stays,
        COUNT(*) FILTER (WHERE status = 'ACTIVE') AS active_stays,
        COUNT(*) FILTER (WHERE status = 'COMPLETED') AS completed_stays,
        COUNT(DISTINCT user_id) AS unique_guests
       FROM hotel_stays
       WHERE hotel_id = $1`,
      [req.hotel.id]
    );

    const staffResult = await pool.query(
      `SELECT id, name, email, role, active, created_at
       FROM hotel_users
       WHERE hotel_id = $1
       ORDER BY created_at ASC`,
      [req.hotel.id]
    );

    return res.json({
      success: true,
      hotel,
      stats: statsResult.rows[0],
      staff: staffResult.rows
    });
  } catch (error) {
    console.error("Hotel profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch hotel profile."
    });
  }
}

async function registerTourist(req, res) {
  try {
    const {
      fullName,
      email,
      phone,
      nationalityCode = "IND",
      identityType = "AADHAAR",
      identityNumber
    } = req.body || {};

    if (!fullName || !email || !identityNumber) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, and identity document number are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = phone ? phone.trim().replace(/\D/g, "") : null;
    const normalizedNationality = (nationalityCode || "IND").trim().toUpperCase();
    const normalizedIdentityType = (identityType || "AADHAAR").trim().toUpperCase();
    const normalizedIdNum = identityNumber.trim().toUpperCase();

    // 1. Identity Check: Look for existing tourist by email or phone
    const existingCheck = await pool.query(
      `SELECT id, tourist_uid, full_name, email, phone, nationality_code, identity_type, identity_verified, registered_source, created_at
       FROM users
       WHERE LOWER(email) = $1
          OR ($2::text IS NOT NULL AND $2 <> '' AND regexp_replace(phone, '[^0-9]', '', 'g') = $2)
       LIMIT 1`,
      [normalizedEmail, cleanPhone]
    );

    if (existingCheck.rows.length > 0) {
      const existingTourist = existingCheck.rows[0];
      return res.json({
        success: true,
        message: "Existing tourist identity located. Reusing permanent UID.",
        isExisting: true,
        touristUid: existingTourist.tourist_uid,
        tourist: existingTourist
      });
    }

    // 2. Generate unique Tourist UID
    let touristUid;
    let uidCollision = true;

    while (uidCollision) {
      touristUid = generateTouristUid(normalizedNationality, normalizedIdNum);
      const checkRes = await pool.query("SELECT id FROM users WHERE tourist_uid = $1", [touristUid]);
      uidCollision = checkRes.rows.length > 0;
    }

    // 3. Create initial placeholder password hash for hotel registration
    const tempPassword = crypto.randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const insertResult = await pool.query(
      `INSERT INTO users
        (
          tourist_uid,
          full_name,
          email,
          phone,
          password_hash,
          language,
          nationality_code,
          identity_type,
          identity_verified,
          role,
          registered_source
        )
       VALUES
        ($1, $2, $3, $4, $5, 'English', $6, $7, FALSE, 'TOURIST', 'HOTEL_PORTAL')
       RETURNING
        id,
        tourist_uid,
        full_name,
        email,
        phone,
        language,
        nationality_code,
        identity_type,
        identity_verified,
        role,
        registered_source,
        created_at`,
      [
        touristUid,
        fullName.trim(),
        normalizedEmail,
        phone ? phone.trim() : null,
        passwordHash,
        normalizedNationality,
        normalizedIdentityType
      ]
    );

    const newTourist = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: "Tourist identity registered successfully by hotel.",
      isExisting: false,
      touristUid: newTourist.tourist_uid,
      tourist: newTourist
    });
  } catch (error) {
    console.error("Hotel register tourist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register tourist identity."
    });
  }
}

module.exports = {
  searchGuest,
  registerTourist,
  createStay,
  getStays,
  getStayDetails,
  updateStay,
  getHotelProfile
};
