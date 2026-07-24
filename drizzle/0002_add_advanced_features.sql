-- Driver Reviews table - تقييمات السائقين من العملاء
CREATE TABLE IF NOT EXISTS driver_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID REFERENCES users(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  delivery_time INTEGER,
  is_approved BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver Earnings table
CREATE TABLE IF NOT EXISTS driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  total_earnings DECIMAL(10, 2) DEFAULT 0.00,
  today_earnings DECIMAL(10, 2) DEFAULT 0.00,
  week_earnings DECIMAL(10, 2) DEFAULT 0.00,
  month_earnings DECIMAL(10, 2) DEFAULT 0.00,
  total_deliveries INTEGER DEFAULT 0,
  today_deliveries INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT false NOT NULL,
  last_update TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver Wallets table
CREATE TABLE IF NOT EXISTS driver_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  total_withdrawn DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_transaction_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Restaurant Wallets table
CREATE TABLE IF NOT EXISTS restaurant_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL UNIQUE REFERENCES restaurants(id),
  balance DECIMAL(10, 2) DEFAULT 0.00,
  total_earned DECIMAL(10, 2) DEFAULT 0.00,
  total_withdrawn DECIMAL(10, 2) DEFAULT 0.00,
  total_commission DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true NOT NULL,
  last_transaction_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Commission Settings table
CREATE TABLE IF NOT EXISTS commission_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  entity_id UUID,
  commission_percent DECIMAL(5, 2) NOT NULL,
  min_amount DECIMAL(10, 2) DEFAULT 0,
  max_amount DECIMAL(10, 2),
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Withdrawal Requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100),
  account_holder VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  rejection_reason TEXT,
  transfer_date TIMESTAMP,
  notes TEXT,
  requested_by VARCHAR(20) NOT NULL,
  approved_by UUID,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  user_id UUID,
  user_type VARCHAR(50) NOT NULL,
  description TEXT,
  changes TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver Work Sessions table
CREATE TABLE IF NOT EXISTS driver_work_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  total_deliveries INTEGER DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_driver_reviews_driver_id ON driver_reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_reviews_order_id ON driver_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_wallets_driver_id ON driver_wallets(driver_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_wallets_restaurant_id ON restaurant_wallets(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_entity_id ON withdrawal_requests(entity_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_driver_work_sessions_driver_id ON driver_work_sessions(driver_id);
