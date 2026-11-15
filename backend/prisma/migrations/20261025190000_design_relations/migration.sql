ALTER TABLE `CustomDesign`
    ADD CONSTRAINT `CustomDesign_productId_fkey`
    FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `OrderItem`
    ADD CONSTRAINT `OrderItem_designId_fkey`
    FOREIGN KEY (`designId`) REFERENCES `CustomDesign`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

