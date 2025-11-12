-- Forward migration: create marketing_contacts table
CREATE TABLE IF NOT EXISTS marketing_contacts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(191) NOT NULL,
  email VARCHAR(191) NOT NULL,
  mobile_no VARCHAR(32) DEFAULT NULL,
  branch VARCHAR(191) DEFAULT NULL,
  experience VARCHAR(191) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_marketing_contacts_email (email),
  KEY idx_marketing_contacts_branch_experience (branch, experience)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Backward migration: drop marketing_contacts table
DROP TABLE IF EXISTS marketing_contacts;


