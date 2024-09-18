PRAGMA
journal_mode= WAL;
PRAGMA
auto_vacuum= FULL;
PRAGMA
journal_size_limit = 4096;
BEGIN
TRANSACTION;

CREATE TABLE api
(
    api_id             CHAR(16)   NOT NULL UNIQUE CHECK (length(api_id) <= 16),
    name               CHAR(255)  NOT NULL CHECK (length(name) <= 255),
    description        CHAR(1024) NOT NULL CHECK (length(description) <= 1024),
    method             CHAR(10)   NOT NULL CHECK (length(method) <= 10),
    version_released   CHAR(10)   NOT NULL CHECK (length(version_released) <= 10),
    version_deprecated CHAR(10) NULL CHECK (length (version_deprecated) <= 10),
    version_removed    CHAR(10) NULL CHECK (length (version_removed) <= 10),
    permission         TEXT       NOT NULL DEFAULT "true",
    status             TINYINT    NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date        INT        NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_api_create_date ON api (create_date);

CREATE TABLE strategy
(
    strategy_id          CHAR(16)  NOT NULL UNIQUE CHECK (length(strategy_id) <= 16),
    strategy_description CHAR(255) NOT NULL CHECK (length(strategy_description) <= 255),
    strategy_type        CHAR(255) NOT NULL CHECK (length(strategy_type) <= 255),
    order_type           CHAR(3)   NOT NULL CHECK (length(order_type) <= 4),
    order_ttl            INT       NOT NULL DEFAULT 60,
    amount               INT       NOT NULL CHECK (TYPEOF(amount) = 'integer' AND amount > 0),
    price_min            REAL NULL,
    price_max            REAL NULL,
    amount_traded        INT NULL DEFAULT 0,
    total_budget         INT NULL,
    extra_config         TEXT NULL,
    last_run_timestamp   INT NULL,
    last_run_status      TINYINT NULL,
    status               TINYINT   NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date          INT       NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_strategy_create_date ON strategy (create_date);

CREATE TABLE `order`
(
    order_id     CHAR(16) NOT NULL UNIQUE CHECK (length(order_id) <= 16),
    order_number BIGINT   NOT NULL UNIQUE CHECK (order_number > 0),
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
    create_date  INT      NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_order_create_date ON `order` (create_date);

CREATE TABLE normalization
(
    normalization_id   CHAR(20)  NOT NULL PRIMARY KEY CHECK (length(normalization_id) <= 20),
    normalization_name CHAR(255) NOT NULL UNIQUE CHECK (length(normalization_name) <= 255),
    status             SMALLINT  NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date        INT       NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_normalization_create_date ON normalization (create_date);

CREATE TABLE schema_information
(
    key         TEXT    NOT NULL UNIQUE,
    value       TEXT    NOT NULL,
    status      TINYINT NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date INT     NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_schema_information_create_date ON schema_information (create_date);

CREATE TABLE config
(
    config_id   CHAR(20) NOT NULL PRIMARY KEY CHECK (length(config_id) <= 20),
    config_name TEXT     NOT NULL UNIQUE,
    value       TEXT     NOT NULL,
    type        TEXT     NOT NULL,
    status      SMALLINT NOT NULL DEFAULT 1 CHECK (length(status) <= 3 AND TYPEOF(status) = 'integer'),
    create_date INT      NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)) CHECK (length(create_date) <= 10 AND TYPEOF(create_date) = 'integer')
);
CREATE INDEX idx_config_create_date ON config (create_date);

INSERT INTO normalization (normalization_name, normalization_id)
VALUES ('mlx', 'ytvVWD56H'); /*currency type*/
INSERT INTO normalization (normalization_name, normalization_id)
VALUES ('usd', '03VWEI5AS');
INSERT INTO normalization (normalization_name, normalization_id)
VALUES ('tangled_exchange_api_key', '19VC1ZZ0T');

INSERT INTO schema_information (key, value)
VALUES ("version", "1");

COMMIT;
