DELETE FROM `HeaderAnnouncement`
WHERE `id` NOT IN (
    SELECT `id`
    FROM (
        SELECT MIN(`id`) AS `id`
        FROM `HeaderAnnouncement`
    ) AS `announcementToKeep`
);

UPDATE `HeaderAnnouncement`
SET `text` = 'Cash on delivery across Pakistan',
    `sortOrder` = 0;

INSERT INTO `HeaderAnnouncement` (`text`, `sortOrder`)
SELECT 'Cash on delivery across Pakistan', 0
WHERE NOT EXISTS (SELECT 1 FROM `HeaderAnnouncement`);

