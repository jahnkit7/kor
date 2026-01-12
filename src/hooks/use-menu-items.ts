import { useMemo } from "react";
import { useStock, StockItem } from "./use-stock";

// Menu categories with labels and icons
export const MENU_CATEGORIES = [
  { value: "boissons", label: "Boissons", icon: "🍹" },
  { value: "plats", label: "Plats", icon: "🍽️" },
  { value: "desserts", label: "Desserts", icon: "🍨" },
  { value: "snacks", label: "Snacks", icon: "🍿" },
  { value: "autres", label: "Autres", icon: "📦" },
] as const;

export type MenuCategory = typeof MENU_CATEGORIES[number]["value"];

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: MenuCategory | null;
  model?: string | null;
}

export function useMenuItems() {
  const { items, loading, addItem, updateItem, deleteItem, refetch } = useStock();

  // Filter only menu items (is_menu_item = true OR quantity = -1 for backward compatibility)
  const menuItems = useMemo<MenuItem[]>(() => {
    return items
      .filter((item) => item.is_menu_item === true)
      .map((item) => ({
        id: item.id,
        name: item.name,
        price: item.unit_price,
        category: (item.category as MenuCategory) || null,
        model: item.model,
      }));
  }, [items]);

  // Group by category
  const menuItemsByCategory = useMemo(() => {
    const grouped = new Map<string, MenuItem[]>();
    
    MENU_CATEGORIES.forEach((cat) => {
      grouped.set(cat.value, []);
    });
    grouped.set("uncategorized", []);

    menuItems.forEach((item) => {
      const category = item.category || "uncategorized";
      const categoryItems = grouped.get(category) || [];
      categoryItems.push(item);
      grouped.set(category, categoryItems);
    });

    return grouped;
  }, [menuItems]);

  // Add a new menu item
  const addMenuItem = async (item: {
    name: string;
    price: number;
    category?: MenuCategory;
    model?: string;
  }) => {
    return addItem({
      name: item.name,
      unit_price: item.price,
      quantity: 0, // Menu items don't track quantity
      category: item.category,
      is_menu_item: true,
      model: item.model,
      source: "manual",
    });
  };

  // Update a menu item
  const updateMenuItem = async (
    id: string,
    updates: Partial<{
      name: string;
      price: number;
      category: MenuCategory | null;
      model: string | null;
    }>
  ) => {
    const stockUpdates: Partial<StockItem> = {};
    if (updates.name !== undefined) stockUpdates.name = updates.name;
    if (updates.price !== undefined) stockUpdates.unit_price = updates.price;
    if (updates.category !== undefined) stockUpdates.category = updates.category;
    if (updates.model !== undefined) stockUpdates.model = updates.model;
    
    return updateItem(id, stockUpdates);
  };

  // Delete a menu item
  const deleteMenuItem = async (id: string) => {
    return deleteItem(id);
  };

  return {
    menuItems,
    menuItemsByCategory,
    loading,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    refetch,
  };
}
