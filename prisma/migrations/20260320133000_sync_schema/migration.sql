BEGIN;

CREATE TABLE IF NOT EXISTS "groups" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "check_configs" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "api_key" TEXT NOT NULL,
  "group_id" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_configs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "check_history" (
  "id" TEXT NOT NULL,
  "config_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "latency" INTEGER,
  "error_message" TEXT,
  "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "check_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "poller_lock" (
  "id" TEXT NOT NULL,
  "instance_id" TEXT NOT NULL,
  "locked_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "poller_lock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "admin_session" (
  "id" TEXT NOT NULL,
  "epoch" INTEGER NOT NULL DEFAULT 0,
  "failed_attempts" INTEGER NOT NULL DEFAULT 0,
  "window_start" TIMESTAMP(3),
  CONSTRAINT "admin_session_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "check_configs"
  ADD COLUMN IF NOT EXISTS "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "admin_session"
  ADD COLUMN IF NOT EXISTS "failed_attempts" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "admin_session"
  ADD COLUMN IF NOT EXISTS "window_start" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "check_history_config_id_checked_at_idx"
  ON "check_history" ("config_id", "checked_at");

CREATE INDEX IF NOT EXISTS "check_history_checked_at_idx"
  ON "check_history" ("checked_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_configs_group_id_fkey'
  ) THEN
    ALTER TABLE "check_configs"
      ADD CONSTRAINT "check_configs_group_id_fkey"
      FOREIGN KEY ("group_id")
      REFERENCES "groups"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'check_history_config_id_fkey'
  ) THEN
    ALTER TABLE "check_history"
      ADD CONSTRAINT "check_history_config_id_fkey"
      FOREIGN KEY ("config_id")
      REFERENCES "check_configs"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
