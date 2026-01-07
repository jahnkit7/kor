-- Create merchant_profiles table for network discovery
CREATE TABLE public.merchant_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  merchant_type TEXT NOT NULL DEFAULT 'détaillant', -- grossiste, détaillant, producteur
  specialties TEXT[] DEFAULT '{}', -- product categories
  location_name TEXT, -- e.g., "Marché Dékon, Lomé"
  location_lat NUMERIC(10, 7),
  location_lng NUMERIC(10, 7),
  is_visible BOOLEAN NOT NULL DEFAULT true, -- show in network search
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on merchant_profiles
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all visible merchant profiles (network discovery)
CREATE POLICY "Anyone can view visible merchants"
ON public.merchant_profiles
FOR SELECT
USING (is_visible = true OR auth.uid() = user_id);

-- Users can create their own merchant profile
CREATE POLICY "Users can create their own merchant profile"
ON public.merchant_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own merchant profile
CREATE POLICY "Users can update their own merchant profile"
ON public.merchant_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own merchant profile
CREATE POLICY "Users can delete their own merchant profile"
ON public.merchant_profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Create product_requests table for voice-based sourcing
CREATE TABLE public.product_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  raw_transcript TEXT, -- original voice input
  product_name TEXT NOT NULL,
  quantity INTEGER,
  unit TEXT, -- kg, pièces, cartons, etc.
  max_price INTEGER, -- budget limit
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open, fulfilled, expired, cancelled
  fulfilled_by UUID, -- merchant who fulfilled it
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on product_requests
ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

-- Users can view open requests (network sourcing) and their own requests
CREATE POLICY "Users can view open or own requests"
ON public.product_requests
FOR SELECT
USING (status = 'open' OR auth.uid() = user_id OR auth.uid() = fulfilled_by);

-- Users can create their own product requests
CREATE POLICY "Users can create their own requests"
ON public.product_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests OR fulfill open requests
CREATE POLICY "Users can update own or fulfill open requests"
ON public.product_requests
FOR UPDATE
USING (auth.uid() = user_id OR (status = 'open' AND fulfilled_by IS NULL));

-- Only owners can delete their requests
CREATE POLICY "Users can delete their own requests"
ON public.product_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_merchant_profiles_updated_at
BEFORE UPDATE ON public.merchant_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_requests_updated_at
BEFORE UPDATE ON public.product_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for product requests (live notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_requests;