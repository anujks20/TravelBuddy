const fs = require("fs");
const path = require("path");
const pool = require("./db");

async function runMigration() {
  try {
    const migrationPath = path.join(
      __dirname,
      "trip_migration.sql"
    );

    const migration = fs.readFileSync(
      migrationPath,
      "utf8"
    );

    await pool.query(migration);

    console.log(
      "TravelBuddy trip database migration completed successfully."
    );
  } catch (error) {
    console.error(
      "Trip database migration failed:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runMigration();
