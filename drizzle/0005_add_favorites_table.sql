-- Favorites table for storing user favorite items and restaurants
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_restaurant_id ON favorites(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_favorites_menu_item_id ON favorites(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_menu_item ON favorites(user_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_restaurant ON favorites(user_id, restaurant_id);
