-- Add missing fields to special_offers table
ALTER TABLE special_offers
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id),
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
ADD COLUMN IF NOT EXISTS menu_item_id UUID REFERENCES menu_items(id),
ADD COLUMN IF NOT EXISTS show_badge BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS badge_text_1 VARCHAR(50) DEFAULT 'طازج يومياً',
ADD COLUMN IF NOT EXISTS badge_text_2 VARCHAR(50) DEFAULT 'عروض حصرية';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_special_offers_restaurant_id ON special_offers(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_special_offers_category_id ON special_offers(category_id);
CREATE INDEX IF NOT EXISTS idx_special_offers_menu_item_id ON special_offers(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_special_offers_is_active ON special_offers(is_active);
