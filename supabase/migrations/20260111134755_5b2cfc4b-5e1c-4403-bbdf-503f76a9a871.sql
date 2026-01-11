-- Table des revendeurs
CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  city TEXT,
  commission_rate NUMERIC DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  total_codes_sold INTEGER DEFAULT 0,
  total_earnings NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ajouter colonne reseller_id à recharge_codes
ALTER TABLE public.recharge_codes 
ADD COLUMN reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL;

-- Ajouter colonne sold_at pour tracker quand le code est vendu par le revendeur
ALTER TABLE public.recharge_codes 
ADD COLUMN sold_at TIMESTAMPTZ;

-- RLS pour resellers
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;

-- Admins peuvent tout faire
CREATE POLICY "Admins full access on resellers"
ON public.resellers
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Les revendeurs peuvent voir leur propre profil
CREATE POLICY "Resellers can view own profile"
ON public.resellers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Trigger pour updated_at
CREATE TRIGGER update_resellers_updated_at
BEFORE UPDATE ON public.resellers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();