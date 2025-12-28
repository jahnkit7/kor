-- Create table to store raw voice transcriptions (failsafe flow)
CREATE TABLE IF NOT EXISTS public.stock_voice_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  raw_transcript TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_parse',
  parsed_items JSONB,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_voice_entries ENABLE ROW LEVEL SECURITY;

-- RLS: user owns their entries
DO $$ BEGIN
  CREATE POLICY "Users can view their own stock voice entries"
  ON public.stock_voice_entries
  FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can create their own stock voice entries"
  ON public.stock_voice_entries
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update their own stock voice entries"
  ON public.stock_voice_entries
  FOR UPDATE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete their own stock voice entries"
  ON public.stock_voice_entries
  FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_stock_voice_entries_updated_at ON public.stock_voice_entries;
CREATE TRIGGER update_stock_voice_entries_updated_at
BEFORE UPDATE ON public.stock_voice_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_stock_voice_entries_user_created_at
ON public.stock_voice_entries (user_id, created_at DESC);
