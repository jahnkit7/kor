-- Function to recalculate all commission balances based on existing sales
CREATE OR REPLACE FUNCTION public.recalculate_all_commissions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_record RECORD;
  v_sale_record RECORD;
  v_commission_total NUMERIC;
  v_rules RECORD;
  v_rule_commission NUMERIC;
  v_users_processed INTEGER := 0;
  v_sales_processed INTEGER := 0;
  v_total_commissions NUMERIC := 0;
BEGIN
  -- Reset all commission balances to 0 (but keep total_paid)
  UPDATE commission_balances
  SET 
    total_earned = 0,
    balance = -total_paid,
    updated_at = now();

  -- For each user with sales
  FOR v_user_record IN 
    SELECT DISTINCT user_id 
    FROM sales 
    WHERE user_id IS NOT NULL
  LOOP
    v_commission_total := 0;

    -- For each sale of this user
    FOR v_sale_record IN 
      SELECT id, amount, type, created_at
      FROM sales 
      WHERE user_id = v_user_record.user_id
    LOOP
      -- For each active commission rule
      FOR v_rules IN 
        SELECT id, name, type AS rule_type, value, applies_to
        FROM commissions 
        WHERE is_active = true
      LOOP
        -- Check if rule applies to this sale type
        IF v_rules.applies_to = 'all_sales' 
           OR (v_rules.applies_to = 'cash_only' AND v_sale_record.type = 'cash')
           OR (v_rules.applies_to = 'credit_only' AND v_sale_record.type = 'credit') THEN
          
          -- Calculate commission for this rule
          IF v_rules.rule_type = 'percentage' THEN
            v_rule_commission := v_sale_record.amount * v_rules.value / 100;
          ELSE
            v_rule_commission := v_rules.value;
          END IF;
          
          v_commission_total := v_commission_total + v_rule_commission;
        END IF;
      END LOOP;

      v_sales_processed := v_sales_processed + 1;
    END LOOP;

    -- Update or insert commission balance for this user
    INSERT INTO commission_balances (user_id, total_earned, balance, updated_at)
    VALUES (v_user_record.user_id, v_commission_total, v_commission_total, now())
    ON CONFLICT (user_id) DO UPDATE SET
      total_earned = v_commission_total,
      balance = v_commission_total - commission_balances.total_paid,
      updated_at = now();

    v_users_processed := v_users_processed + 1;
    v_total_commissions := v_total_commissions + v_commission_total;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'users_processed', v_users_processed,
    'sales_processed', v_sales_processed,
    'total_commissions', v_total_commissions
  );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.recalculate_all_commissions() TO authenticated;