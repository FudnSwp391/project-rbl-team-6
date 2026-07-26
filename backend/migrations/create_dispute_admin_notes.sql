-- ============================================================
-- Task 0.1 — UP Migration: Create dispute_admin_notes table
-- ============================================================
-- Purpose  : Stores structured admin notes/audit trail entries
--            for each dispute investigation. Each note records
--            which admin wrote it, the body text, and a
--            timestamp. Cascades on dispute deletion.
--
-- Target table : dispute_admin_notes (new)
-- FK parent     : disputes(id) — defined in payment_migration.sql
-- Idempotent    : YES — uses CREATE TABLE IF NOT EXISTS
-- Backward compat: YES — new table; no existing table modified
--
-- DOWN / Rollback (run manually to revert):
--   DROP TABLE IF EXISTS dispute_admin_notes;
--
-- ============================================================

CREATE TABLE IF NOT EXISTS dispute_admin_notes (
    -- Primary key
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Which dispute this note belongs to.
    -- ON DELETE CASCADE: deleting a dispute removes all its notes.
    dispute_id  UUID NOT NULL
                    REFERENCES disputes(id) ON DELETE CASCADE,

    -- Which admin authored the note.
    -- ON DELETE SET NULL: if the admin user is removed the note
    -- is preserved (audit trail) but author becomes anonymous.
    admin_id    UUID
                    REFERENCES users(id) ON DELETE SET NULL,

    -- Free-form note body written by the admin.
    note        TEXT NOT NULL,

    -- Timestamp when the note was created (immutable audit record).
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()

    -- NOTE: No updated_at — notes are append-only audit records.
    --       Edits to existing notes are not supported by design.
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Primary lookup: fetch all notes for a given dispute (list view)
CREATE INDEX IF NOT EXISTS idx_dispute_admin_notes_dispute_id
    ON dispute_admin_notes (dispute_id);

-- Secondary lookup: fetch all notes written by a given admin
CREATE INDEX IF NOT EXISTS idx_dispute_admin_notes_admin_id
    ON dispute_admin_notes (admin_id);

-- ============================================================
-- Manual QA script — run on local DB clone after migration:
--
-- 1. Insert a dummy dispute (adjust IDs to real UUIDs from your DB):
--    INSERT INTO dispute_admin_notes (dispute_id, admin_id, note)
--    VALUES (
--        '<valid_dispute_uuid>',
--        '<valid_admin_user_uuid>',
--        'Test admin note — Task 0.1 QA'
--    );
--
-- 2. Verify note exists:
--    SELECT * FROM dispute_admin_notes
--    WHERE dispute_id = '<valid_dispute_uuid>';
--
-- 3. Verify FK CASCADE — delete parent dispute:
--    DELETE FROM disputes WHERE id = '<valid_dispute_uuid>';
--
-- 4. Confirm note was removed by cascade:
--    SELECT COUNT(*) FROM dispute_admin_notes
--    WHERE dispute_id = '<valid_dispute_uuid>';
--    -- Expected: 0
--
-- ============================================================
