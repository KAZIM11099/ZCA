INSERT INTO `Collection` (
ame`, `slug`, `description`, `isActive`)
VALUES
    ('Men', 'men', 'A considered edit of everyday essentials and custom pieces for men.', TRUE),
    ('Women', 'women', 'A considered edit of everyday essentials and custom pieces for women.', TRUE),
    ('Kids', 'kids', 'Comfortable, expressive essentials made for little ones.', TRUE)
ON DUPLICATE KEY UPDATE
    
ame` = VALUES(
ame`),
    `description` = VALUES(`description`),
    `isActive` = TRUE;

