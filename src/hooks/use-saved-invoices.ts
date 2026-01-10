import { useState, useCallback, useEffect } from "react";
import { useAuth } from "./use-auth";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { SaleInvoiceData, InvoiceStyle, generateSaleInvoiceHTML } from "@/lib/sale-invoice-generator";

export interface SavedInvoice {
  id: string;
  user_id: string;
  sale_id: string | null;
  invoice_number: string;
  invoice_date: string;
  customer_name: string | null;
  customer_phone: string | null;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  total: number;
  payment_type: string;
  note: string | null;
  currency: string;
  style: InvoiceStyle;
  html_content: string | null;
  created_at: string;
}

export function useSavedInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvoices = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from("saved_invoices")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Map data to proper types
      const mappedInvoices: SavedInvoice[] = (data || []).map((inv) => ({
        ...inv,
        items: inv.items as SavedInvoice["items"],
        style: inv.style as InvoiceStyle,
      }));
      
      setInvoices(mappedInvoices);
    } catch (err) {
      console.error("Error fetching invoices:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const saveInvoice = useCallback(
    async (
      invoiceData: SaleInvoiceData,
      style: InvoiceStyle,
      saleId?: string
    ): Promise<SavedInvoice | null> => {
      if (!user || !isSupabaseConfigured()) return null;

      try {
        const supabase = await getSupabaseClient();
        const htmlContent = generateSaleInvoiceHTML(invoiceData, style);

        const insertData = {
          user_id: user.id,
          sale_id: saleId || null,
          invoice_number: invoiceData.invoiceNumber,
          invoice_date: invoiceData.date.toISOString(),
          customer_name: invoiceData.customerName || null,
          customer_phone: invoiceData.customerPhone || null,
          items: invoiceData.items as unknown as Record<string, unknown>[],
          subtotal: invoiceData.subtotal,
          total: invoiceData.total,
          payment_type: invoiceData.paymentType,
          note: invoiceData.note || null,
          currency: invoiceData.currency,
          style: style,
          html_content: htmlContent,
        };

        const { data, error } = await supabase
          .from("saved_invoices")
          .insert(insertData as never)
          .select()
          .single();

        if (error) throw error;

        // Map to proper type and add to local state
        const savedInvoice: SavedInvoice = {
          ...data,
          items: data.items as SavedInvoice["items"],
          style: data.style as InvoiceStyle,
        };
        
        setInvoices((prev) => [savedInvoice, ...prev]);
        return savedInvoice;
      } catch (err) {
        console.error("Error saving invoice:", err);
        return null;
      }
    },
    [user]
  );

  const deleteInvoice = useCallback(
    async (invoiceId: string): Promise<boolean> => {
      if (!user || !isSupabaseConfigured()) return false;

      try {
        const supabase = await getSupabaseClient();
        const { error } = await supabase
          .from("saved_invoices")
          .delete()
          .eq("id", invoiceId);

        if (error) throw error;

        setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
        return true;
      } catch (err) {
        console.error("Error deleting invoice:", err);
        return false;
      }
    },
    [user]
  );

  return {
    invoices,
    loading,
    saveInvoice,
    deleteInvoice,
    refetch: fetchInvoices,
  };
}
