-- ── User Management Migration ─────────────────────────────────────────────────
-- Adds is_banned column to users table for admin ban/unban functionality.
-- Run once against your Supabase / PostgreSQL database.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT FALSE;
