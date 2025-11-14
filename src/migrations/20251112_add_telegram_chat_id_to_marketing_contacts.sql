-- Forward migration: add telegram_chat_id column to marketing_contacts
ALTER TABLE marketing_contacts
  ADD COLUMN telegram_chat_id VARCHAR(64) DEFAULT NULL
    COMMENT 'Telegram chat identifier for marketing digests';

-- Backward migration: drop telegram_chat_id column from marketing_contacts
ALTER TABLE marketing_contacts
  DROP COLUMN telegram_chat_id;


