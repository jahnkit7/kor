
-- Create referrals table
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referral_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reward_type TEXT DEFAULT 'discount_percent',
  reward_value NUMERIC DEFAULT 10,
  reward_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'converted', 'rewarded', 'expired'))
);

-- Create unique index on referral_code
CREATE UNIQUE INDEX idx_referrals_code ON public.referrals(referral_code);

-- Create index for referrer lookups
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

-- Enable RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals (as referrer or referred)
CREATE POLICY "Users can view their referrals"
  ON public.referrals
  FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Users can create referral invites
CREATE POLICY "Users can create referral invites"
  ON public.referrals
  FOR INSERT
  WITH CHECK (auth.uid() = referrer_id);

-- System can update referrals (for conversion)
CREATE POLICY "Users can update their referrals"
  ON public.referrals
  FOR UPDATE
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Admins can view all referrals
CREATE POLICY "Admins can view all referrals"
  ON public.referrals
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage referrals
CREATE POLICY "Admins can manage referrals"
  ON public.referrals
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add referral_code column to profiles for easy sharing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Add referred_by column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referred_by UUID;

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = code) INTO exists_check;
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate referral code for new profiles
CREATE OR REPLACE FUNCTION set_profile_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_profile_referral_code
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_profile_referral_code();

-- Update existing profiles with referral codes
UPDATE public.profiles SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- Function to process referral when user subscribes to a paid plan
CREATE OR REPLACE FUNCTION process_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  referrer_user_id UUID;
  referral_record RECORD;
BEGIN
  -- Only process if subscription is being activated with a paid plan
  IF NEW.plan != 'free_trial' AND NEW.is_active = true THEN
    -- Check if user was referred
    SELECT referred_by INTO referrer_user_id FROM profiles WHERE user_id = NEW.user_id;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Find pending referral
      SELECT * INTO referral_record FROM referrals 
      WHERE referrer_id = referrer_user_id 
        AND referred_id = NEW.user_id 
        AND status = 'pending'
      LIMIT 1;
      
      IF referral_record.id IS NOT NULL THEN
        -- Mark referral as converted
        UPDATE referrals 
        SET status = 'converted', converted_at = now()
        WHERE id = referral_record.id;
        
        -- Log the conversion
        INSERT INTO activity_logs (user_id, action_type, action_data)
        VALUES (referrer_user_id, 'referral_converted', jsonb_build_object(
          'referred_user_id', NEW.user_id,
          'plan', NEW.plan,
          'reward_value', referral_record.reward_value
        ));
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_process_referral
  AFTER UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_reward();
