-- Bug 2: Add sale_id to debts table for idempotent debt creation
ALTER TABLE public.debts ADD COLUMN IF NOT EXISTS sale_id uuid UNIQUE;
CREATE INDEX IF NOT EXISTS idx_debts_sale_id ON public.debts(sale_id);

-- Bug 3: Add trial_used_at to subscriptions for one-shot trial tracking
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_used_at timestamptz DEFAULT NULL;

-- Bug 3: Trigger to prevent trial reuse
CREATE OR REPLACE FUNCTION public.prevent_trial_reuse()
RETURNS TRIGGER AS $$
BEGIN
  -- If trying to switch to gratuit plan AND trial_used_at is already set
  IF NEW.plan = 'gratuit' AND OLD.trial_used_at IS NOT NULL THEN
    RAISE EXCEPTION 'Trial already used for this account';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to recreate
DROP TRIGGER IF EXISTS check_trial_reuse ON public.subscriptions;

CREATE TRIGGER check_trial_reuse
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_trial_reuse();