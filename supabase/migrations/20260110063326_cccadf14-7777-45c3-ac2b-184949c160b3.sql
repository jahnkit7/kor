-- Ajouter category et sort_order à feature_flags
ALTER TABLE feature_flags 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'secondary',
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Mettre à jour les features primaires
UPDATE feature_flags SET category = 'primary', sort_order = 0 WHERE feature_key = 'sales';
UPDATE feature_flags SET category = 'primary', sort_order = 1 WHERE feature_key = 'stock';
UPDATE feature_flags SET category = 'primary', sort_order = 2 WHERE feature_key = 'clients';
UPDATE feature_flags SET category = 'primary', sort_order = 3 WHERE feature_key = 'debts';
UPDATE feature_flags SET category = 'primary', sort_order = 4 WHERE feature_key = 'offline_mode';

-- Mettre à jour les features secondaires
UPDATE feature_flags SET category = 'secondary', sort_order = 0 WHERE feature_key = 'reports';
UPDATE feature_flags SET category = 'secondary', sort_order = 1 WHERE feature_key = 'voice_input';
UPDATE feature_flags SET category = 'secondary', sort_order = 2 WHERE feature_key = 'alerts';
UPDATE feature_flags SET category = 'secondary', sort_order = 3 WHERE feature_key = 'ai_analysis';
UPDATE feature_flags SET category = 'secondary', sort_order = 4 WHERE feature_key = 'network';
UPDATE feature_flags SET category = 'secondary', sort_order = 5 WHERE feature_key = 'employees';
UPDATE feature_flags SET category = 'secondary', sort_order = 6 WHERE feature_key = 'invoices';
UPDATE feature_flags SET category = 'secondary', sort_order = 7 WHERE feature_key = 'multi_currency';
UPDATE feature_flags SET category = 'secondary', sort_order = 8 WHERE feature_key = 'referrals';
UPDATE feature_flags SET category = 'secondary', sort_order = 9 WHERE feature_key = 'commission_payment';