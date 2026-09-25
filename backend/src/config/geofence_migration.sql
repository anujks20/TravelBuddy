-- Geo-Fencing, Restricted Danger Zones & IoT Telemetry Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Restricted Danger Zones
CREATE TABLE IF NOT EXISTS restricted_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    radius_meters INTEGER NOT NULL DEFAULT 300,
    danger_level VARCHAR(30) DEFAULT 'HIGH', -- 'HIGH', 'CRITICAL', 'RESTRICTED'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_restricted_zones_active ON restricted_zones(active);

-- 2. Geofence Breaches & Violations
CREATE TABLE IF NOT EXISTS geofence_breaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES restricted_zones(id) ON DELETE CASCADE,
    source VARCHAR(50) DEFAULT 'PHONE_GPS', -- 'PHONE_GPS', 'IOT_SENSOR_ESP32', 'WEB_CLIENT'
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    distance_to_center_meters DECIMAL(10, 2),
    status VARCHAR(30) DEFAULT 'ACTIVE', -- 'ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'EXITED'
    telemetry_data JSONB,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_geofence_breaches_status ON geofence_breaches(status);
CREATE INDEX IF NOT EXISTS idx_geofence_breaches_user_id ON geofence_breaches(user_id);
CREATE INDEX IF NOT EXISTS idx_geofence_breaches_created_at ON geofence_breaches(created_at DESC);

-- 3. IoT Device Telemetry (ESP32 + MPU6050 + GPS)
CREATE TABLE IF NOT EXISTS iot_telemetry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ax DECIMAL(8, 4), -- Accelerometer X (g)
    ay DECIMAL(8, 4), -- Accelerometer Y (g)
    az DECIMAL(8, 4), -- Accelerometer Z (g)
    gx DECIMAL(8, 4), -- Gyroscope X (deg/s)
    gy DECIMAL(8, 4), -- Gyroscope Y (deg/s)
    gz DECIMAL(8, 4), -- Gyroscope Z (deg/s)
    pitch DECIMAL(8, 2),
    roll DECIMAL(8, 2),
    fall_detected BOOLEAN DEFAULT FALSE,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    battery_level DECIMAL(5, 2),
    raw_payload JSONB,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_iot_telemetry_device_id ON iot_telemetry(device_id);
CREATE INDEX IF NOT EXISTS idx_iot_telemetry_recorded_at ON iot_telemetry(recorded_at DESC);

-- 4. Seed Default Restricted Zones (Tourist Danger Hotspots)
INSERT INTO restricted_zones (name, description, latitude, longitude, radius_meters, danger_level, active)
SELECT 'Ganga High-Current Rapids Zone', 'Restricted whirlpool and dangerous high-velocity water current sector. Swimming and unauthorized entry prohibited.', 30.0895000, 78.2730000, 350, 'CRITICAL', true
WHERE NOT EXISTS (SELECT 1 FROM restricted_zones WHERE name = 'Ganga High-Current Rapids Zone');

INSERT INTO restricted_zones (name, description, latitude, longitude, radius_meters, danger_level, active)
SELECT 'Neelkanth Cliffside Landslide Hazard', 'Active rockfall and steep cliffside instability area. Road shoulder access restricted.', 30.0762000, 78.3361000, 500, 'HIGH', true
WHERE NOT EXISTS (SELECT 1 FROM restricted_zones WHERE name = 'Neelkanth Cliffside Landslide Hazard');

INSERT INTO restricted_zones (name, description, latitude, longitude, radius_meters, danger_level, active)
SELECT 'Military Defense Perimeter Sector 7', 'Protected defense installation border. Civilian and tourist entry strictly forbidden.', 28.6012000, 77.1856000, 450, 'RESTRICTED', true
WHERE NOT EXISTS (SELECT 1 FROM restricted_zones WHERE name = 'Military Defense Perimeter Sector 7');

INSERT INTO restricted_zones (name, description, latitude, longitude, radius_meters, danger_level, active)
SELECT 'Bandra Coastal Tide Surge Zone', 'High-tide surge barrier and submerged rock hazard area.', 19.0435000, 72.8190000, 400, 'HIGH', true
WHERE NOT EXISTS (SELECT 1 FROM restricted_zones WHERE name = 'Bandra Coastal Tide Surge Zone');
