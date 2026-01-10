-- 1. Ajouter les nouvelles fonctionnalités dans feature_flags
INSERT INTO feature_flags (feature_key, name, description, is_globally_enabled, min_plan_required, depends_on)
VALUES 
  ('alerts', 'Alertes', 'Rappels automatiques pour dettes et expiration abonnement', true, 'starter', ARRAY[]::text[]),
  ('referrals', 'Parrainage', 'Système de parrainage et commissions affiliés', true, NULL, ARRAY[]::text[]),
  ('commissions', 'Paiement Commissions', 'Gestion des paiements de commissions au propriétaire', true, NULL, ARRAY['referrals']::text[]),
  ('invoice_generator', 'Factures', 'Génération de factures PDF professionnelles', true, 'premium', ARRAY['sales']::text[]),
  ('multi_currency', 'Multi-devises', 'Support de plusieurs devises et taux de change', true, 'premium', ARRAY[]::text[]),
  ('offline_mode', 'Mode Hors Ligne', 'Synchronisation des données en mode offline', true, NULL, ARRAY[]::text[])
ON CONFLICT (feature_key) DO NOTHING;

-- 2. Créer la table roadmap_items pour le suivi des fonctionnalités
CREATE TABLE IF NOT EXISTS public.roadmap_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'in_progress', 'testing', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'feature' CHECK (category IN ('feature', 'bug', 'improvement', 'security', 'performance')),
  target_version TEXT,
  estimated_effort TEXT,
  created_by UUID REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_roadmap_items_status ON public.roadmap_items(status);
CREATE INDEX IF NOT EXISTS idx_roadmap_items_priority ON public.roadmap_items(priority);

-- Enable RLS
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;

-- Policies pour roadmap_items (accessible aux admins seulement)
CREATE POLICY "Admins can view all roadmap items"
  ON public.roadmap_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create roadmap items"
  ON public.roadmap_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update roadmap items"
  ON public.roadmap_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete roadmap items"
  ON public.roadmap_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger pour updated_at
CREATE TRIGGER update_roadmap_items_updated_at
  BEFORE UPDATE ON public.roadmap_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();