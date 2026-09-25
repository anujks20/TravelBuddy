const bcrypt = require("bcryptjs");
const pool = require("./db");
require("dotenv").config();

async function syncPasswords() {
  try {
    const policeHash = await bcrypt.hash("police123", 10);
    await pool.query("UPDATE police_users SET password_hash = $1 WHERE email = $2", [
      policeHash,
      "police@travelbuddy.com"
    ]);

    const userHash = await bcrypt.hash("password123", 10);
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [
      userHash,
      "test@travelbuddy.com"
    ]);

    const hotelHash = await bcrypt.hash("hotel123", 10);
    await pool.query("UPDATE hotel_users SET password_hash = $1 WHERE email = $2", [
      hotelHash,
      "hotel@travelbuddy.com"
    ]);

    console.log("Demo credentials synced successfully:");
    console.log("Tourist (Mobile): test@travelbuddy.com / password123");
    console.log("Police Command: police@travelbuddy.com / police123");
    console.log("Hotel Portal: hotel@travelbuddy.com / hotel123");
  } catch (err) {
    console.error("Failed to sync demo passwords:", err.message);
  } finally {
    await pool.end();
  }
}

syncPasswords();
