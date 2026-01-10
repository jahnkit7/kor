import { useCallback } from "react";
import { useProfile } from "./use-profile";
import { useClients } from "./use-clients";
import { Sale, SaleItem } from "./use-sales";
import {
  SaleInvoiceData,
  InvoiceStyle,
  generateInvoiceNumber,
  downloadInvoice,
  generateWhatsAppMessage,
} from "@/lib/sale-invoice-generator";

export function useSaleInvoice() {
  const { profile } = useProfile();
  const { clients } = useClients();

  const generateInvoiceData = useCallback(
    (sale: Sale, saleItems?: SaleItem[]): SaleInvoiceData => {
      // Find the client by ID
      const client = sale.client_id ? clients.find((c) => c.id === sale.client_id) : null;

      // Build items array
      const items =
        saleItems && saleItems.length > 0
          ? saleItems.map((item) => ({
              name: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              total: item.quantity * item.unit_price,
            }))
          : [
              {
                name: sale.note || "Vente",
                quantity: 1,
                unitPrice: sale.amount,
                total: sale.amount,
              },
            ];

      return {
        invoiceNumber: generateInvoiceNumber(),
        date: new Date(sale.created_at),
        shopName: profile?.shop_name || "Ma Boutique",
        shopPhone: profile?.phone || undefined,
        shopOwner: profile?.owner_name || undefined,
        customerName: client?.name || sale.client_name || undefined,
        customerPhone: client?.phone || undefined,
        items,
        subtotal: sale.amount,
        total: sale.amount,
        paymentType: sale.type,
        note: sale.note || undefined,
        currency: profile?.currency || "CFA",
      };
    },
    [profile, clients]
  );

  const handleDownload = useCallback((data: SaleInvoiceData, style: InvoiceStyle) => {
    downloadInvoice(data, style);
  }, []);

  const handleWhatsAppShare = useCallback((data: SaleInvoiceData) => {
    const message = generateWhatsAppMessage(data);
    const phone = data.customerPhone?.replace(/[\s\-\+]/g, "") || "";
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }, []);

  return {
    generateInvoiceData,
    handleDownload,
    handleWhatsAppShare,
  };
}
