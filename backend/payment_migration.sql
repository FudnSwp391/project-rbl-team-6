-- Bảng Wallets: Lưu trữ số dư của tất cả User (Admin, Tutor, Parent, Student)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    balance NUMERIC(15,2) DEFAULT 0 CHECK (balance >= 0),
    held_balance NUMERIC(15,2) DEFAULT 0 CHECK (held_balance >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Transactions: Lưu vết mọi biến động dòng tiền
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'WITHDRAW', 'PAYMENT', 'REFUND', 'COMMISSION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'HELD_IN_ESCROW', 'RELEASED', 'REFUNDED', 'DISPUTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id),
    amount NUMERIC(15,2) NOT NULL,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'PENDING',
    gateway TEXT, -- 'MOMO', 'VNPAY', 'SYSTEM'
    gateway_transaction_id TEXT UNIQUE, -- Mã giao dịch bên cổng thanh toán (để check trùng lặp - Idempotency)
    reference_id UUID, -- Ví dụ: ID của buổi học (lesson_id)
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Disputes: Quản lý khiếu nại
DO $$ BEGIN
    CREATE TYPE dispute_status AS ENUM ('OPEN', 'RESOLVED_REFUND', 'RESOLVED_RELEASE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id),
    raised_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'OPEN',
    admin_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- ==========================================
-- POSTGRESQL FUNCTIONS (RPC) CHO ESCROW LOGIC
-- ==========================================

-- 1. Nạp tiền vào ví (Chỉ gọi từ IPN Webhook)
CREATE OR REPLACE FUNCTION process_deposit(p_wallet_id UUID, p_amount NUMERIC, p_gateway TEXT, p_gateway_tx_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Kiểm tra Idempotency (Tránh cộng tiền 2 lần cho 1 mã giao dịch webhook)
    IF EXISTS (SELECT 1 FROM transactions WHERE gateway_transaction_id = p_gateway_tx_id AND status = 'SUCCESS') THEN
        RETURN FALSE; 
    END IF;

    -- Cập nhật số dư
    UPDATE wallets SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_wallet_id;

    -- Lưu log giao dịch
    INSERT INTO transactions (wallet_id, amount, type, status, gateway, gateway_transaction_id, description)
    VALUES (p_wallet_id, p_amount, 'DEPOSIT', 'SUCCESS', p_gateway, p_gateway_tx_id, 'Nạp tiền qua ' || p_gateway);

    RETURN TRUE;
END;
$$;

-- 2. Đặt lịch học (Hold Money / Escrow)
CREATE OR REPLACE FUNCTION hold_money_for_lesson(p_payer_wallet_id UUID, p_amount NUMERIC, p_lesson_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx_id UUID;
BEGIN
    -- Trừ balance khả dụng, cộng vào held_balance (Sẽ văng lỗi nếu balance < p_amount nhờ CHECK constraint)
    UPDATE wallets 
    SET balance = balance - p_amount, held_balance = held_balance + p_amount 
    WHERE id = p_payer_wallet_id;

    -- Tạo transaction trạng thái HELD_IN_ESCROW
    INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
    VALUES (p_payer_wallet_id, p_amount, 'PAYMENT', 'HELD_IN_ESCROW', 'SYSTEM', p_lesson_id, 'Đặt lịch học chờ giải ngân')
    RETURNING id INTO v_tx_id;

    RETURN v_tx_id;
END;
$$;

-- 3. Giải ngân (Release Money) cho Gia sư
CREATE OR REPLACE FUNCTION release_escrow(
    p_tx_id UUID, 
    p_payer_wallet_id UUID, 
    p_tutor_wallet_id UUID, 
    p_admin_wallet_id UUID, 
    p_amount NUMERIC, 
    p_commission_rate NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_commission_amount NUMERIC;
    v_tutor_amount NUMERIC;
BEGIN
    v_commission_amount := p_amount * p_commission_rate;
    v_tutor_amount := p_amount - v_commission_amount;

    -- 1. Trừ tiền khỏi held_balance của người gửi
    UPDATE wallets SET held_balance = held_balance - p_amount WHERE id = p_payer_wallet_id;

    -- 2. Cộng tiền cho Gia sư
    UPDATE wallets SET balance = balance + v_tutor_amount WHERE id = p_tutor_wallet_id;

    -- 3. Cộng tiền hoa hồng cho Admin
    UPDATE wallets SET balance = balance + v_commission_amount WHERE id = p_admin_wallet_id;

    -- 4. Cập nhật Transaction gốc thành RELEASED
    UPDATE transactions SET status = 'RELEASED', updated_at = NOW() WHERE id = p_tx_id;

    -- 5. Ghi log Commission
    INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
    VALUES (p_admin_wallet_id, v_commission_amount, 'COMMISSION', 'SUCCESS', 'SYSTEM', p_tx_id, 'Phí hoa hồng từ giải ngân');

    -- 6. Ghi log Nhận Tiền
    INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
    VALUES (p_tutor_wallet_id, v_tutor_amount, 'PAYMENT', 'SUCCESS', 'SYSTEM', p_tx_id, 'Giải ngân thanh toán lớp học');

    RETURN TRUE;
END;
$$;

-- 4. Hoàn tiền (Refund) từ Escrow về lại Người gửi
CREATE OR REPLACE FUNCTION refund_escrow(p_tx_id UUID, p_payer_wallet_id UUID, p_amount NUMERIC)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Trừ tiền khỏi held_balance, trả lại vào balance khả dụng
    UPDATE wallets 
    SET held_balance = held_balance - p_amount, balance = balance + p_amount 
    WHERE id = p_payer_wallet_id;

    -- 2. Cập nhật Transaction
    UPDATE transactions SET status = 'REFUNDED', updated_at = NOW() WHERE id = p_tx_id;
    
    -- 3. Ghi log Hoàn Tiền
    INSERT INTO transactions (wallet_id, amount, type, status, gateway, reference_id, description)
    VALUES (p_payer_wallet_id, p_amount, 'REFUND', 'SUCCESS', 'SYSTEM', p_tx_id, 'Hoàn tiền vào ví');

    RETURN TRUE;
END;
$$;

-- Hàm tự tạo ví cho mọi User đang có
INSERT INTO wallets (user_id, balance, held_balance)
SELECT id, 0, 0 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Trigger tự tạo ví khi có User mới
CREATE OR REPLACE FUNCTION create_wallet_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO wallets (user_id, balance, held_balance)
  VALUES (NEW.id, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet ON users;
CREATE TRIGGER trigger_create_wallet
AFTER INSERT ON users
FOR EACH ROW EXECUTE FUNCTION create_wallet_for_new_user();
