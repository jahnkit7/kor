-- Create table for saved invoices
CREATE TABLE public.saved_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date TIMESTAMP WITH TIME ZONE NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  payment_type TEXT NOT NULL,
  note TEXT,
  currency TEXT DEFAULT 'CFA',
  style TEXT NOT NULL DEFAULT 'classic',
  html_content TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own invoices" 
ON public.saved_invoices 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices" 
ON public.saved_invoices 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices" 
ON public.saved_invoices 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add invoice customization settings to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS invoice_settings JSONB DEFAULT '{
  "logo_url": null,
  "primary_color": "#8B5CF6",
  "secondary_color": "#0EA5E9",
  "show_logo": true,
  "footer_text": null
}'::jsonb;