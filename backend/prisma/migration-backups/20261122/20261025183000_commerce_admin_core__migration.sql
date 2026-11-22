ALTER TABLE `Order`
    ADD COLUMN `customerNotes` TEXT NULL;

ALTER TABLE `Product`
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_expiresAt_idx`(`userId`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Quote` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    
ame` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `projectType` VARCHAR(191) NOT NULL,
    `details` TEXT NOT NULL,
    `status` ENUM('NEW', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'COMPLETED') NOT NULL DEFAULT 'NEW',
    `quotedPricePaisa` INTEGER NULL,
    `internalNotes` TEXT NULL,
    `userId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Quote_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Quote_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `Shipment_orderId_key` ON `Shipment`(`orderId`);

ALTER TABLE `Session`
    ADD CONSTRAINT `Session_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Quote`
    ADD CONSTRAINT `Quote_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

