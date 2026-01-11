-- 1. Ajouter max_sales_per_day à subscriptions (manquant actuellement)
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS max_sales_per_day INTEGER DEFAULT NULL;

-- 2. Ajouter contrainte UNIQUE sur user_id (anti-doublon)
-- D'abord supprimer les doublons potentiels (garder le plus récent)
DELETE FROM subscriptions a USING subscriptions b
WHERE a.user_id = b.user_id 
  AND a.created_at < b.created_at;

-- Puis ajouter la contrainte
ALTER TABLE subscriptions 
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- 3. Mettre à jour les subscriptions existantes avec les bonnes limites depuis subscription_plans
UPDATE subscriptions s
SET 
  max_clients = COALESCE(s.max_clients, p.max_clients),
  max_sales_per_day = p.max_sales_per_day
FROM subscription_plans p
WHERE LOWER(s.plan) = LOWER(p.name);