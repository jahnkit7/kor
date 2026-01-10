-- Ajouter colonne pour les paramètres de notification dans profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "debt_threshold": 50000,
  "low_stock_threshold": 5,
  "notify_high_debt": true,
  "notify_low_stock": true
}'::jsonb;

-- Fonction pour vérifier les dettes et envoyer notifications
CREATE OR REPLACE FUNCTION public.check_and_notify_high_debt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_profile RECORD;
  total_debt INTEGER;
  debt_threshold INTEGER;
BEGIN
  -- Calculer le total des dettes non payées pour cet utilisateur
  SELECT COALESCE(SUM(amount - paid), 0) INTO total_debt
  FROM public.debts
  WHERE user_id = NEW.user_id AND paid < amount;

  -- Récupérer les paramètres de notification de l'utilisateur
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_profile.notification_settings IS NOT NULL 
     AND (user_profile.notification_settings->>'notify_high_debt')::boolean = true THEN
    
    debt_threshold := COALESCE((user_profile.notification_settings->>'debt_threshold')::integer, 50000);
    
    -- Vérifier si le seuil est dépassé
    IF total_debt >= debt_threshold THEN
      -- Ne pas spammer - vérifier si une notification récente existe
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'warning'
          AND title = 'Alerte dettes élevées'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.send_notification(
          NEW.user_id,
          'Alerte dettes élevées',
          'Vos dettes totales (' || total_debt || ' CFA) dépassent votre seuil de ' || debt_threshold || ' CFA.',
          'warning',
          '/debts'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger sur la table debts
DROP TRIGGER IF EXISTS check_debt_threshold ON public.debts;
CREATE TRIGGER check_debt_threshold
AFTER INSERT OR UPDATE ON public.debts
FOR EACH ROW
EXECUTE FUNCTION public.check_and_notify_high_debt();

-- Fonction pour vérifier le stock bas
CREATE OR REPLACE FUNCTION public.check_and_notify_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_profile RECORD;
  stock_threshold INTEGER;
BEGIN
  -- Récupérer les paramètres de notification de l'utilisateur
  SELECT * INTO user_profile FROM public.profiles WHERE user_id = NEW.user_id;
  
  IF user_profile.notification_settings IS NOT NULL 
     AND (user_profile.notification_settings->>'notify_low_stock')::boolean = true THEN
    
    stock_threshold := COALESCE((user_profile.notification_settings->>'low_stock_threshold')::integer, 5);
    
    -- Vérifier si la quantité est en dessous du seuil
    IF NEW.quantity <= stock_threshold AND NEW.quantity > 0 THEN
      -- Ne pas spammer - vérifier si une notification récente existe pour ce produit
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'warning'
          AND message LIKE '%' || NEW.name || '%'
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.send_notification(
          NEW.user_id,
          'Stock bas : ' || NEW.name,
          'Le produit "' || NEW.name || '" n''a plus que ' || NEW.quantity || ' unités en stock.',
          'warning',
          '/stock'
        );
      END IF;
    END IF;
    
    -- Alerte rupture de stock
    IF NEW.quantity = 0 THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = NEW.user_id 
          AND type = 'error'
          AND title = 'Rupture de stock : ' || NEW.name
          AND created_at > NOW() - INTERVAL '24 hours'
      ) THEN
        PERFORM public.send_notification(
          NEW.user_id,
          'Rupture de stock : ' || NEW.name,
          'Le produit "' || NEW.name || '" est en rupture de stock!',
          'error',
          '/stock'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger sur la table stock_items
DROP TRIGGER IF EXISTS check_stock_threshold ON public.stock_items;
CREATE TRIGGER check_stock_threshold
AFTER INSERT OR UPDATE ON public.stock_items
FOR EACH ROW
EXECUTE FUNCTION public.check_and_notify_low_stock();