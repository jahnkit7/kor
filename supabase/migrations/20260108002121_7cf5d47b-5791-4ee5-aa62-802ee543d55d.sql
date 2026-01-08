-- Add market_address column for indoor navigation
ALTER TABLE public.merchant_profiles 
ADD COLUMN IF NOT EXISTS market_address TEXT;

-- Create a function to get trust score data for a user
CREATE OR REPLACE FUNCTION public.get_trust_score_data(target_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_debts', COALESCE((
      SELECT COUNT(*) FROM debts WHERE user_id = target_user_id
    ), 0),
    'paid_debts', COALESCE((
      SELECT COUNT(*) FROM debts WHERE user_id = target_user_id AND paid >= amount
    ), 0),
    'total_sales_amount', COALESCE((
      SELECT SUM(amount) FROM sales WHERE user_id = target_user_id
    ), 0),
    'total_sales_count', COALESCE((
      SELECT COUNT(*) FROM sales WHERE user_id = target_user_id
    ), 0),
    'account_age_days', COALESCE((
      SELECT EXTRACT(DAY FROM (NOW() - created_at))::INTEGER 
      FROM profiles WHERE user_id = target_user_id
    ), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;