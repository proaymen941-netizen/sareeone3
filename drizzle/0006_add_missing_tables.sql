-- Cart table for user shopping carts
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  special_instructions TEXT,
  added_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Order tracking table
CREATE TABLE IF NOT EXISTS order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_by_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver earnings table (more detailed than driver_earnings)
CREATE TABLE IF NOT EXISTS driver_earnings_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  total_earned DECIMAL(10, 2) DEFAULT '0',
  withdrawn DECIMAL(10, 2) DEFAULT '0',
  pending DECIMAL(10, 2) DEFAULT '0',
  last_paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver balances table
CREATE TABLE IF NOT EXISTS driver_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id),
  total_balance DECIMAL(10, 2) DEFAULT '0' NOT NULL,
  available_balance DECIMAL(10, 2) DEFAULT '0' NOT NULL,
  withdrawn_amount DECIMAL(10, 2) DEFAULT '0' NOT NULL,
  pending_amount DECIMAL(10, 2) DEFAULT '0' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver transactions table
CREATE TABLE IF NOT EXISTS driver_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  balance_before DECIMAL(10, 2) DEFAULT '0',
  balance_after DECIMAL(10, 2) DEFAULT '0',
  reference_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver commissions table
CREATE TABLE IF NOT EXISTS driver_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  order_id UUID NOT NULL REFERENCES orders(id),
  order_amount DECIMAL(10, 2) NOT NULL,
  commission_rate DECIMAL(5, 2) NOT NULL,
  commission_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Driver withdrawals table
CREATE TABLE IF NOT EXISTS driver_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  bank_details TEXT,
  admin_notes TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  position VARCHAR(50) NOT NULL,
  department VARCHAR(50) NOT NULL,
  salary DECIMAL(10, 2) NOT NULL,
  hire_date TIMESTAMP DEFAULT NOW() NOT NULL,
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  address TEXT,
  emergency_contact VARCHAR(100),
  permissions TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  date TIMESTAMP DEFAULT NOW() NOT NULL,
  check_in TIMESTAMP,
  check_out TIMESTAMP,
  status VARCHAR(20) NOT NULL,
  hours_worked DECIMAL(4, 2),
  notes TEXT
);

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  type VARCHAR(50) NOT NULL,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  reason TEXT,
  submitted_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_restaurant_id ON cart(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings_table(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_balances_driver_id ON driver_balances(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_transactions_driver_id ON driver_transactions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_commissions_driver_id ON driver_commissions(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_withdrawals_driver_id ON driver_withdrawals(driver_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
