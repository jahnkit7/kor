-- Create merchant_offers table for suppliers to post their available products
CREATE TABLE public.merchant_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_name text NOT NULL,
  description text,
  quantity integer,
  unit text DEFAULT 'pièces',
  price integer,
  is_promo boolean DEFAULT false,
  promo_label text,
  status text DEFAULT 'active',
  expires_at timestamptz DEFAULT (now() + interval '14 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_offers ENABLE ROW LEVEL SECURITY;

-- Anyone can view active offers
CREATE POLICY "Anyone can view active offers"
ON public.merchant_offers
FOR SELECT
USING (status = 'active' OR auth.uid() = user_id);

-- Users can create their own offers
CREATE POLICY "Users can create their own offers"
ON public.merchant_offers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own offers
CREATE POLICY "Users can update their own offers"
ON public.merchant_offers
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own offers
CREATE POLICY "Users can delete their own offers"
ON public.merchant_offers
FOR DELETE
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_merchant_offers_updated_at
BEFORE UPDATE ON public.merchant_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for offers
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_offers;