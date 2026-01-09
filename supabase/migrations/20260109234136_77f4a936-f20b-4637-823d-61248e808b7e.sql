-- Create feature usage tracking table
CREATE TABLE public.feature_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  action text NOT NULL DEFAULT 'access',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Users can insert their own usage
CREATE POLICY "Users can log their own usage"
ON public.feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all usage
CREATE POLICY "Admins can view all usage"
ON public.feature_usage
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for analytics queries
CREATE INDEX idx_feature_usage_feature_key ON public.feature_usage(feature_key);
CREATE INDEX idx_feature_usage_created_at ON public.feature_usage(created_at);
CREATE INDEX idx_feature_usage_user_feature ON public.feature_usage(user_id, feature_key);

-- Enable realtime for feature_flags to push notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.feature_flags;