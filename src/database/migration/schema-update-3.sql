BEGIN TRANSACTION;
UPDATE schema_information SET value = "3" WHERE key = "version";
CREATE INDEX idx_order_status ON `order` (status);
COMMIT;

