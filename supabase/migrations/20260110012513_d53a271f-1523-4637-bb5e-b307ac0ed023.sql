
-- Fix: Replace overly permissive INSERT policy with SECURITY DEFINER triggers handling inserts
DROP POLICY "System can insert activities" ON public.activity_logs;

-- Create a security definer function for inserting activity logs (triggers already use SECURITY DEFINER)
-- The triggers already handle inserts securely, so we don't need a public INSERT policy
