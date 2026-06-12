const pool = require('./db');

const sql = `
-- Tạo bảng chat_messages mới (tránh conflict với messages cũ)
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT,
  msg_type    VARCHAR(20) DEFAULT 'text' CHECK (msg_type IN ('text','image','video','file')),
  file_url    TEXT,
  file_name   TEXT,
  file_size   BIGINT,
  file_mime   TEXT,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_sender   ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_receiver ON chat_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created  ON chat_messages(created_at DESC);
`;

pool.query(sql)
  .then(() => { console.log('✅ chat_messages table created!'); pool.end(); })
  .catch(e => { console.error('❌', e.message); pool.end(); });
