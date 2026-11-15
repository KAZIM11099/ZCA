-- AlterTable
ALTER TABLE `CarouselImage`
    ADD COLUMN `productId` INTEGER NULL,
    ADD INDEX `CarouselImage_productId_idx`(`productId`);

-- AddForeignKey
ALTER TABLE `CarouselImage`
    ADD CONSTRAINT `CarouselImage_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

