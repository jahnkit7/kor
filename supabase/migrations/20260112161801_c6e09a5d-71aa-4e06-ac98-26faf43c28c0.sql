-- Corriger les produits restaurant/service existants qui ont is_menu_item=false
-- Ces produits ont été créés par la voix mais mal catégorisés
UPDATE stock_items 
SET 
  is_menu_item = true,
  category = COALESCE(category, 'autres')
WHERE 
  is_menu_item = false 
  AND source = 'voice'
  AND (
    LOWER(name) LIKE '%plat%' OR
    LOWER(name) LIKE '%jus%' OR
    LOWER(name) LIKE '%sauce%' OR
    LOWER(name) LIKE '%riz%' OR
    LOWER(name) LIKE '%poulet%' OR
    LOWER(name) LIKE '%poisson%' OR
    LOWER(name) LIKE '%viande%' OR
    LOWER(name) LIKE '%café%' OR
    LOWER(name) LIKE '%thé%' OR
    LOWER(name) LIKE '%boisson%' OR
    LOWER(name) LIKE '%service%' OR
    LOWER(name) LIKE '%pressing%' OR
    LOWER(name) LIKE '%coiffure%' OR
    LOWER(name) LIKE '%réparation%' OR
    LOWER(name) LIKE '%épinard%' OR
    LOWER(name) LIKE '%légume%' OR
    LOWER(name) LIKE '%soupe%' OR
    LOWER(name) LIKE '%salade%' OR
    LOWER(name) LIKE '%gâteau%' OR
    LOWER(name) LIKE '%beignet%' OR
    LOWER(name) LIKE '%pain%' OR
    LOWER(name) LIKE '%sandwich%' OR
    LOWER(name) LIKE '%burger%' OR
    LOWER(name) LIKE '%pizza%' OR
    LOWER(name) LIKE '%pâtes%' OR
    LOWER(name) LIKE '%frites%' OR
    LOWER(name) LIKE '%omelette%' OR
    LOWER(name) LIKE '%crêpe%' OR
    LOWER(name) LIKE '%glace%' OR
    LOWER(name) LIKE '%smoothie%' OR
    LOWER(name) LIKE '%cocktail%' OR
    LOWER(name) LIKE '%soda%' OR
    LOWER(name) LIKE '%eau%' OR
    LOWER(name) LIKE '%bière%' OR
    LOWER(name) LIKE '%vin%' OR
    LOWER(name) LIKE '%limonade%' OR
    LOWER(name) LIKE '%yaourt%' OR
    LOWER(name) LIKE '%dessert%' OR
    LOWER(name) LIKE '%entrée%' OR
    LOWER(name) LIKE '%accompagnement%' OR
    LOWER(name) LIKE '%nettoyage%' OR
    LOWER(name) LIKE '%lavage%' OR
    LOWER(name) LIKE '%manucure%' OR
    LOWER(name) LIKE '%massage%' OR
    LOWER(name) LIKE '%assistance%'
  );