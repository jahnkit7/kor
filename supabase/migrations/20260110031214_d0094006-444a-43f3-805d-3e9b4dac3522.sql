-- Corriger le search_path de la fonction créée
CREATE OR REPLACE FUNCTION public.update_commission_balance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;