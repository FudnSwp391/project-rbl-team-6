-- ============================================================
-- Task 0.2 — UP Migration: Performance Indexes for Disputes
-- ============================================================
-- Purpose   : Add 5 composite indexes to the disputes table to
--             support the admin investigation queue, per-user
--             lookups, and booking existence checks without
--             sequential scans.
--
-- Depends on: Task 0.1 — disputes.investigation_status column
--             must already exist before this runs.
--
-- Idempotent : YES — all statements use IF NOT EXISTS.
--
-- CONCURRENTLY: All indexes are built with CONCURRENTLY so they
--   do NOT acquire a ShareLock on disputes during creation.
--   The table remains fully writable while each index builds.
--
-- IMPORTANT — CONCURRENTLY RESTRICTIONS:
--   • Must NOT be run inside a transaction (BEGIN/COMMIT).
--     Run this file as a plain script: each statement executes
--     in its own implicit transaction, which is required for
--     CONCURRENTLY to work correctly.
--   • If the migration runner wraps files in a transaction,
--     remove CONCURRENTLY from each statement — the index will
--     then build with a brief ShareLock (acceptable on small tables).
--
-- Run order  : After payment_migration.sql, add_investigation_status.sql
--
-- DOWN / Rollback (run manually to revert all 5 indexes):
--   DROP INDEX CONCURRENTLY IF EXISTS idx_disputes_inv_status_created;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_disputes_status_withdrawn_created;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_disputes_raised_by_created;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_disputes_tutor_status_created;
--   DROP INDEX CONCURRENTLY IF EXISTS idx_disputes_booking_status_withdrawn;
--
-- ============================================================


-- ── Index 1: Admin Investigation Queue — primary list view ───────────────────
-- Covers: ORDER BY investigation_status, created_at DESC
-- Used by: Task 1.1 List API — paginated admin queue filtered by
--          investigation_status and sorted by submission date.
-- Pattern: WHERE investigation_status = $1 ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_inv_status_created
    ON disputes (investigation_status, created_at DESC);


-- ── Index 2: Open Dispute Queue — the most frequent dashboard count ──────────
-- Covers: WHERE status = 'OPEN' AND withdrawn_at IS NULL [ORDER BY created_at]
-- Used by: Admin dashboard open-count queries (server.js L1058, L5566, L9039),
--          booking existence checks, severity filtering.
-- The partial index approach is avoided here to keep the index general-purpose;
-- the planner will use it for any predicate on (status, withdrawn_at).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_status_withdrawn_created
    ON disputes (status, withdrawn_at, created_at DESC);


-- ── Index 3: Per-Student History — student dispute list & metrics ─────────────
-- Covers: WHERE raised_by = $1 [AND created_at > NOW() - INTERVAL '...']
--         ORDER BY created_at DESC
-- Used by: Student timeline queries (server.js L645, L937, L938, L8750, L8751),
--          AI copilot context builder, student risk scoring.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_raised_by_created
    ON disputes (raised_by, created_at DESC);


-- ── Index 4: Per-Tutor Dispute Metrics — tutor risk & reputation ─────────────
-- Covers: WHERE tutor_id = $1 [AND status = '...' AND withdrawn_at IS NULL]
--         [AND created_at > NOW() - INTERVAL '...']
-- Used by: Tutor reputation scorer (server.js L890, L891, L1892, L2182, L2254),
--          admin violation reports, risk leaderboard queries.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_tutor_status_created
    ON disputes (tutor_id, status, created_at DESC);


-- ── Index 5: Booking Existence Check — EXISTS sub-queries on booking_id ───────
-- Covers: WHERE booking_id = $1 AND status = 'OPEN' AND withdrawn_at IS NULL
-- Used by: Booking list page hasOpenDispute flag (server.js L14493, L14527,
--          L14690, L16547, L17172, L18667) — fired for every row in booking lists.
--          This is the highest-frequency lookup pattern after Index 2.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disputes_booking_status_withdrawn
    ON disputes (booking_id, status, withdrawn_at);


-- ============================================================
-- Manual QA — run after applying this migration:
--
-- Verify all 5 indexes appear on the disputes table:
--   \d disputes
--
-- Or query pg_indexes directly:
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE tablename = 'disputes'
--     AND indexname LIKE 'idx_disputes_%'
--   ORDER BY indexname;
--
-- Expected output (5 rows):
--   idx_disputes_booking_status_withdrawn
--   idx_disputes_inv_status_created
--   idx_disputes_raised_by_created
--   idx_disputes_status_withdrawn_created
--   idx_disputes_tutor_status_created
--
-- Verify index is valid (not in invalid state from CONCURRENTLY):
--   SELECT indexname, indisvalid
--   FROM pg_indexes
--   JOIN pg_class ON pg_class.relname = pg_indexes.indexname
--   JOIN pg_index ON pg_index.indexrelid = pg_class.oid
--   WHERE tablename = 'disputes'
--     AND indexname LIKE 'idx_disputes_%'
--   ORDER BY indexname;
-- All rows should show indisvalid = true.
-- ============================================================
