-- T4.6 — Automatic updated_at maintenance triggers
-- Ensures `updatedAt` is always fresh without relying on application code.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON "identity"."users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sessions_updated_at
  BEFORE UPDATE ON "identity"."sessions"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ai_agents_updated_at
  BEFORE UPDATE ON "trading"."ai_agents"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
