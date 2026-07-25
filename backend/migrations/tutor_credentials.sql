-- Migration: Create tutor_credentials table
-- Description: Stores credentials (education, certificate, experience) pending for admin approval

CREATE TABLE IF NOT EXISTS tutor_credentials (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    tutor_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type             TEXT NOT NULL CHECK (type IN ('education','certificate','experience')),
    title            TEXT NOT NULL,
    description      TEXT,
    proof_url        TEXT,
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    reject_reason    TEXT,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);
