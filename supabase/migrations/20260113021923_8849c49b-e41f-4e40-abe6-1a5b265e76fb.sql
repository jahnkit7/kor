-- Table app_settings pour stocker les paramètres globaux de l'application
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique (tous les utilisateurs authentifiés peuvent lire)
CREATE POLICY "Anyone can read app_settings"
ON public.app_settings
FOR SELECT
USING (true);

-- Seuls les admins peuvent modifier
CREATE POLICY "Admins can update app_settings"
ON public.app_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert app_settings"
ON public.app_settings
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insérer la version initiale du cache
INSERT INTO public.app_settings (key, value) VALUES ('cache_version', '1');