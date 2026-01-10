
-- Fix search_path for generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE referral_code = code) INTO exists_check;
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix search_path for set_profile_referral_code
CREATE OR REPLACE FUNCTION public.set_profile_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := public.generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Fix search_path for process_referral_reward
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  referrer_user_id UUID;
  referral_record RECORD;
BEGIN
  -- Only process if subscription is being activated with a paid plan
  IF NEW.plan != 'free_trial' AND NEW.is_active = true THEN
    -- Check if user was referred
    SELECT referred_by INTO referrer_user_id FROM public.profiles WHERE user_id = NEW.user_id;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Find pending referral
      SELECT * INTO referral_record FROM public.referrals 
      WHERE referrer_id = referrer_user_id 
        AND referred_id = NEW.user_id 
        AND status = 'pending'
      LIMIT 1;
      
      IF referral_record.id IS NOT NULL THEN
        -- Mark referral as converted
        UPDATE public.referrals 
        SET status = 'converted', converted_at = now()
        WHERE id = referral_record.id;
        
        -- Log the conversion
        INSERT INTO public.activity_logs (user_id, action_type, action_data)
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
