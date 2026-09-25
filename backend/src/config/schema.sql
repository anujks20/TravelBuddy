CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tourist_uid VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash TEXT NOT NULL,
    language VARCHAR(20) DEFAULT 'English',
    nationality_code VARCHAR(3),
    profile_photo_url TEXT,
    identity_type VARCHAR(20),
    identity_verified BOOLEAN DEFAULT FALSE,
    role VARCHAR(20) DEFAULT 'TOURIST',
    registered_source VARCHAR(30) DEFAULT 'SELF',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    relationship VARCHAR(50),
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    destination VARCHAR(150),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'PLANNED',
    is_saved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hotels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    phone VARCHAR(20),
    partner_status BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hotel_stays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hotel_id UUID NOT NULL REFERENCES hotels(id),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    booking_reference VARCHAR(100),
    check_in TIMESTAMPTZ NOT NULL,
    check_out TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    source VARCHAR(30) DEFAULT 'MANUAL',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    heading DECIMAL(10, 2),
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sos_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_reference VARCHAR(30) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),
    location_accuracy DECIMAL(10, 2),
    trigger_source VARCHAR(30) NOT NULL,
    sos_type VARCHAR(30) DEFAULT 'MANUAL',
    device_id VARCHAR(100),
    sensor_data JSONB,
    message TEXT,
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sos_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sos_incident_id UUID NOT NULL REFERENCES sos_incidents(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    actor_type VARCHAR(30),
    actor_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE police_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) DEFAULT 'OFFICER',
    station VARCHAR(150),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hotel_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(30) DEFAULT 'STAFF',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_type VARCHAR(30) NOT NULL,
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    ip_address INET,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_tourist_uid ON users(tourist_uid);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sos_status ON sos_incidents(status);
CREATE INDEX idx_locations_user_id ON locations(user_id);
CREATE INDEX idx_hotel_stays_user_id ON hotel_stays(user_id);
CREATE INDEX idx_sos_user_id ON sos_incidents(user_id);
CREATE INDEX idx_sos_created_at ON sos_incidents(created_at);
