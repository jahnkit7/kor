import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export interface FrequentProduct {
  product_name: string;
  total_sold: number;
}

export function useFrequentProducts(limit: number = 3) {
  const { user } = useAuth();
  const [frequentProducts, setFrequentProducts] = useState<FrequentProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFrequentProducts = async () => {
      if (!user?.id) {
        setFrequentProducts([]);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("sale_items")
          .select("product_name, quantity")
          .eq("user_id", user.id);

        if (error) {
          console.error("[useFrequentProducts] Error fetching:", error);
          setFrequentProducts([]);
          return;
        }

        if (!data || data.length === 0) {
          setFrequentProducts([]);
          return;
        }

        const productMap = new Map<string, number>();
        data.forEach((item) => {
          const current = productMap.get(item.product_name) || 0;
          productMap.set(item.product_name, current + item.quantity);
        });

        const sorted = Array.from(productMap.entries())
          .map(([product_name, total_sold]) => ({ product_name, total_sold }))
          .sort((a, b) => b.total_sold - a.total_sold)
          .slice(0, limit);

        setFrequentProducts(sorted);
      } catch (error) {
        console.error("[useFrequentProducts] Unexpected error:", error);
        setFrequentProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFrequentProducts();
  }, [user?.id, limit]);

  const frequentProductNames = frequentProducts.map((p) => p.product_name);

  // Map for quick lookup of total sold by product name
  const frequentProductsMap = new Map(
    frequentProducts.map((p) => [p.product_name, p.total_sold])
  );

  return {
    frequentProducts,
    frequentProductNames,
    frequentProductsMap,
    isLoading,
  };
}
