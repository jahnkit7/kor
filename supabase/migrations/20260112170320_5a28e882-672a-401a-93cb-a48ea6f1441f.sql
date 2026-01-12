-- Add missing unique constraints for ON CONFLICT to work
DO $$ 
BEGIN
  -- Countries code unique
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'countries_code_key') THEN
    ALTER TABLE countries ADD CONSTRAINT countries_code_key UNIQUE (code);
  END IF;
  
  -- Subscription plans name unique
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_name_key') THEN
    ALTER TABLE subscription_plans ADD CONSTRAINT subscription_plans_name_key UNIQUE (name);
  END IF;
  
  -- Commissions name unique
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commissions_name_key') THEN
    ALTER TABLE commissions ADD CONSTRAINT commissions_name_key UNIQUE (name);
  END IF;
  
  -- Roadmap items title unique
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roadmap_items_title_key') THEN
    ALTER TABLE roadmap_items ADD CONSTRAINT roadmap_items_title_key UNIQUE (title);
  END IF;
END $$;