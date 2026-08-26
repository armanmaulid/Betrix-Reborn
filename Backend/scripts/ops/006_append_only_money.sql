-- T4.0 — Append-only enforcement for financial ledger
-- Blocks UPDATE and DELETE on credit_transactions at the DATABASE level,
-- making it impossible even for a compromised application to rewrite history.

CREATE OR REPLACE FUNCTION block_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION '% on % is forbidden — table is append-only',
    TG_OP, TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER credit_transactions_append_only
  BEFORE UPDATE OR DELETE ON "money"."credit_transactions"
  FOR EACH ROW EXECUTE FUNCTION block_mutation();

-- Corrections are made by inserting a BALANCING entry with opposite amount,
-- never by modifying or deleting existing rows.
