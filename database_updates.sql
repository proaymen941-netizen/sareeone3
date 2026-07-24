-- SQL Commands to create/update database tables for Driver App integration
-- These tables support Wallet, Stats, and History for drivers

-- 1. Driver Balances Table (Wallet current state)
CREATE TABLE IF NOT EXISTS driver_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id),
    total_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    available_balance DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    withdrawn_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    pending_amount DECIMAL(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Driver Transactions Table (Wallet/Balance History)
CREATE TABLE IF NOT EXISTS driver_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    type VARCHAR(50) NOT NULL, -- 'commission', 'withdrawal', 'adjustment'
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    balance_before DECIMAL(10, 2) DEFAULT 0.00,
    balance_after DECIMAL(10, 2) DEFAULT 0.00,
    reference_id VARCHAR(100), -- orderId or withdrawalId
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Driver Commissions Table (Detailed Earnings Stats)
CREATE TABLE IF NOT EXISTS driver_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    order_amount DECIMAL(10, 2) NOT NULL,
    commission_rate DECIMAL(5, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'paid'
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Withdrawal Requests Table (Wallet withdrawals)
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(50) NOT NULL, -- 'driver', 'restaurant'
    entity_id UUID NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL, -- 'pending', 'approved', 'rejected', 'completed'
    bank_details TEXT,
    admin_notes TEXT,
    rejection_reason TEXT,
    approved_by UUID,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Updates to existing tables
-- Ensure drivers table has required fields if not present
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='commission_rate') THEN
        ALTER TABLE drivers ADD COLUMN commission_rate DECIMAL(5, 2) DEFAULT 70.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='drivers' AND column_name='is_available') THEN
        ALTER TABLE drivers ADD COLUMN is_available BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
