-- Add is_beta column to feature_flags table
ALTER TABLE public.feature_flags 
ADD COLUMN IF NOT EXISTS is_beta BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.feature_flags.is_beta IS 'Indicates if the feature is in beta testing phase';