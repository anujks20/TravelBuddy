CREATE TABLE IF NOT EXISTS processed_messages (
    message_id VARCHAR(255) PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_processed_at
ON processed_messages(processed_at);
