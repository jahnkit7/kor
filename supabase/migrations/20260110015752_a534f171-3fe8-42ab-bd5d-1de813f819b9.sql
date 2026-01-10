-- Insérer les pays de l'Afrique de l'Ouest
-- Togo sera le pays pilote (actif), les autres seront désactivés

INSERT INTO public.countries (name, code, phone_prefix, currency, is_active) VALUES
  ('Togo', 'TG', '+228', 'XOF', true),
  ('Bénin', 'BJ', '+229', 'XOF', false),
  ('Côte d''Ivoire', 'CI', '+225', 'XOF', false),
  ('Sénégal', 'SN', '+221', 'XOF', false),
  ('Mali', 'ML', '+223', 'XOF', false),
  ('Niger', 'NE', '+227', 'XOF', false),
  ('Burkina Faso', 'BF', '+226', 'XOF', false),
  ('Cameroun', 'CM', '+237', 'XAF', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  phone_prefix = EXCLUDED.phone_prefix,
  currency = EXCLUDED.currency,
  is_active = EXCLUDED.is_active;