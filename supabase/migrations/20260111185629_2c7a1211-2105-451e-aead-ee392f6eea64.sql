-- Fix function search path for prevent_trial_reuse
CREATE OR REPLACE FUNCTION public.prevent_trial_reuse()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to switch to gratuit plan AND trial_used_at is already set
  IF NEW.plan = 'gratuit' AND OLD.trial_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Trial already used for this account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;