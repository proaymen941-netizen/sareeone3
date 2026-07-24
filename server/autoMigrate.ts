import postgres from "postgres";

function getSslOption(url: string) {
  if (!url) return undefined;
  const isCloudProvider = url.includes("render.com") || url.includes("dpg-") || url.includes("neon.tech") || url.includes("supabase") || url.includes("aws");
  const hasSslMode = url.includes("sslmode=") || url.includes("ssl=");
  if (isCloudProvider || hasSslMode || process.env.NODE_ENV === "production" || process.env.DB_SSL === "true") {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export async function ensureTablesExist() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.log("⚠️ DATABASE_URL not set, skipping table creation check.");
    return;
  }

  console.log("🛠️ Checking and ensuring database tables exist...");
  const sql = postgres(databaseUrl, {
    ssl: getSslOption(databaseUrl),
    max: 1,
  });

  try {
    await sql.unsafe(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE,
        password TEXT,
        name TEXT NOT NULL,
        phone VARCHAR(20) NOT NULL,
        email VARCHAR(100),
        address TEXT,
        google_id TEXT,
        apple_id TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        address TEXT NOT NULL,
        details TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        is_default BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        icon VARCHAR(100) NOT NULL,
        image TEXT,
        type VARCHAR(50) DEFAULT 'primary',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        image TEXT NOT NULL,
        phone VARCHAR(20),
        rating VARCHAR(10) DEFAULT '0.0',
        review_count INTEGER DEFAULT 0,
        delivery_time VARCHAR(50) NOT NULL,
        is_open BOOLEAN DEFAULT true NOT NULL,
        minimum_order DECIMAL(10, 2) DEFAULT 0,
        delivery_fee DECIMAL(10, 2) DEFAULT 0,
        per_km_fee DECIMAL(10, 2) DEFAULT 0,
        commission_rate DECIMAL(5, 2) DEFAULT 0,
        category_id UUID REFERENCES categories(id),
        opening_time VARCHAR(50) DEFAULT '08:00',
        closing_time VARCHAR(50) DEFAULT '23:00',
        working_days VARCHAR(50) DEFAULT '0,1,2,3,4,5,6',
        is_temporarily_closed BOOLEAN DEFAULT false,
        temporary_close_reason TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        address TEXT,
        is_featured BOOLEAN DEFAULT false,
        is_new BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        brand VARCHAR(100),
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        original_price DECIMAL(10, 2),
        image TEXT NOT NULL,
        category VARCHAR(100) NOT NULL,
        sizes TEXT,
        colors TEXT,
        sales_count INTEGER DEFAULT 0,
        rating VARCHAR(10) DEFAULT '0.0',
        review_count INTEGER DEFAULT 0,
        is_available BOOLEAN DEFAULT true NOT NULL,
        is_special_offer BOOLEAN DEFAULT false NOT NULL,
        is_featured BOOLEAN DEFAULT false,
        is_new BOOLEAN DEFAULT false,
        restaurant_id UUID REFERENCES restaurants(id)
      );

      CREATE TABLE IF NOT EXISTS drivers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        phone VARCHAR(20) NOT NULL UNIQUE,
        password TEXT NOT NULL,
        is_available BOOLEAN DEFAULT true NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        commission_rate DECIMAL(5, 2) DEFAULT 70,
        payment_mode VARCHAR(20) DEFAULT 'commission' NOT NULL,
        salary_amount DECIMAL(10, 2) DEFAULT 0,
        email VARCHAR(100),
        vehicle_type VARCHAR(50),
        vehicle_number VARCHAR(50),
        current_location VARCHAR(200),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        earnings DECIMAL(10, 2) DEFAULT 0,
        completed_orders INTEGER DEFAULT 0 NOT NULL,
        average_rating DECIMAL(3, 2) DEFAULT 0.00,
        review_count INTEGER DEFAULT 0,
        allow_profile_edit BOOLEAN DEFAULT true,
        can_view_wallet BOOLEAN DEFAULT true,
        can_view_stats BOOLEAN DEFAULT true,
        can_toggle_availability BOOLEAN DEFAULT true,
        notes TEXT,
        join_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) NOT NULL UNIQUE,
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_email VARCHAR(100),
        customer_id UUID REFERENCES users(id),
        delivery_address TEXT NOT NULL,
        customer_location_lat DECIMAL(10, 8),
        customer_location_lng DECIMAL(11, 8),
        notes TEXT,
        payment_method VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        items TEXT NOT NULL,
        subtotal DECIMAL(10, 2) NOT NULL,
        delivery_fee DECIMAL(10, 2) NOT NULL,
        total DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        estimated_time VARCHAR(50) DEFAULT '30-45 دقيقة',
        delivery_preference VARCHAR(20) DEFAULT 'now',
        scheduled_date VARCHAR(50),
        scheduled_time_slot VARCHAR(100),
        driver_earnings DECIMAL(10, 2) DEFAULT 0,
        driver_commission_rate DECIMAL(5, 2) DEFAULT 0,
        driver_commission_amount DECIMAL(10, 2) DEFAULT 0,
        commission_processed BOOLEAN DEFAULT false NOT NULL,
        restaurant_earnings DECIMAL(10, 2) DEFAULT 0,
        company_earnings DECIMAL(10, 2) DEFAULT 0,
        distance DECIMAL(10, 2) DEFAULT 0,
        restaurant_id UUID REFERENCES restaurants(id),
        restaurant_name VARCHAR(200),
        restaurant_phone VARCHAR(20),
        driver_id UUID REFERENCES drivers(id),
        is_rated BOOLEAN DEFAULT false NOT NULL,
        is_wasel_li BOOLEAN DEFAULT false NOT NULL,
        pickup_address TEXT,
        pickup_location_lat DECIMAL(10, 8),
        pickup_location_lng DECIMAL(11, 8),
        pickup_phone VARCHAR(20),
        pickup_name VARCHAR(100),
        wasel_li_item_type VARCHAR(100),
        is_scheduled BOOLEAN DEFAULT false NOT NULL,
        scheduled_date_time TIMESTAMP,
        is_scheduled_order_sent BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restaurant_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID REFERENCES restaurants(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS special_offers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        image TEXT NOT NULL,
        offer_type VARCHAR(20) DEFAULT 'discount' NOT NULL,
        discount_percent INTEGER,
        discount_amount DECIMAL(10, 2),
        minimum_order DECIMAL(10, 2) DEFAULT 0,
        discount_scope VARCHAR(20) DEFAULT 'store',
        bundle_price DECIMAL(10, 2),
        restaurant_id UUID REFERENCES restaurants(id),
        category_id UUID REFERENCES categories(id),
        section_id UUID REFERENCES restaurant_sections(id),
        valid_until TIMESTAMP,
        show_badge BOOLEAN DEFAULT true,
        badge_text_1 VARCHAR(50) DEFAULT 'طازج يومياً',
        badge_text_2 VARCHAR(50) DEFAULT 'عروض حصرية',
        menu_item_id UUID REFERENCES menu_items(id),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        username VARCHAR(50) UNIQUE,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20),
        password TEXT,
        user_type VARCHAR(50) DEFAULT 'admin' NOT NULL,
        permissions TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS system_settings_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT NOT NULL,
        category VARCHAR(100) DEFAULT 'general',
        description TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id),
        restaurant_id UUID REFERENCES restaurants(id),
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20),
        rating INTEGER NOT NULL,
        comment TEXT,
        is_approved BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        recipient_type VARCHAR(50) NOT NULL,
        recipient_id TEXT,
        order_id UUID,
        is_read BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS order_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_by_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_phone VARCHAR(20) UNIQUE NOT NULL,
        balance DECIMAL(10, 2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID REFERENCES wallets(id),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        order_id UUID REFERENCES orders(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restaurant_earnings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID REFERENCES restaurants(id),
        owner_name VARCHAR(100) NOT NULL,
        owner_phone VARCHAR(20) NOT NULL,
        total_earnings DECIMAL(10, 2) DEFAULT 0.00,
        pending_amount DECIMAL(10, 2) DEFAULT 0.00,
        paid_amount DECIMAL(10, 2) DEFAULT 0.00,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cart (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        menu_item_id UUID NOT NULL REFERENCES menu_items(id),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id),
        quantity INTEGER DEFAULT 1 NOT NULL,
        special_instructions TEXT,
        added_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS favorites (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        restaurant_id UUID REFERENCES restaurants(id),
        menu_item_id UUID REFERENCES menu_items(id),
        added_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS driver_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id),
        order_id UUID NOT NULL REFERENCES orders(id),
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS driver_earnings_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id),
        total_earned DECIMAL(10, 2) DEFAULT 0,
        withdrawn DECIMAL(10, 2) DEFAULT 0,
        pending DECIMAL(10, 2) DEFAULT 0,
        last_paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS driver_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id),
        balance DECIMAL(10, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS driver_balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL UNIQUE REFERENCES drivers(id),
        total_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
        available_balance DECIMAL(10, 2) DEFAULT 0 NOT NULL,
        withdrawn_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
        pending_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS driver_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        description TEXT,
        balance_before DECIMAL(10, 2) DEFAULT 0,
        balance_after DECIMAL(10, 2) DEFAULT 0,
        reference_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS restaurant_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL UNIQUE REFERENCES restaurants(id),
        balance DECIMAL(10, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS commission_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR(50) NOT NULL,
        entity_id UUID,
        commission_percent DECIMAL(5, 2) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        bank_details TEXT,
        admin_notes TEXT,
        rejection_reason TEXT,
        approved_by UUID,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS driver_work_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id UUID NOT NULL REFERENCES drivers(id),
        start_time TIMESTAMP DEFAULT NOW() NOT NULL,
        end_time TIMESTAMP,
        is_active BOOLEAN DEFAULT true NOT NULL,
        total_deliveries INTEGER DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        position VARCHAR(50) NOT NULL,
        department VARCHAR(50) NOT NULL,
        branch VARCHAR(50) DEFAULT 'الفرع الرئيسي',
        salary DECIMAL(10, 2) NOT NULL,
        hire_date TIMESTAMP DEFAULT NOW() NOT NULL,
        status VARCHAR(20) DEFAULT 'active' NOT NULL,
        address TEXT,
        emergency_contact VARCHAR(100),
        permissions TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

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

      CREATE TABLE IF NOT EXISTS loyalty_points (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        total_points INTEGER DEFAULT 0 NOT NULL,
        redeemed_points INTEGER DEFAULT 0 NOT NULL,
        available_points INTEGER DEFAULT 0 NOT NULL,
        tier VARCHAR(20) DEFAULT 'bronze' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS loyalty_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        order_id UUID REFERENCES orders(id),
        type VARCHAR(30) NOT NULL,
        points INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        customer_name VARCHAR(100) NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        order_id UUID REFERENCES orders(id),
        category VARCHAR(50) NOT NULL,
        subject VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(30) DEFAULT 'open' NOT NULL,
        priority VARCHAR(20) DEFAULT 'normal' NOT NULL,
        assigned_to UUID REFERENCES admin_users(id),
        admin_response TEXT,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS referral_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        code VARCHAR(20) NOT NULL UNIQUE,
        total_referrals INTEGER DEFAULT 0 NOT NULL,
        total_earned DECIMAL(10, 2) DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS referral_usages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referral_code_id UUID NOT NULL REFERENCES referral_codes(id),
        referrer_id UUID NOT NULL REFERENCES users(id),
        referred_user_id UUID NOT NULL REFERENCES users(id),
        points_awarded INTEGER DEFAULT 0,
        discount_awarded DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS device_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES drivers(id),
        token TEXT NOT NULL UNIQUE,
        platform VARCHAR(20) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS restaurant_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID NOT NULL REFERENCES restaurants(id),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20) NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(30) DEFAULT 'owner' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_fee_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id UUID REFERENCES restaurants(id),
        type VARCHAR(50) DEFAULT 'per_km' NOT NULL,
        base_fee DECIMAL(10, 2) DEFAULT 0,
        per_km_fee DECIMAL(10, 2) DEFAULT 0,
        min_fee DECIMAL(10, 2) DEFAULT 0,
        max_fee DECIMAL(10, 2) DEFAULT 1000,
        free_delivery_threshold DECIMAL(10, 2) DEFAULT 0,
        store_lat DECIMAL(10, 8),
        store_lng DECIMAL(11, 8),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        min_distance DECIMAL(10, 2) DEFAULT 0,
        max_distance DECIMAL(10, 2) NOT NULL,
        delivery_fee DECIMAL(10, 2) NOT NULL,
        estimated_time VARCHAR(50),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS financial_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        period_type VARCHAR(20) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        total_orders INTEGER DEFAULT 0 NOT NULL,
        total_revenue DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
        total_delivery_fees DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
        company_commissions DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
        driver_commissions DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
        restaurant_payouts DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
        net_profit DECIMAL(12, 2) DEFAULT 0.00 NOT NULL,
        summary_json TEXT,
        generated_by UUID REFERENCES admin_users(id),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS app_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) DEFAULT 'operational' NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        expense_date TIMESTAMP DEFAULT NOW() NOT NULL,
        notes TEXT,
        recipient VARCHAR(255),
        documents TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS geo_zones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        polygon TEXT NOT NULL,
        surge_multiplier DECIMAL(3, 2) DEFAULT 1.00 NOT NULL,
        delivery_fee_override DECIMAL(10, 2),
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rule_name VARCHAR(100) NOT NULL,
        rule_type VARCHAR(50) NOT NULL,
        condition_field VARCHAR(50) NOT NULL,
        operator VARCHAR(20) NOT NULL,
        value_string TEXT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        action_value DECIMAL(10, 2) NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_discounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE,
        title VARCHAR(100) NOT NULL,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_value DECIMAL(10, 2) DEFAULT 0.00,
        max_discount_amount DECIMAL(10, 2),
        usage_limit INTEGER,
        used_count INTEGER DEFAULT 0 NOT NULL,
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id),
        sender_id VARCHAR(100) NOT NULL,
        sender_type VARCHAR(50) NOT NULL,
        recipient_id VARCHAR(100) NOT NULL,
        recipient_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID,
        user_type VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        details_json TEXT,
        ip_address VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_gateways (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        name_ar VARCHAR(100) NOT NULL,
        type VARCHAR(50) DEFAULT 'digital_wallet' NOT NULL,
        logo_url TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        is_test_mode BOOLEAN DEFAULT false NOT NULL,
        api_key TEXT,
        api_secret TEXT,
        merchant_id TEXT,
        webhook_secret TEXT,
        account_number TEXT,
        account_name TEXT,
        instructions TEXT,
        transaction_fee_percent DECIMAL(5, 2) DEFAULT 0,
        transaction_fee_fixed DECIMAL(10, 2) DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        config_json TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name_ar VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        icon VARCHAR(100) DEFAULT 'wallet',
        image_url TEXT,
        description TEXT,
        is_active BOOLEAN DEFAULT true NOT NULL,
        requires_document BOOLEAN DEFAULT false NOT NULL,
        document_label VARCHAR(150),
        account_number VARCHAR(100),
        account_name VARCHAR(150),
        bank_name VARCHAR(150),
        sort_order INTEGER DEFAULT 0,
        extra_fee DECIMAL(10, 2) DEFAULT 0.00,
        instructions TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_method_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id),
        user_id UUID REFERENCES users(id),
        document_url TEXT NOT NULL,
        document_type VARCHAR(50) DEFAULT 'receipt',
        status VARCHAR(30) DEFAULT 'pending' NOT NULL,
        notes TEXT,
        uploaded_at TIMESTAMP DEFAULT NOW() NOT NULL,
        reviewed_at TIMESTAMP,
        reviewed_by UUID
      );

      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_type VARCHAR(20) NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_value DECIMAL(10, 2) DEFAULT 0,
        max_discount_amount DECIMAL(10, 2),
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS coupon_usages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        order_id UUID REFERENCES orders(id),
        discount_amount DECIMAL(10, 2) NOT NULL,
        used_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wasalni_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        request_number VARCHAR(50) NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone VARCHAR(20) NOT NULL,
        customer_id UUID REFERENCES users(id),
        from_address TEXT NOT NULL,
        to_address TEXT NOT NULL,
        from_lat DECIMAL(10, 8),
        from_lng DECIMAL(11, 8),
        to_lat DECIMAL(10, 8),
        to_lng DECIMAL(11, 8),
        order_type VARCHAR(100) DEFAULT 'طعام',
        notes TEXT,
        scheduled_date VARCHAR(20),
        scheduled_time VARCHAR(20),
        estimated_fee DECIMAL(10, 2),
        status VARCHAR(30) DEFAULT 'pending' NOT NULL,
        driver_id UUID REFERENCES drivers(id),
        cancel_reason TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Ensure columns are added safely
    try {
      await sql.unsafe(`
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'per_km';
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS base_fee DECIMAL(10, 2) DEFAULT 0;
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS per_km_fee DECIMAL(10, 2) DEFAULT 0;
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS min_fee DECIMAL(10, 2) DEFAULT 0;
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS max_fee DECIMAL(10, 2) DEFAULT 1000;
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS free_delivery_threshold DECIMAL(10, 2) DEFAULT 0;
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS store_lat DECIMAL(10, 8);
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS store_lng DECIMAL(11, 8);
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
        ALTER TABLE delivery_fee_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS min_distance DECIMAL(10, 2) DEFAULT 0;
        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS max_distance DECIMAL(10, 2);
        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2);
        ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS estimated_time VARCHAR(50);
      `);
    } catch (columnErr: any) {
      console.warn("⚠️ Warning ensuring additional columns:", columnErr?.message || columnErr);
    }

    // Create indexes safely
    try {
      await sql.unsafe(`
        CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
        CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

        CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);
        CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
        CREATE INDEX IF NOT EXISTS idx_menu_items_is_available ON menu_items(is_available);

        CREATE INDEX IF NOT EXISTS idx_restaurants_category_id ON restaurants(category_id);
        CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);

        CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_type, recipient_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

        CREATE INDEX IF NOT EXISTS idx_wasalni_customer_id ON wasalni_requests(customer_id);
        CREATE INDEX IF NOT EXISTS idx_wasalni_driver_id ON wasalni_requests(driver_id);
        CREATE INDEX IF NOT EXISTS idx_wasalni_status ON wasalni_requests(status);

        CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
        CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings_table(key);
        CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);
        CREATE INDEX IF NOT EXISTS idx_drivers_is_available ON drivers(is_available);
        CREATE INDEX IF NOT EXISTS idx_special_offers_active ON special_offers(is_active);
        CREATE INDEX IF NOT EXISTS idx_cart_user_id ON cart(user_id);
        CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
      `);
    } catch (indexErr: any) {
      console.warn("⚠️ Warning creating database indexes:", indexErr?.message || indexErr);
    }
    console.log("✅ All database tables verified and created successfully.");
  } catch (err: any) {
    console.error("❌ Error ensuring database tables exist:", err?.message || err);
  } finally {
    await sql.end();
  }
}
