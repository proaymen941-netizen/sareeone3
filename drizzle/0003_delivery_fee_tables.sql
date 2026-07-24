-- Delivery Fee Settings table
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

-- Delivery Zones table (for distance-based fees)
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

-- Geo-Zones table (Polygons for geographic areas)
CREATE TABLE IF NOT EXISTS geo_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  coordinates TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Delivery Rules table (Dynamic rules for fee calculation)
CREATE TABLE IF NOT EXISTS delivery_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  rule_type VARCHAR(50) NOT NULL,
  min_distance DECIMAL(10, 2),
  max_distance DECIMAL(10, 2),
  min_order_value DECIMAL(10, 2),
  max_order_value DECIMAL(10, 2),
  geo_zone_id UUID REFERENCES geo_zones(id),
  fee DECIMAL(10, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Delivery Discounts table
CREATE TABLE IF NOT EXISTS delivery_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  discount_type VARCHAR(50) NOT NULL,
  discount_value DECIMAL(10, 2) NOT NULL,
  min_order_value DECIMAL(10, 2),
  valid_from TIMESTAMP,
  valid_until TIMESTAMP,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delivery_fee_settings_restaurant_id ON delivery_fee_settings(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_delivery_fee_settings_is_active ON delivery_fee_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_is_active ON delivery_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_geo_zones_is_active ON geo_zones(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_rules_is_active ON delivery_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_delivery_rules_geo_zone_id ON delivery_rules(geo_zone_id);
CREATE INDEX IF NOT EXISTS idx_delivery_discounts_is_active ON delivery_discounts(is_active);
