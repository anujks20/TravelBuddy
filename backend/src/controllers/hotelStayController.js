const pool = require("../config/db");

async function createHotelStay(req, res) {
  try {
    const {
      hotelId,
      tripId,
      bookingReference,
      checkIn,
      checkOut,
      source
    } = req.body;

    if (!hotelId || !checkIn) {
      return res.status(400).json({
        success: false,
        message: "Hotel ID and check-in time are required."
      });
    }

    const hotelResult = await pool.query(
      "SELECT id FROM hotels WHERE id = $1",
      [hotelId]
    );

    if (hotelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Hotel not found."
      });
    }

    if (tripId) {
      const tripResult = await pool.query(
        "SELECT id FROM trips WHERE id = $1 AND user_id = $2",
        [tripId, req.user.id]
      );

      if (tripResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Trip not found for this user."
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO hotel_stays
        (
          user_id,
          hotel_id,
          trip_id,
          booking_reference,
          check_in,
          check_out,
          source
        )
       VALUES
        ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        req.user.id,
        hotelId,
        tripId || null,
        bookingReference || null,
        checkIn,
        checkOut || null,
        source || "MANUAL"
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Hotel stay linked successfully.",
      hotelStay: result.rows[0]
    });
  } catch (error) {
    console.error("Create hotel stay error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create hotel stay."
    });
  }
}

async function getMyHotelStays(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        hs.*,
        h.name AS hotel_name,
        h.address AS hotel_address,
        h.city AS hotel_city,
        h.state AS hotel_state,
        h.country AS hotel_country,
        h.phone AS hotel_phone,
        h.partner_status
      FROM hotel_stays hs
      JOIN hotels h ON h.id = hs.hotel_id
      WHERE hs.user_id = $1
      ORDER BY hs.check_in DESC`,
      [req.user.id]
    );

    return res.json({
      success: true,
      hotelStays: result.rows
    });
  } catch (error) {
    console.error("Get hotel stays error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch hotel stays."
    });
  }
}

module.exports = {
  createHotelStay,
  getMyHotelStays
};