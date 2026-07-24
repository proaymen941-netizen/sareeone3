-- Migration: Add offerType, bundlePrice, discountScope to special_offers
ALTER TABLE special_offers ADD COLUMN IF NOT EXISTS offer_type VARCHAR(20) DEFAULT 'discount' NOT NULL;
ALTER TABLE special_offers ADD COLUMN IF NOT EXISTS bundle_price DECIMAL(10,2);
ALTER TABLE special_offers ADD COLUMN IF NOT EXISTS discount_scope VARCHAR(20) DEFAULT 'store';
