-- Add depends_on column to feature_flags
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS depends_on text[] DEFAULT '{}';

-- Insert default features with dependencies
INSERT INTO public.feature_flags (feature_key, name, description, is_globally_enabled, min_plan_required, depends_on) VALUES
  ('sales', 'Ventes', 'Gestion des ventes cash et crédit', true, NULL, '{}'),
  ('stock', 'Stock', 'Gestion des produits et inventaire', true, NULL, '{}'),
  ('clients', 'Clients', 'Gestion des clients et contacts', true, NULL, '{}'),
  ('debts', 'Créances', 'Suivi des dettes et paiements', true, NULL, '{clients}'),
  ('reports', 'Rapports', 'Statistiques et analyses', true, 'starter', '{sales}'),
  ('network', 'Réseau', 'Place de marché entre commerçants', true, 'premium', '{}'),
  ('voice_input', 'Saisie Vocale', 'Entrée de données par la voix', true, 'starter', '{}'),
  ('ai_analysis', 'Analyse IA', 'Analyse intelligente des données', true, 'premium', '{voice_input}'),
  ('employees', 'Employés', 'Gestion des employés et accès', true, 'premium', '{}')
ON CONFLICT (feature_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  depends_on = EXCLUDED.depends_on;

-- Insert default subscription plans with features
INSERT INTO public.subscription_plans (name, description, price, duration_days, currency, features, max_clients, max_sales_per_day, sort_order, is_active) VALUES
  ('Gratuit', 'Plan de démarrage avec fonctionnalités essentielles', 0, 30, 'XOF', '["sales", "stock", "clients", "debts"]', 10, 20, 1, true),
  ('Starter', 'Pour les commerces en croissance', 2500, 30, 'XOF', '["sales", "stock", "clients", "debts", "reports", "voice_input"]', 50, 100, 2, true),
  ('Premium', 'Accès complet à toutes les fonctionnalités', 5000, 30, 'XOF', '["sales", "stock", "clients", "debts", "reports", "voice_input", "network", "ai_analysis", "employees"]', NULL, NULL, 3, true),
  ('Annuel Premium', 'Premium avec 2 mois offerts', 50000, 365, 'XOF', '["sales", "stock", "clients", "debts", "reports", "voice_input", "network", "ai_analysis", "employees"]', NULL, NULL, 4, true)
ON CONFLICT DO NOTHING;