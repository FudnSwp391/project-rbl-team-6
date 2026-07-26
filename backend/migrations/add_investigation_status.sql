-- ============================================================
-- Task 0.1 — UP Migration: Add investigation_status to disputes
-- ============================================================
-- Purpose : Adds a new investigation_status column to track
--           the admin-side investigation lifecycle of a dispute,
--           independent of the existing payment-facing `status`
--           column (dispute_status ENUM).
--
-- Target table : disputes (defined in payment_migration.sql)
-- Depends on   : payment_migration.sql (disputes table must exist)
-- Idempotent   : YES — safe to re-run; uses IF NOT EXISTS guards
-- Backward compat: YES — new column has a DEFAULT; existing rows
--           are automatically set to 'OPEN'; no existing column
--           or constraint is modified.
--
-- DOWN / Rollback (run manually to revert):
--   ALTER TABLE disputes DROP COLUMN IF EXISTS investigation_status;
--   DROP INDEX  IF EXISTS idx_disputes_investigation_status;
--
-- ============================================================

-- Step 1: Create the ENUM type (idempotent via DO block)
DO $$ BEGIN
    CREATE TYPE investigation_status_enum AS ENUM (
        'OPEN',
        'INVESTIGATING',
        'WAITING_TUTOR',
        'WAITING_STUDENT',
        'RESOLVED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add the column to disputes (idempotent)
ALTER TABLE disputes
    ADD COLUMN IF NOT EXISTS investigation_status investigation_status_enum
        NOT NULL DEFAULT 'OPEN';

-- Step 3: Performance index for queue filtering (idempotent)
CREATE INDEX IF NOT EXISTS idx_disputes_investigation_status
    ON disputes (investigation_status);

-- ============================================================
-- Verification (run manually after applying):
--   SELECT column_name, data_type, column_default
--   FROM information_schema.columns
--   WHERE table_name = 'disputes'
--     AND column_name = 'investigation_status';
--
-- Expected result:
--   column_name          | data_type | column_default
--   investigation_status | USER-DEFINED | 'OPEN'::investigation_status_enum
-- ============================================================
