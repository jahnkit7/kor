-- Insertion des feature flags de base
INSERT INTO public.feature_flags (feature_key, name, description, is_globally_enabled, min_plan_required, depends_on) VALUES
  ('sales', 'Ventes', 'Enregistrement et suivi des ventes', true, NULL, '{}'),
  ('stock', 'Stock', 'Gestion du stock et inventaire', true, NULL, '{}'),
  ('clients', 'Clients', 'Gestion de la base clients', true, NULL, '{}'),
  ('debts', 'Créances', 'Suivi des dettes clients', true, NULL, '{clients}'),
  ('reports', 'Rapports', 'Rapports et statistiques avancés', true, 'starter', '{sales}'),
  ('voice_input', 'Entrée vocale', 'Saisie vocale des ventes et stock', true, 'starter', '{}'),
  ('ai_analysis', 'Analyse IA', 'Analyse intelligente des données', true, 'premium', '{voice_input}'),
  ('network', 'Réseau Marchands', 'Réseau B2B entre marchands', true, 'premium', '{clients}'),
  ('employees', 'Gestion Employés', 'Gestion des employés et permissions', true, 'premium', '{}')
ON CONFLICT (feature_key) DO NOTHING;

-- Insertion des items de roadmap de démonstration
INSERT INTO public.roadmap_items (title, description, category, status, priority, estimated_effort) VALUES
  ('Mode hors-ligne complet', 'Fonctionnement complet de l''application sans connexion internet', 'feature', 'completed', 'high', 'large'),
  ('Entrée vocale ventes', 'Enregistrement des ventes par commande vocale', 'feature', 'completed', 'high', 'medium'),
  ('Réseau marchands B2B', 'Place de marché pour les échanges entre commerçants', 'feature', 'in_progress', 'high', 'large'),
  ('Synchronisation multi-appareils', 'Accès aux données depuis plusieurs appareils', 'feature', 'backlog', 'medium', 'large'),
  ('Export PDF des rapports', 'Génération de rapports en format PDF', 'improvement', 'backlog', 'medium', 'small'),
  ('Notifications push', 'Alertes push pour les événements importants', 'feature', 'backlog', 'medium', 'medium');