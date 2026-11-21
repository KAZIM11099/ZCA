ALTER TABLE `CustomProduct`
    ADD COLUMN `colors` JSON NULL;

UPDATE `CustomProduct`
SET `colors` = JSON_ARRAY(
    JSON_OBJECT('name', 'White', 'hex', '#ffffff'),
    JSON_OBJECT('name', 'Black', 'hex', '#202020'),
    JSON_OBJECT('name', 'Navy', 'hex', '#26354c'),
    JSON_OBJECT('name', 'Beige', 'hex', '#d8cbb8'),
    JSON_OBJECT('name', 'Sage', 'hex', '#87917b'),
    JSON_OBJECT('name', 'Red', 'hex', '#b6443a'),
    JSON_OBJECT('name', 'Blue', 'hex', '#6684a1'),
    JSON_OBJECT('name', 'Pink', 'hex', '#d9a8b2')
)
WHERE `colors` IS NULL;
