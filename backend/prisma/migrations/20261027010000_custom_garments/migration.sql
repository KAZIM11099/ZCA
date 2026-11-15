CREATE TABLE `CustomProduct` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    
ame` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(191) NOT NULL,
    `garmentType` VARCHAR(40) NOT NULL,
    `description` TEXT NULL,
    `basePricePaisa` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    UNIQUE INDEX `CustomProduct_slug_key`(`slug`),
    UNIQUE INDEX `CustomProduct_sku_key`(`sku`),
    INDEX `CustomProduct_isActive_createdAt_idx`(`isActive`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CustomDesign`
    MODIFY `productId` INTEGER NULL,
    ADD COLUMN `customProductId` INTEGER NULL,
    ADD INDEX `CustomDesign_userId_createdAt_idx`(`userId`, `createdAt`),
    ADD INDEX `CustomDesign_customProductId_idx`(`customProductId`),
    ADD CONSTRAINT `CustomDesign_customProductId_fkey`
        FOREIGN KEY (`customProductId`) REFERENCES `CustomProduct`(`id`)
        ON DELETE SET NULL ON UPDATE CASCADE;

