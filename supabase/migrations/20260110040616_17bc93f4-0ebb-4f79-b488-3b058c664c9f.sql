-- 1. Ajouter colonne auto_deduct_stock dans profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS auto_deduct_stock BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.profiles.auto_deduct_stock IS 
  'Si true, les ventes déduisent automatiquement le stock';

-- 2. Créer table stock_alerts
CREATE TABLE IF NOT EXISTS public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity_sold INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  alert_type TEXT NOT NULL DEFAULT 'negative_stock',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour récupérer les alertes non lues rapidement
CREATE INDEX IF NOT EXISTS idx_stock_alerts_user_unread 
  ON public.stock_alerts(user_id, is_read) WHERE is_read = false;

-- RLS pour stock_alerts
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stock alerts"
  ON public.stock_alerts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own stock alerts"
  ON public.stock_alerts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert stock alerts"
  ON public.stock_alerts FOR INSERT
  WITH CHECK (true);

-- 3. Modifier le trigger deduct_stock_on_sale_item pour vérifier les préférences et créer des alertes
CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale_item()
RETURNS TRIGGER AS $$
DECLARE
  should_deduct BOOLEAN;
  current_stock INTEGER;
  new_stock INTEGER;
BEGIN
  -- Si pas de stock_item_id, ne rien faire
  IF NEW.stock_item_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Vérifier la préférence utilisateur
  SELECT COALESCE(auto_deduct_stock, true) INTO should_deduct
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Si déduction désactivée, ne rien faire
  IF NOT should_deduct THEN
    RETURN NEW;
  END IF;

  -- Récupérer le stock actuel
  SELECT quantity INTO current_stock
  FROM public.stock_items
  WHERE id = NEW.stock_item_id;

  -- Si le produit n'existe plus, ne rien faire
  IF current_stock IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculer le nouveau stock
  new_stock := current_stock - NEW.quantity;

  -- Déduire le stock (même si ça devient négatif)
  UPDATE public.stock_items
  SET quantity = new_stock,
      updated_at = now()
  WHERE id = NEW.stock_item_id;

  -- Si le stock devient négatif, créer une alerte
  IF new_stock < 0 THEN
    INSERT INTO public.stock_alerts (
      user_id, 
      stock_item_id, 
      sale_id, 
      product_name, 
      quantity_sold, 
      stock_after, 
      alert_type
    )
    VALUES (
      NEW.user_id, 
      NEW.stock_item_id, 
      NEW.sale_id, 
      NEW.product_name, 
      NEW.quantity, 
      new_stock,
      'negative_stock'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;