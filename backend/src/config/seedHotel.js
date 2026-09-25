const pool = require("./db");
const bcrypt = require("bcryptjs");

async function seedHotel() {
  try {
    let hotelRes = await pool.query("SELECT id FROM hotels LIMIT 1");
    let hotelId;

    if (hotelRes.rows.length === 0) {
      const newHotel = await pool.query(
        `INSERT INTO hotels (name, address, city, state, country, phone, partner_status)
         VALUES ('TravelBuddy Partner Hotel', 'MG Road, Taj Ganj', 'Agra', 'Uttar Pradesh', 'India', '0562-223344', true)
         RETURNING id`
      );
      hotelId = newHotel.rows[0].id;
      console.log("Created partner hotel:", hotelId);
    } else {
      hotelId = hotelRes.rows[0].id;
      console.log("Found existing hotel:", hotelId);
    }

    const hash = await bcrypt.hash("hotel123", 10);
    const existing = await pool.query(
      "SELECT id FROM hotel_users WHERE email = $1",
      ["hotel@travelbuddy.com"]
    );

    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO hotel_users (hotel_id, name, email, password_hash, role, active)
         VALUES ($1, 'Front Desk Staff', 'hotel@travelbuddy.com', $2, 'STAFF', true)`,
        [hotelId, hash]
      );
      console.log("Created hotel user hotel@travelbuddy.com with password hotel123");
    } else {
      await pool.query(
        "UPDATE hotel_users SET password_hash = $1, active = true WHERE email = $2",
        [hash, "hotel@travelbuddy.com"]
      );
      console.log("Updated hotel user hotel@travelbuddy.com password to hotel123");
    }
  } catch (error) {
    console.error("Seed hotel error:", error);
  } finally {
    await pool.end();
  }
}

seedHotel();
