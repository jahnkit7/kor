import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, MessageCircle, Printer, Phone } from "lucide-react";
import { InvoicePreview } from "./InvoicePreview";
import { useSaleInvoice } from "@/hooks/use-sale-invoice";
import { Sale, SaleItem } from "@/hooks/use-sales";
import { InvoiceStyle, SaleInvoiceData } from "@/lib/sale-invoice-generator";
import { toast } from "sonner";
import * as localDB from "@/lib/db";
import { isSupabaseConfigured, getSupabaseClient } from "@/lib/supabase";
import { useNetworkStatus } from "@/hooks/use-network-status";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export function InvoiceDialog({ open, onOpenChange, sale }: InvoiceDialogProps) {
  const [style, setStyle] = useState<InvoiceStyle>("modern");
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<SaleInvoiceData | null>(null);
  const { generateInvoiceData, handleDownload, handleWhatsAppShare } = useSaleInvoice();
  const { isOnline } = useNetworkStatus();

  // Fetch sale items when dialog opens
  useEffect(() => {
    async function fetchSaleItems() {
      if (!sale || !open) return;

      setLoading(true);
      try {
        let items: SaleItem[] = [];

        // Try cloud first if online
        if (isOnline && isSupabaseConfigured()) {
          try {
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase
              .from("sale_items")
              .select("*")
              .eq("sale_id", sale.id);

            if (!error && data && data.length > 0) {
              items = data.map((item) => ({
                stock_item_id: item.stock_item_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
              }));
            }
          } catch (err) {
            console.warn("Could not fetch sale items from cloud:", err);
          }
        }

        // Fallback to local DB
        if (items.length === 0) {
          const localItems = await localDB.getSaleItemsBySale(sale.id);
          items = localItems.map((item) => ({
            stock_item_id: item.stock_item_id,
            product_name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
          }));
        }

        setSaleItems(items);
      } catch (err) {
        console.error("Error fetching sale items:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchSaleItems();
  }, [sale, open, isOnline]);

  // Generate invoice data when sale or items change
  useEffect(() => {
    if (sale) {
      const data = generateInvoiceData(sale, saleItems);
      setInvoiceData(data);
    }
  }, [sale, saleItems, generateInvoiceData]);

  if (!sale || !invoiceData) return null;

  const onDownload = () => {
    handleDownload(invoiceData, style);
    toast.success("Facture générée", {
      description: "La fenêtre d'impression s'est ouverte",
    });
  };

  const onWhatsApp = () => {
    handleWhatsAppShare(invoiceData);
    toast.success("Ouverture de WhatsApp", {
      description: invoiceData.customerPhone
        ? `Envoi à ${invoiceData.customerPhone}`
        : "Sélectionnez un contact",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Générer une facture
            <Badge
              variant="outline"
              className={
                sale.type === "cash"
                  ? "border-cash text-cash"
                  : "border-credit text-credit"
              }
            >
              {sale.type === "cash" ? "Cash" : "Crédit"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Style selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Style de facture
            </label>
            <Tabs value={style} onValueChange={(v) => setStyle(v as InvoiceStyle)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="classic">📄 Classique</TabsTrigger>
                <TabsTrigger value="modern">✨ Moderne</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Preview */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Aperçu
            </label>
            {loading ? (
              <div className="h-[400px] border rounded-lg flex items-center justify-center bg-muted/50">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <InvoicePreview data={invoiceData} style={style} />
            )}
          </div>

          {/* Customer phone info */}
          {invoiceData.customerPhone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <Phone className="w-4 h-4" />
              <span>
                Téléphone client:{" "}
                <strong className="text-foreground">{invoiceData.customerPhone}</strong>
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button onClick={onDownload} className="gap-2">
              <Download className="w-4 h-4" />
              Télécharger / Imprimer
            </Button>
            <Button
              variant="outline"
              onClick={onWhatsApp}
              className="gap-2 border-green-500 text-green-600 hover:bg-green-50"
            >
              <MessageCircle className="w-4 h-4" />
              Envoyer WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
