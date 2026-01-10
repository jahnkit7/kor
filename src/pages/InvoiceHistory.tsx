import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  FileText,
  Search,
  Download,
  Trash2,
  MessageCircle,
  Eye,
  Calendar,
  User,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSavedInvoices, SavedInvoice } from "@/hooks/use-saved-invoices";
import { downloadInvoice, generateWhatsAppMessage } from "@/lib/sale-invoice-generator";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function InvoiceHistory() {
  const navigate = useNavigate();
  const { invoices, loading, deleteInvoice } = useSavedInvoices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<SavedInvoice | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const filteredInvoices = invoices.filter((inv) => {
    const query = searchQuery.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(query) ||
      inv.customer_name?.toLowerCase().includes(query) ||
      inv.customer_phone?.includes(query)
    );
  });

  const handleView = (invoice: SavedInvoice) => {
    setSelectedInvoice(invoice);
    setShowPreview(true);
  };

  const handleDownload = (invoice: SavedInvoice) => {
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      date: new Date(invoice.invoice_date),
      shopName: "Ma Boutique", // Will be filled from HTML content
      items: invoice.items,
      subtotal: invoice.subtotal,
      total: invoice.total,
      paymentType: invoice.payment_type as "cash" | "credit",
      note: invoice.note || undefined,
      currency: invoice.currency,
      customerName: invoice.customer_name || undefined,
      customerPhone: invoice.customer_phone || undefined,
    };

    // Use stored HTML if available
    if (invoice.html_content) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(invoice.html_content);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
    } else {
      downloadInvoice(invoiceData, invoice.style);
    }

    toast.success("Facture ouverte pour impression");
  };

  const handleWhatsApp = (invoice: SavedInvoice) => {
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      date: new Date(invoice.invoice_date),
      shopName: "Ma Boutique",
      items: invoice.items,
      subtotal: invoice.subtotal,
      total: invoice.total,
      paymentType: invoice.payment_type as "cash" | "credit",
      note: invoice.note || undefined,
      currency: invoice.currency,
      customerName: invoice.customer_name || undefined,
      customerPhone: invoice.customer_phone || undefined,
    };

    const message = generateWhatsAppMessage(invoiceData);
    const phone = invoice.customer_phone?.replace(/[\s\-\+]/g, "") || "";
    const url = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleDelete = async (invoiceId: string) => {
    const success = await deleteInvoice(invoiceId);
    if (success) {
      toast.success("Facture supprimée");
    } else {
      toast.error("Erreur lors de la suppression");
    }
  };

  const formatMoney = (amount: number, currency: string) => {
    return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
  };

  return (
    <AppLayout>
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Historique des factures</h1>
              <p className="text-sm text-muted-foreground">
                {invoices.length} facture{invoices.length > 1 ? "s" : ""} générée{invoices.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <NotificationBell />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro, client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Invoice List */}
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Aucune facture</p>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Aucun résultat pour cette recherche"
                  : "Générez des factures depuis l'historique des ventes"}
              </p>
              <Button
                className="mt-4"
                onClick={() => navigate("/sales-history")}
              >
                Voir les ventes
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredInvoices.map((invoice) => (
            <Card
              key={invoice.id}
              className="animate-fade-in cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleView(invoice)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-mono text-sm font-medium">
                      {invoice.invoice_number}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      invoice.style === "modern"
                        ? "border-primary text-primary"
                        : "border-muted-foreground"
                    }
                  >
                    {invoice.style === "modern" ? "Moderne" : "Classique"}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(invoice.invoice_date), "d MMMM yyyy à HH:mm", {
                      locale: fr,
                    })}
                  </div>
                  {invoice.customer_name && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      {invoice.customer_name}
                      {invoice.customer_phone && ` • ${invoice.customer_phone}`}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={invoice.payment_type === "cash" ? "default" : "secondary"}
                      className={
                        invoice.payment_type === "cash"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }
                    >
                      {invoice.payment_type === "cash" ? "Cash" : "Crédit"}
                    </Badge>
                    <span className="font-bold">
                      {formatMoney(invoice.total, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(invoice);
                      }}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-green-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWhatsApp(invoice);
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est irréversible. La facture sera définitivement supprimée.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => handleDelete(invoice.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Aperçu - {selectedInvoice?.invoice_number}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice?.html_content && (
            <div className="flex-1 overflow-auto border rounded-lg bg-white">
              <iframe
                srcDoc={selectedInvoice.html_content}
                className="w-full h-[500px]"
                title="Aperçu facture"
              />
            </div>
          )}
          <div className="flex gap-2 justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => selectedInvoice && handleWhatsApp(selectedInvoice)}
              className="gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              onClick={() => selectedInvoice && handleDownload(selectedInvoice)}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
