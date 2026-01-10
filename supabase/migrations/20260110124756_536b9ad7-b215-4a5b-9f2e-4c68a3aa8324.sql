-- Table pour les corrections de transcription (apprentissage)
CREATE TABLE public.transcription_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  original_text TEXT NOT NULL,
  corrected_text TEXT NOT NULL,
  correction_type TEXT NOT NULL CHECK (correction_type IN ('client_name', 'product_name', 'general')),
  usage_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour recherche rapide
CREATE INDEX idx_corrections_original ON public.transcription_corrections(user_id, original_text);
CREATE INDEX idx_corrections_type ON public.transcription_corrections(user_id, correction_type);

-- Enable RLS
ALTER TABLE public.transcription_corrections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own corrections"
  ON public.transcription_corrections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own corrections"
  ON public.transcription_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own corrections"
  ON public.transcription_corrections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own corrections"
  ON public.transcription_corrections FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_transcription_corrections_updated_at
  BEFORE UPDATE ON public.transcription_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();