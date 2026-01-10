-- Ajouter colonne city (ville) à profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

-- Ajouter colonne specialty (spécialité métier) à profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty text;