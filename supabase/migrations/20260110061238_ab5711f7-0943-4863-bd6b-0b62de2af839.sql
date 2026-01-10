-- Ajouter les 6 features manquantes pour compléter les 15 features
INSERT INTO feature_flags (feature_key, name, description, is_globally_enabled, min_plan_required, depends_on) VALUES
('alerts', 'Alertes', 'Rappels automatiques pour dettes et expiration abonnement', true, 'starter', '{}'),
('referrals', 'Parrainage', 'Système de parrainage et commissions affiliés', true, NULL, '{}'),
('commission_payment', 'Paiement Commissions', 'Gestion des paiements de commissions au propriétaire', true, NULL, '{referrals}'),
('invoices', 'Factures', 'Génération de factures PDF professionnelles', true, 'premium', '{sales}'),
('multi_currency', 'Multi-devises', 'Support de plusieurs devises et taux de change', true, 'premium', '{}'),
('offline_mode', 'Mode Hors Ligne', 'Synchronisation des données en mode offline', true, NULL, '{}')
ON CONFLICT (feature_key) DO NOTHING;