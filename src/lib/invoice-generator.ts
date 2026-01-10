import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface InvoiceData {
  invoiceNumber: string;
  date: Date;
  customerName: string;
  customerPhone?: string;
  planName: string;
  amountOriginal: number;
  discountApplied: number;
  promoCodeUsed?: string;
  amountPaid: number;
  paymentMethod: string;
  transactionRef?: string;
  currency?: string;
}

export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const currency = data.currency || "CFA";
  const formattedDate = format(data.date, "dd MMMM yyyy", { locale: fr });
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #f5f5f5; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #f0f0f0; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #2563eb; }
    .invoice-info { text-align: right; }
    .invoice-number { font-size: 18px; font-weight: bold; color: #333; }
    .invoice-date { color: #666; margin-top: 4px; }
    .customer { margin-bottom: 30px; }
    .customer h3 { color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 8px; }
    .customer p { color: #333; font-size: 16px; }
    .items { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items th { background: #f8fafc; padding: 12px; text-align: left; font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    .items td { padding: 16px 12px; border-bottom: 1px solid #f0f0f0; }
    .items .amount { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
    .totals-row.discount { color: #22c55e; }
    .totals-row.total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 12px; margin-top: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px; }
    .payment-info { background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 20px; }
    .payment-info h4 { margin-bottom: 8px; color: #333; }
    .payment-info p { color: #666; font-size: 14px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; background: #dcfce7; color: #166534; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div>
        <div class="logo">DÉKON</div>
        <p style="color: #666; margin-top: 4px;">Gestion de caisse simplifiée</p>
      </div>
      <div class="invoice-info">
        <div class="invoice-number">${data.invoiceNumber}</div>
        <div class="invoice-date">${formattedDate}</div>
        <div class="status" style="margin-top: 8px;">Payée</div>
      </div>
    </div>

    <div class="customer">
      <h3>Facturé à</h3>
      <p>${data.customerName}</p>
      ${data.customerPhone ? `<p style="color: #666; font-size: 14px;">${data.customerPhone}</p>` : ""}
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>Abonnement ${data.planName}</strong>
            <br><span style="color: #666; font-size: 14px;">Période: 30 jours</span>
          </td>
          <td class="amount">${data.amountOriginal.toLocaleString()} ${currency}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Sous-total</span>
        <span>${data.amountOriginal.toLocaleString()} ${currency}</span>
      </div>
      ${data.discountApplied > 0 ? `
      <div class="totals-row discount">
        <span>Réduction${data.promoCodeUsed ? ` (${data.promoCodeUsed})` : ""}</span>
        <span>-${data.discountApplied.toLocaleString()} ${currency}</span>
      </div>
      ` : ""}
      <div class="totals-row total">
        <span>Total payé</span>
        <span>${data.amountPaid.toLocaleString()} ${currency}</span>
      </div>
    </div>

    <div class="payment-info">
      <h4>Informations de paiement</h4>
      <p>Méthode: ${data.paymentMethod}</p>
      ${data.transactionRef ? `<p>Référence: ${data.transactionRef}</p>` : ""}
    </div>

    <div class="footer">
      <p>Merci pour votre confiance!</p>
      <p style="margin-top: 8px;">DÉKON - Application de gestion de caisse</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function downloadInvoice(data: InvoiceData): void {
  const html = generateInvoiceHTML(data);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.onload = () => {
      printWindow.print();
    };
  }
  
  // Cleanup
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
