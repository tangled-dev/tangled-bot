BEGIN
TRANSACTION;
ALTER TABLE strategy RENAME TO _strategy_old;
DROP INDEX idx_strategy_create_date;

CREATE TABLE strategy
(
    strategy_id          CHAR(16)  NOT NULL UNIQUE CHECK (length(strategy_id) <= 16),
    exchange_id          CHAR(16)  NOT NULL CHECK (length(exchange_id) <= 16),
    symbol               CHAR(16)  NOT NULL CHECK (length(symbol) <= 16),
    strategy_description CHAR(255) NOT NULL CHECK (length(strategy_description) <= 255),
    strategy_type        CHAR(255) NOT NULL CHECK (length(strategy_type) <= 255),
    order_type           CHAR(3)   NOT NULL CHECK (length(order_type) <= 4),
    order_ttl            INT       NOT NULL DEFAULT 60,
    amount               REAL      NOT NULL CHECK (amount > 0),
    price_min            REAL NULL,
    price_max            REAL NULL,
    amount_traded        REAL NULL DEFAULT 0,
    total_budget         REAL NULL DEFAULT 0,
    extra_config         TEXT NULL,
    last_run_timestamp   INT NULL,
    last_run_status      TINYINT NULL,
    status               TINYINT   NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date          INT       NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_strategy_exchange_symbol_create_date ON strategy (exchange_id, symbol, create_date);

INSERT INTO strategy (strategy_id, strategy_description, strategy_type, exchange_id, symbol, order_type, order_ttl,
                      amount, price_min, price_max, amount_traded, total_budget, extra_config, last_run_timestamp,
                      last_run_status, status, create_date)
SELECT strategy_id,
       strategy_description,
       strategy_type,
       'tangled',
       'mlx_usdc',
       order_type,
       order_ttl,
       amount,
       price_min,
       price_max,
       amount_traded,
       total_budget,
       extra_config,
       last_run_timestamp,
       last_run_status,
       status,
       create_date
FROM _strategy_old;

DROP TABLE _strategy_old;

DROP TABLE `order`;
DROP INDEX idx_order_create_date;

CREATE TABLE `order`
(
    order_id     CHAR(16) NOT NULL CHECK (length(order_id) <= 16),
    exchange_id  CHAR(16) NOT NULL CHECK (length(exchange_id) <= 16),
    order_number BIGINT   NOT NULL CHECK (order_number > 0),
    price        REAL     NOT NULL CHECK (price > 0),
    order_size   INT      NOT NULL CHECK (order_size > 0),
    order_filled INT      NOT NULL CHECK (order_filled >= 0),
    user_cookie  INT NULL,
    state        CHAR(16) NOT NULL,
    action       CHAR(8)  NOT NULL,
    order_type   CHAR(16) NOT NULL,
    symbol       CHAR(8)  NOT NULL,
    deals        TEXT NULL,
    timestamp    INT      NOT NULL,
    order_ttl    INT      NOT NULL,
    status       TINYINT  NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date  INT      NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer'),
    UNIQUE (exchange_id, order_id),
    UNIQUE (exchange_id, order_number)
);
CREATE INDEX idx_order_exchange_create_date ON `order` (create_date);

INSERT INTO normalization (normalization_name, normalization_id)
VALUES ('fiatleak_exchange_api_key', 'AEK83XHR6');

DELETE
FROM api;

UPDATE schema_information
SET value = "2"
WHERE key = "version";
COMMIT;
