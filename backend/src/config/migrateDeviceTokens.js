const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function runDeviceTokenMigration() {
  try {
    const migrationPath = path.join(__dirname, "device_token_migration.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    await pool.query(sql);
    console.log("Device token migration executed successfully.");
  } catch (error) {
    console.error("Device token migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runDeviceTokenMigration();
