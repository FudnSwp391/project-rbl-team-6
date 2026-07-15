-- Đổi evidence_url (1 string) sang evidence_urls (mảng) cho bảng disputes.
-- Giữ nguyên cột evidence_url cũ, KHÔNG DROP ở migration này (an toàn rollback).
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS evidence_urls TEXT[];
UPDATE disputes SET evidence_urls = ARRAY[evidence_url] WHERE evidence_url IS NOT NULL AND evidence_url <> '' AND evidence_urls IS NULL;
