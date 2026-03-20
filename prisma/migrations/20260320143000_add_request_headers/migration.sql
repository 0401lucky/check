BEGIN;

ALTER TABLE "check_configs"
  ADD COLUMN IF NOT EXISTS "request_headers" JSONB;

COMMIT;
