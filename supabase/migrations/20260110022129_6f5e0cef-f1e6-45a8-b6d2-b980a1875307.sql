-- Insérer une règle de commission par défaut pour démonstration
INSERT INTO public.commissions (name, type, value, applies_to, is_active)
VALUES ('Commission plateforme', 'percentage', 2.0, 'all_sales', true)
ON CONFLICT DO NOTHING;