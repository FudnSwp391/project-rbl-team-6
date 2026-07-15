-- fix_instant_booking_migration.sql
-- Mục đích: Sửa 2 lỗi của tính năng Học Ngay
-- 1. Xóa check constraint cũ đang chặn booking_type = 'Instant'
-- 2. Cập nhật lại hàm process_instant_booking để bổ sung lesson_date

-- ============================================================
-- BƯỚC 1: Xóa check constraint cũ (nếu tồn tại)
-- ============================================================
ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_booking_type_check;

-- ============================================================
-- BƯỚC 2: Thêm lại constraint mới cho phép thêm 'Instant'
-- (dựa theo các giá trị thực tế đang được dùng trong hệ thống)
-- ============================================================
ALTER TABLE bookings
  ADD CONSTRAINT bookings_booking_type_check
  CHECK (booking_type IN ('regular', 'package', 'Instant', 'instant', 'Regular', 'Package'));

-- ============================================================
-- BƯỚC 3: Đảm bảo cột lesson_date cho phép NULL với Instant booking
-- (Instant booking không có ngày định sẵn — sẽ dùng ngày hiện tại)
-- Không cần ALTER vì lesson_date đã là cột thông thường
-- ============================================================

-- ============================================================
-- BƯỚC 4: Tạo lại hàm process_instant_booking với lesson_date
-- ============================================================
CREATE OR REPLACE FUNCTION process_instant_booking(
    p_student_id UUID,
    p_tutor_id UUID,
    p_price NUMERIC,
    p_time_slot TEXT,
    p_note TEXT,
    p_child_name TEXT,
    p_student_name TEXT,
    p_tutor_name TEXT,
    p_subject TEXT,
    p_duration_mins INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_tutor_status VARCHAR;
    v_student_pending_count INT;
    v_tutor_pending_count INT;
    v_student_balance NUMERIC;
    v_student_wallet_id UUID;
    v_booking_id UUID;
    v_resolved_time_slot TEXT;
BEGIN
    -- 1. Lock Tutor row to prevent race conditions
    SELECT availability_status INTO v_tutor_status
    FROM tutor_profiles
    WHERE user_id = p_tutor_id
    FOR UPDATE;

    IF v_tutor_status IS NULL OR v_tutor_status != 'Online' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gia sư hiện không trực tuyến hoặc đang bận.');
    END IF;

    -- 2. Lock Student Wallet
    SELECT id, balance INTO v_student_wallet_id, v_student_balance
    FROM wallets
    WHERE user_id = p_student_id
    FOR UPDATE;

    IF v_student_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy ví học sinh.');
    END IF;

    -- 3. Check Pending count for Student (max 1)
    SELECT COUNT(*) INTO v_student_pending_count
    FROM bookings
    WHERE student_id = p_student_id
      AND booking_type = 'Instant'
      AND status = 'Pending';

    IF v_student_pending_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bạn đã có một yêu cầu Học ngay đang chờ xử lý. Vui lòng chờ.');
    END IF;

    -- 4. Check Pending count for Tutor (max 1)
    SELECT COUNT(*) INTO v_tutor_pending_count
    FROM bookings
    WHERE tutor_id = p_tutor_id
      AND booking_type = 'Instant'
      AND status = 'Pending';

    IF v_tutor_pending_count > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Gia sư vừa nhận một buổi học khác.');
    END IF;

    -- 5. Check Balance
    IF v_student_balance < p_price THEN
        RETURN jsonb_build_object('success', false, 'message', 'Số dư không đủ để thực hiện yêu cầu.');
    END IF;

    -- 6. Freeze Balance
    UPDATE wallets
    SET balance = balance - p_price,
        frozen_balance = COALESCE(frozen_balance, 0) + p_price
    WHERE id = v_student_wallet_id;

    -- 7. Resolve time_slot: dùng time_slot truyền vào hoặc lấy giờ hiện tại
    v_resolved_time_slot := COALESCE(NULLIF(TRIM(p_time_slot), ''), to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh', 'HH24:MI'));

    -- 8. Insert Booking — bổ sung lesson_date = ngày hiện tại cho Instant booking
    INSERT INTO bookings (
        student_id, tutor_id, tutor_name, subject, lesson_date, time_slot, note, status,
        child_name, student_name, booking_type, lesson_fee, duration_mins, payer_wallet_id, created_at
    ) VALUES (
        p_student_id, p_tutor_id, p_tutor_name, p_subject, CURRENT_DATE, v_resolved_time_slot, p_note, 'Pending',
        p_child_name, p_student_name, 'Instant', p_price, p_duration_mins, v_student_wallet_id, NOW()
    ) RETURNING id INTO v_booking_id;

    -- 9. Return success
    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id
    );
END;
$$;
