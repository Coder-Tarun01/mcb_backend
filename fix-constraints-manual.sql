-- Manual database constraint fix
-- Run this script in your MySQL database to fix the constraint issues

-- First, check what constraints exist on saved_jobs table
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'saved_jobs' 
AND TABLE_SCHEMA = DATABASE()
AND CONSTRAINT_NAME LIKE 'saved_jobs_ibfk_%';

-- Drop the problematic constraint if it exists
-- (Replace 'saved_jobs_ibfk_41' with the actual constraint name from the query above)
ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_ibfk_41`;

-- If the above fails, try dropping all foreign key constraints on saved_jobs
-- (Uncomment the lines below if needed)

-- ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_ibfk_1`;
-- ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_ibfk_2`;
-- ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_ibfk_3`;
-- ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_ibfk_4`;
-- ALTER TABLE `saved_jobs` DROP FOREIGN KEY `saved_jobs_ibfk_5`;

-- Check if the table structure is correct
DESCRIBE `saved_jobs`;

-- If needed, recreate the table with proper structure
-- (Only run this if the table is corrupted)

-- DROP TABLE IF EXISTS `saved_jobs`;
-- CREATE TABLE `saved_jobs` (
--   `id` int NOT NULL AUTO_INCREMENT,
--   `userId` int NOT NULL,
--   `jobId` int NOT NULL,
--   `savedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   `createdAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   `updatedAt` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
--   PRIMARY KEY (`id`),
--   UNIQUE KEY `saved_jobs_userId_jobId_key` (`userId`,`jobId`),
--   KEY `saved_jobs_userId_fkey` (`userId`),
--   KEY `saved_jobs_jobId_fkey` (`jobId`),
--   CONSTRAINT `saved_jobs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
--   CONSTRAINT `saved_jobs_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
