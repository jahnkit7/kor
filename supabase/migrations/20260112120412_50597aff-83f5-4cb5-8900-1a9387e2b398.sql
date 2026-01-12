-- Create cash_drawer table for storing daily opening balances
CREATE TABLE public.cash_drawer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  owner_user_id UUID, -- For employees, this links to the owner
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for quick daily lookups
CREATE INDEX idx_cash_drawer_user_date ON public.cash_drawer (user_id, opened_at);
CREATE INDEX idx_cash_drawer_owner_date ON public.cash_drawer (owner_user_id, opened_at);

-- Enable Row Level Security
ALTER TABLE public.cash_drawer ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own entries or entries from their team (if owner)
CREATE POLICY "Users can view own and team cash drawer entries"
ON public.cash_drawer
FOR SELECT
USING (
  auth.uid() = user_id 
  OR auth.uid() = owner_user_id
  OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.linked_owner_id = cash_drawer.owner_user_id
  )
);

-- Policy: Users can insert their own entries
CREATE POLICY "Users can create their own cash drawer entries"
ON public.cash_drawer
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own entries (close drawer)
CREATE POLICY "Users can update their own cash drawer entries"
ON public.cash_drawer
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for automatic timestamp updates
CREATE TRIGGER update_cash_drawer_updated_at
BEFORE UPDATE ON public.cash_drawer
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();