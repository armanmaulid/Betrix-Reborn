-- T4.2 — Role & grant separation (least-privilege per service)
-- Run as superuser. Replace placeholder passwords before production use.
--
-- money_svc is the ONLY role that can write to the `money` schema.
-- readonly_reporting can SELECT everything but write nothing.

-- Create roles (NOLOGIN by default; group roles that app users inherit)
CREATE ROLE svc_api LOGIN PASSWORD 'CHANGE_ME_api';
CREATE ROLE svc_worker LOGIN PASSWORD 'CHANGE_ME_worker';
CREATE ROLE money_svc LOGIN PASSWORD 'CHANGE_ME_money';
CREATE ROLE readonly_reporting LOGIN PASSWORD 'CHANGE_ME_readonly' NOLOGIN;

-- Schema usage
GRANT USAGE ON SCHEMA identity, trading, content, ops TO svc_api, svc_worker;
GRANT USAGE ON SCHEMA money TO money_svc, svc_api, svc_worker;
GRANT USAGE ON SCHEMA ops TO readonly_reporting;

-- svc_api: full CRUD on non-money schemas; READ-ONLY on money
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity, trading, content, ops TO svc_api;
GRANT SELECT ON ALL TABLES IN SCHEMA money TO svc_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, trading, content, ops GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO svc_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA money GRANT SELECT ON TABLES TO svc_api;

-- svc_worker: read/write trading/content/ops; read identity; NO access to money
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA trading, content, ops TO svc_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA identity TO svc_worker;

-- money_svc: FULL write on money schema (ledger, transactions, vouchers)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA money TO money_svc;

-- readonly_reporting: SELECT everywhere
GRANT SELECT ON ALL TABLES IN SCHEMA identity, money, trading, content, ops TO readonly_reporting;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity, money, trading, content, ops GRANT SELECT ON TABLES TO readonly_reporting;

-- Sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA identity, trading, content, ops TO svc_api;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA money TO money_svc;

-- Revoke PUBLIC
REVOKE ALL ON SCHEMA identity, money, trading, content, ops FROM PUBLIC;
