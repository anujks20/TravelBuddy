const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function runGeofenceMigration() {
  try {
    const migrationPath = path.join(__dirname, "geofence_migration.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    await pool.query(sql);

    console.log("Geofence and IoT telemetry migration executed successfully.");
  } catch (error) {
    console.error("Geofence migration failed:", error.message);
  } finally {
    await pool.end();
  }
}

runGeofenceMigration();
