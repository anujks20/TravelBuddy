require('dotenv').config();
const pool = require('../config/db');

async function migrate() {
  try {
    await pool.query(`
      ALTER TABLE sos_incidents 
      ADD COLUMN IF NOT EXISTS sos_type VARCHAR(30) DEFAULT 'MANUAL';

      ALTER TABLE sos_incidents 
      ADD COLUMN IF NOT EXISTS device_id VARCHAR(100);

      ALTER TABLE sos_incidents 
      ADD COLUMN IF NOT EXISTS sensor_data JSONB;

      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS registered_source VARCHAR(30) DEFAULT 'SELF';

      UPDATE sos_incidents 
      SET sos_type = 'MANUAL' 
      WHERE sos_type IS NULL;
    `);

    console.log("Migration executed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrate();
