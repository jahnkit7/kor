-- Add category column to stock_items for menu items organization
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS category text DEFAULT NULL;

-- Add is_menu_item flag to distinguish menu items from stock items
ALTER TABLE public.stock_items ADD COLUMN IF NOT EXISTS is_menu_item boolean DEFAULT false;

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON public.stock_items(category) WHERE category IS NOT NULL;

-- Create index for menu items lookup
CREATE INDEX IF NOT EXISTS idx_stock_items_is_menu_item ON public.stock_items(is_menu_item) WHERE is_menu_item = true;