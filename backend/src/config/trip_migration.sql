ALTER TABLE trips
ADD COLUMN IF NOT EXISTS planner_metadata JSONB;

ALTER TABLE trips
ADD COLUMN IF NOT EXISTS itinerary JSONB;

CREATE INDEX IF NOT EXISTS idx_trips_user_start_date
ON trips(user_id, start_date DESC);

CREATE INDEX IF NOT EXISTS idx_trips_destination
ON trips(destination);
