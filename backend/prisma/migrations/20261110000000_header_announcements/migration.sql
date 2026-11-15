CREATE TABLE `HeaderAnnouncement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `text` VARCHAR(250) NOT NULL,
    `sortOrder` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `HeaderAnnouncement_sortOrder_key`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `HeaderAnnouncement` (`text`, `sortOrder`) VALUES
    ('Cash on delivery across Pakistan', 0),
    ('Orders for teams, events and brands: request a quote', 1);

