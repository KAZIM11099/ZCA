/*
  Warnings:

  - You are about to drop the column `imageData` on the `customproduct` table. All the data in the column will be lost.
  - You are about to drop the column `imageMimeType` on the `customproduct` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `contactmessage` MODIFY `phone` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `customproduct` DROP COLUMN `imageData`,
    DROP COLUMN `imageMimeType`;

-- AlterTable
ALTER TABLE `product` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `productimage` MODIFY `storageKey` LONGTEXT NOT NULL;
