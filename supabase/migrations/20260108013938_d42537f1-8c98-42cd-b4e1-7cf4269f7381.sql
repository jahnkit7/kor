-- Create merchant_negotiations table for tracking deals between merchants
CREATE TABLE public.merchant_negotiations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID REFERENCES public.product_requests(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES public.merchant_offers(id) ON DELETE SET NULL,
  proposer_id UUID NOT NULL,
  responder_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  proposed_quantity INTEGER,
  proposed_unit TEXT DEFAULT 'pièces',
  proposed_price INTEGER,
  proposed_total INTEGER,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'counter', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.merchant_negotiations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view negotiations they are part of
CREATE POLICY "Users can view their negotiations"
  ON public.merchant_negotiations
  FOR SELECT
  USING (auth.uid() = proposer_id OR auth.uid() = responder_id);

-- Policy: Authenticated users can create negotiations
CREATE POLICY "Authenticated users can create negotiations"
  ON public.merchant_negotiations
  FOR INSERT
  WITH CHECK (auth.uid() = proposer_id);

-- Policy: Users can update negotiations they are part of
CREATE POLICY "Users can update their negotiations"
  ON public.merchant_negotiations
  FOR UPDATE
  USING (auth.uid() = proposer_id OR auth.uid() = responder_id);

-- Create trigger for updated_at
CREATE TRIGGER update_merchant_negotiations_updated_at
  BEFORE UPDATE ON public.merchant_negotiations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for negotiations
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchant_negotiations;