-- =====================================================
-- MIGRATION: Stock-Ventes + Système Commissions
-- =====================================================

-- 1. TABLE sale_items pour lier les ventes aux produits du stock
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  stock_item_id UUID REFERENCES public.stock_items(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_stock_item_id ON public.sale_items(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_user_id ON public.sale_items(user_id);

-- Enable RLS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour sale_items
CREATE POLICY "Users can view their own sale items"
  ON public.sale_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sale items"
  ON public.sale_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sale items"
  ON public.sale_items
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sale items"
  ON public.sale_items
  FOR DELETE
  USING (auth.uid() = user_id);

-- 2. TRIGGER: Déduire automatiquement le stock après insertion dans sale_items
CREATE OR REPLACE FUNCTION public.deduct_stock_on_sale_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un stock_item_id est lié, déduire la quantité
  IF NEW.stock_item_id IS NOT NULL THEN
    UPDATE public.stock_items 
    SET quantity = GREATEST(0, quantity - NEW.quantity),
        updated_at = now()
    WHERE id = NEW.stock_item_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_deduct_stock_on_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_sale_item();

-- 3. CONTRAINTE UNIQUE sur commission_balances.user_id pour permettre l'upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'commission_balances_user_id_unique'
  ) THEN
    ALTER TABLE public.commission_balances
    ADD CONSTRAINT commission_balances_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 4. TRIGGER: Mettre à jour commission_balances à chaque vente
CREATE OR REPLACE FUNCTION public.update_commission_balance_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  commission_amount NUMERIC := 0;
  rule RECORD;
BEGIN
  -- Calculer la commission en fonction des règles actives
  FOR rule IN 
    SELECT * FROM public.commissions 
    WHERE is_active = true
  LOOP
    -- Vérifier si la règle s'applique à ce type de vente
    IF rule.applies_to = 'all_sales' OR 
       (rule.applies_to = 'cash_only' AND NEW.type = 'cash') OR
       (rule.applies_to = 'credit_only' AND NEW.type = 'credit') THEN
      -- Calculer selon le type de commission
      IF rule.type = 'percentage' THEN
        commission_amount := commission_amount + (NEW.amount * rule.value / 100);
      ELSE
        commission_amount := commission_amount + rule.value;
      END IF;
    END IF;
  END LOOP;
  
  -- Si une commission est calculée, mettre à jour le solde
  IF commission_amount > 0 THEN
    INSERT INTO public.commission_balances (user_id, balance, total_earned, total_paid)
    VALUES (NEW.user_id, commission_amount, commission_amount, 0)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      balance = public.commission_balances.balance + commission_amount,
      total_earned = public.commission_balances.total_earned + commission_amount,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_update_commission_on_sale ON public.sales;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_update_commission_on_sale
AFTER INSERT ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.update_commission_balance_on_sale();

-- 5. MIGRATION: Créer les commission_balances pour les ventes existantes
DO $$
DECLARE
  user_record RECORD;
  total_commission NUMERIC;
  rule RECORD;
  sale_record RECORD;
BEGIN
  -- Pour chaque utilisateur qui a fait des ventes
  FOR user_record IN 
    SELECT DISTINCT user_id FROM public.sales
  LOOP
    total_commission := 0;
    
    -- Pour chaque vente de cet utilisateur
    FOR sale_record IN 
      SELECT * FROM public.sales WHERE user_id = user_record.user_id
    LOOP
      -- Pour chaque règle de commission active
      FOR rule IN 
        SELECT * FROM public.commissions WHERE is_active = true
      LOOP
        IF rule.applies_to = 'all_sales' OR 
           (rule.applies_to = 'cash_only' AND sale_record.type = 'cash') OR
           (rule.applies_to = 'credit_only' AND sale_record.type = 'credit') THEN
          IF rule.type = 'percentage' THEN
            total_commission := total_commission + (sale_record.amount * rule.value / 100);
          ELSE
            total_commission := total_commission + rule.value;
          END IF;
        END IF;
      END LOOP;
    END LOOP;
    
    -- Insérer ou mettre à jour le solde si commission > 0
    IF total_commission > 0 THEN
      INSERT INTO public.commission_balances (user_id, balance, total_earned, total_paid)
      VALUES (user_record.user_id, total_commission, total_commission, 0)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        balance = EXCLUDED.balance,
        total_earned = EXCLUDED.total_earned,
        updated_at = now();
    END IF;
  END LOOP;
END $$;