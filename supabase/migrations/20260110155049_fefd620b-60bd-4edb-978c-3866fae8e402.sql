-- Table des changelogs de features
CREATE TABLE public.feature_changelogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL,
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('feature', 'improvement', 'bugfix', 'breaking')),
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_feature_changelogs_feature ON public.feature_changelogs(feature_key);
CREATE INDEX idx_feature_changelogs_published ON public.feature_changelogs(published_at DESC);

-- Table pour suivre qui a vu quel changelog
CREATE TABLE public.changelog_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  changelog_id UUID REFERENCES public.feature_changelogs(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, changelog_id)
);

-- Ajouter colonne version à feature_flags
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS current_version TEXT DEFAULT '1.0.0';

-- Variantes de feature pour A/B testing
CREATE TABLE public.feature_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL,
  variant_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  traffic_percentage INTEGER DEFAULT 50 CHECK (traffic_percentage >= 0 AND traffic_percentage <= 100),
  is_control BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(feature_key, variant_key)
);

-- Assignations utilisateurs aux variantes
CREATE TABLE public.ab_test_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  variant_id UUID REFERENCES public.feature_variants(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, feature_key)
);

-- Métriques de conversion A/B testing
CREATE TABLE public.ab_test_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  feature_key TEXT NOT NULL,
  variant_id UUID REFERENCES public.feature_variants(id) ON DELETE CASCADE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_ab_assignments_user ON public.ab_test_assignments(user_id);
CREATE INDEX idx_ab_assignments_feature ON public.ab_test_assignments(feature_key);
CREATE INDEX idx_ab_metrics_variant ON public.ab_test_metrics(variant_id);
CREATE INDEX idx_feature_variants_feature ON public.feature_variants(feature_key);

-- Enable RLS
ALTER TABLE public.feature_changelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.changelog_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ab_test_metrics ENABLE ROW LEVEL SECURITY;

-- Changelogs: tout le monde peut lire
CREATE POLICY "Everyone can view changelogs" 
ON public.feature_changelogs FOR SELECT TO authenticated USING (true);

-- Changelogs: admins peuvent créer/modifier
CREATE POLICY "Admins can manage changelogs"
ON public.feature_changelogs FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Changelog views: users voient leurs vues
CREATE POLICY "Users can view their changelog views"
ON public.changelog_views FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their views"
ON public.changelog_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Feature variants: tout le monde peut voir
CREATE POLICY "Users can see variants" 
ON public.feature_variants FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage variants" 
ON public.feature_variants FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- AB assignments: users voient leurs assignations
CREATE POLICY "Users can see their assignments" 
ON public.ab_test_assignments FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their assignments" 
ON public.ab_test_assignments FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- AB metrics: users peuvent tracker leurs métriques
CREATE POLICY "Users can track their metrics" 
ON public.ab_test_metrics FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics" 
ON public.ab_test_metrics FOR SELECT TO authenticated 
USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for changelogs
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_changelogs;