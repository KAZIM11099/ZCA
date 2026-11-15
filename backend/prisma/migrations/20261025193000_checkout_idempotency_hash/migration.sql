ALTER TABLE `Order`
    ADD COLUMN `idempotencyHash` CHAR(64) NULL;

