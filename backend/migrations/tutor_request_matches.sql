-- Bảng ghép gia sư với yêu cầu tìm gia sư (matching)
-- (chuyển từ migrate_matches.js sang SQL thuần — idempotent)

CREATE TABLE IF NOT EXISTS tutor_request_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES tutor_requests(id) ON DELETE CASCADE,
    tutor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    match_score INTEGER,
    match_tier TEXT,
    is_interested BOOLEAN DEFAULT false,
    is_selected BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending',
    selected_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(request_id, tutor_id)
);
