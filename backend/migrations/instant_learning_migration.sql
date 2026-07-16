-- instant_learning_migration.sql

-- 1. Bảng tutor_profiles
ALTER TABLE tutor_profiles 
ADD COLUMN IF NOT EXISTS instant_price NUMERIC,
ADD COLUMN IF NOT EXISTS instant_price_unit VARCHAR(50),
ADD COLUMN IF NOT EXISTS availability_status VARCHAR(20) DEFAULT 'Offline';

-- 2. Bảng wallets
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS frozen_balance NUMERIC DEFAULT 0;

-- 3. Bảng bookings
-- bookings.booking_type already exists as TEXT based on previous schema check, but we can ensure it does
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type TEXT;

-- 4. Create function to handle the safe instant booking transaction
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

    -- 7. Insert Booking
    INSERT INTO bookings (
        student_id, tutor_id, tutor_name, subject, time_slot, note, status, 
        child_name, student_name, booking_type, lesson_fee, duration_mins, payer_wallet_id, created_at
    ) VALUES (
        p_student_id, p_tutor_id, p_tutor_name, p_subject, p_time_slot, p_note, 'Pending',
        p_child_name, p_student_name, 'Instant', p_price, p_duration_mins, v_student_wallet_id, NOW()
    ) RETURNING id INTO v_booking_id;

    -- All good, return success
    RETURN jsonb_build_object(
        'success', true, 
        'booking_id', v_booking_id
    );
END;
$$;
