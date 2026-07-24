-- تحديث جدول السائقين (drivers) لإضافة الحقول اللازمة للتقييم والأرباح
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS earnings DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS completed_orders INTEGER DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS average_rating DECIMAL(3, 2) DEFAULT 0.00;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- تحديث جدول الطلبات (orders)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_rated BOOLEAN DEFAULT FALSE;

-- إنشاء جدول تقييمات السائقين (driver_reviews)
CREATE TABLE IF NOT EXISTS driver_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    order_id UUID REFERENCES orders(id) NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- إنشاء جدول أرصدة السائقين (driver_balances)
CREATE TABLE IF NOT EXISTS driver_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL UNIQUE,
    total_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    available_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    withdrawn_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    pending_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- إنشاء جدول معاملات السائقين (driver_transactions)
CREATE TABLE IF NOT EXISTS driver_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    type VARCHAR(50) NOT NULL, -- commission, salary, bonus, deduction, withdrawal
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    balance_before DECIMAL(10, 2) DEFAULT 0,
    balance_after DECIMAL(10, 2) DEFAULT 0,
    reference_id VARCHAR(100), -- orderId or withdrawalId
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- إنشاء جدول عمولات السائقين (driver_commissions)
CREATE TABLE IF NOT EXISTS driver_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    order_id UUID REFERENCES orders(id) NOT NULL,
    order_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, approved, paid
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- إنشاء جدول سحوبات السائقين (driver_withdrawals)
CREATE TABLE IF NOT EXISTS driver_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- pending, approved, rejected, completed
    bank_details TEXT,
    admin_notes TEXT,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- إنشاء جدول جلسات عمل السائقين (driver_work_sessions)
CREATE TABLE IF NOT EXISTS driver_work_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    start_time TIMESTAMP DEFAULT NOW() NOT NULL,
    end_time TIMESTAMP,
    is_active BOOLEAN DEFAULT true NOT NULL,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- إنشاء جداول إضافية للمحفظة والأرباح (للتوافق مع الواجهات المختلفة)
CREATE TABLE IF NOT EXISTS driver_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL UNIQUE,
    balance DECIMAL(10, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS driver_earnings_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES drivers(id) NOT NULL,
    total_earned DECIMAL(10, 2) DEFAULT 0,
    withdrawn DECIMAL(10, 2) DEFAULT 0,
    pending DECIMAL(10, 2) DEFAULT 0,
    last_paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);
