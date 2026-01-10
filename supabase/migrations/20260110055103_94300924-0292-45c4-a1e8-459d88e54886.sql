-- Insertion des pays d'Afrique de l'Ouest/Centrale
INSERT INTO public.countries (name, code, phone_prefix, currency, is_active) VALUES
  ('Bénin', 'BJ', '+229', 'XOF', false),
  ('Togo', 'TG', '+228', 'XOF', true),
  ('Côte d''Ivoire', 'CI', '+225', 'XOF', false),
  ('Sénégal', 'SN', '+221', 'XOF', false),
  ('Mali', 'ML', '+223', 'XOF', false),
  ('Niger', 'NE', '+227', 'XOF', false),
  ('Burkina Faso', 'BF', '+226', 'XOF', false),
  ('Cameroun', 'CM', '+237', 'XAF', false);

-- Insertion des plans d'abonnement
INSERT INTO public.subscription_plans (name, price, duration_days, currency, features, is_active, sort_order, description) VALUES
  ('Gratuit', 0, 7, 'XOF', '["basic_sales", "basic_stock", "basic_clients", "basic_debts"]'::jsonb, true, 0, 'Essai gratuit de 7 jours'),
  ('Starter', 1500, 30, 'XOF', '["basic_sales", "basic_stock", "basic_clients", "basic_debts", "reports", "voice_input"]'::jsonb, true, 1, 'Pour les petites boutiques'),
  ('Premium', 5000, 30, 'XOF', '["basic_sales", "basic_stock", "basic_clients", "basic_debts", "reports", "voice_input", "network", "ai_analysis", "employees"]'::jsonb, true, 2, 'Fonctionnalités avancées'),
  ('Annuel Premium', 50000, 365, 'XOF', '["basic_sales", "basic_stock", "basic_clients", "basic_debts", "reports", "voice_input", "network", "ai_analysis", "employees", "priority_support"]'::jsonb, true, 3, 'Premium avec 2 mois offerts');