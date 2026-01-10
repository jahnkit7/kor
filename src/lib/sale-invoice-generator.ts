// Sale Invoice Generator with two styles: classic and modern

export interface SaleInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface SaleInvoiceData {
  invoiceNumber: string;
  date: Date;
  shopName: string;
  shopPhone?: string;
  shopOwner?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleInvoiceItem[];
  subtotal: number;
  total: number;
  paymentType: "cash" | "credit";
  note?: string;
  currency: string;
}

export type InvoiceStyle = "classic" | "modern";

// Generate unique invoice number
export function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `INV-${year}${month}-${random}`;
}

// Format money with thousands separator
function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
}

// Format date in French
function formatDate(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Generate Classic Style HTML
function generateClassicHTML(data: SaleInvoiceData): string {
  const itemsHTML = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border: 1px solid #333;">${item.name}</td>
        <td style="padding: 8px; border: 1px solid #333; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border: 1px solid #333; text-align: right;">${formatMoney(item.unitPrice, data.currency)}</td>
        <td style="padding: 8px; border: 1px solid #333; text-align: right;">${formatMoney(item.total, data.currency)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; padding: 40px; background: white; color: #333; line-height: 1.6; }
    .header { border-bottom: 3px double #333; padding-bottom: 20px; margin-bottom: 20px; }
    .shop-name { font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
    .shop-info { font-size: 14px; color: #555; margin-top: 5px; }
    .invoice-title { font-size: 24px; text-align: center; margin: 30px 0; text-transform: uppercase; letter-spacing: 3px; border-top: 1px solid #333; border-bottom: 1px solid #333; padding: 10px; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-block { font-size: 14px; }
    .info-block strong { display: block; margin-bottom: 5px; text-transform: uppercase; font-size: 12px; letter-spacing: 1px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #333; color: white; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .total-section { text-align: right; margin-top: 30px; border-top: 2px solid #333; padding-top: 20px; }
    .total-row { font-size: 18px; margin: 5px 0; }
    .grand-total { font-size: 24px; font-weight: bold; margin-top: 10px; }
    .payment-badge { display: inline-block; padding: 5px 15px; border: 2px solid #333; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 10px; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ccc; padding-top: 20px; }
    .note { margin-top: 20px; padding: 15px; background: #f5f5f5; border-left: 4px solid #333; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div class="shop-name">${data.shopName}</div>
    ${data.shopOwner ? `<div class="shop-info">Propriétaire: ${data.shopOwner}</div>` : ""}
    ${data.shopPhone ? `<div class="shop-info">Tél: ${data.shopPhone}</div>` : ""}
  </div>

  <div class="invoice-title">Facture</div>

  <div class="info-section">
    <div class="info-block">
      <strong>Facture N°</strong>
      ${data.invoiceNumber}
      <br><br>
      <strong>Date</strong>
      ${formatDate(data.date)}
    </div>
    <div class="info-block" style="text-align: right;">
      <strong>Client</strong>
      ${data.customerName || "Client anonyme"}
      ${data.customerPhone ? `<br>Tél: ${data.customerPhone}` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation</th>
        <th style="text-align: center; width: 80px;">Qté</th>
        <th style="text-align: right; width: 120px;">Prix Unit.</th>
        <th style="text-align: right; width: 120px;">Montant</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHTML}
    </tbody>
  </table>

  <div class="total-section">
    <div class="total-row">Sous-total: ${formatMoney(data.subtotal, data.currency)}</div>
    <div class="grand-total">TOTAL: ${formatMoney(data.total, data.currency)}</div>
    <div class="payment-badge">${data.paymentType === "cash" ? "PAYÉ EN ESPÈCES" : "À CRÉDIT"}</div>
  </div>

  ${data.note ? `<div class="note">📝 ${data.note}</div>` : ""}

  <div class="footer">
    <p>Merci pour votre confiance!</p>
    <p style="margin-top: 5px;">Cette facture a été générée automatiquement.</p>
  </div>
</body>
</html>
  `;
}

// Generate Modern Style HTML
function generateModernHTML(data: SaleInvoiceData): string {
  const itemsHTML = data.items
    .map(
      (item) => `
      <div style="display: flex; padding: 16px 0; border-bottom: 1px solid #e5e7eb;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #1f2937;">${item.name}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">x${item.quantity} @ ${formatMoney(item.unitPrice, data.currency)}</div>
        </div>
        <div style="font-weight: 600; color: #1f2937;">${formatMoney(item.total, data.currency)}</div>
      </div>
    `
    )
    .join("");

  const paymentColor = data.paymentType === "cash" ? "#22c55e" : "#f59e0b";
  const paymentBg = data.paymentType === "cash" ? "#dcfce7" : "#fef3c7";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px; }
    .invoice-card { max-width: 600px; margin: 0 auto; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; color: white; position: relative; overflow: hidden; }
    .header::before { content: ''; position: absolute; top: -50%; right: -20%; width: 100%; height: 200%; background: rgba(255,255,255,0.1); border-radius: 50%; }
    .shop-name { font-size: 24px; font-weight: 700; position: relative; z-index: 1; }
    .shop-info { font-size: 14px; opacity: 0.9; margin-top: 8px; position: relative; z-index: 1; }
    .invoice-badge { position: absolute; top: 30px; right: 30px; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 1px; }
    .content { padding: 30px; }
    .meta-section { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
    .meta-card { background: #f9fafb; padding: 16px; border-radius: 12px; }
    .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .meta-value { font-size: 16px; font-weight: 600; color: #1f2937; }
    .items-section { margin: 30px 0; }
    .section-title { font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
    .section-title::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }
    .total-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px; padding: 24px; color: white; margin-top: 30px; }
    .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; opacity: 0.9; }
    .grand-total { display: flex; justify-content: space-between; font-size: 24px; font-weight: 700; margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.3); }
    .payment-badge { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .note { margin-top: 20px; padding: 16px; background: #fef3c7; border-radius: 12px; font-size: 14px; color: #92400e; display: flex; align-items: flex-start; gap: 10px; }
    .footer { text-align: center; padding: 24px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div class="invoice-badge">FACTURE</div>
      <div class="shop-name">${data.shopName}</div>
      ${data.shopOwner ? `<div class="shop-info">👤 ${data.shopOwner}</div>` : ""}
      ${data.shopPhone ? `<div class="shop-info">📞 ${data.shopPhone}</div>` : ""}
    </div>

    <div class="content">
      <div class="meta-section">
        <div class="meta-card">
          <div class="meta-label">Numéro</div>
          <div class="meta-value">${data.invoiceNumber}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Date</div>
          <div class="meta-value">${formatDate(data.date)}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Client</div>
          <div class="meta-value">${data.customerName || "Anonyme"}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Téléphone</div>
          <div class="meta-value">${data.customerPhone || "-"}</div>
        </div>
      </div>

      <div class="items-section">
        <div class="section-title">Articles</div>
        ${itemsHTML}
      </div>

      <div class="total-card">
        <div class="total-row">
          <span>Sous-total</span>
          <span>${formatMoney(data.subtotal, data.currency)}</span>
        </div>
        <div class="grand-total">
          <span>Total</span>
          <span>${formatMoney(data.total, data.currency)}</span>
        </div>
      </div>

      <div style="margin-top: 20px; display: flex; justify-content: center;">
        <span class="payment-badge" style="background: ${paymentBg}; color: ${paymentColor};">
          ${data.paymentType === "cash" ? "✓ Payé en espèces" : "⏳ À crédit"}
        </span>
      </div>

      ${data.note ? `<div class="note">📝 ${data.note}</div>` : ""}
    </div>

    <div class="footer">
      <p>Merci pour votre confiance! 🙏</p>
    </div>
  </div>
</body>
</html>
  `;
}

// Main function to generate invoice HTML
export function generateSaleInvoiceHTML(data: SaleInvoiceData, style: InvoiceStyle): string {
  return style === "classic" ? generateClassicHTML(data) : generateModernHTML(data);
}

// Download/Print invoice
export function downloadInvoice(data: SaleInvoiceData, style: InvoiceStyle): void {
  const html = generateSaleInvoiceHTML(data, style);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

// Generate WhatsApp message for invoice
export function generateWhatsAppMessage(data: SaleInvoiceData): string {
  const itemsText = data.items
    .map((item) => `• ${item.name} x${item.quantity} = ${formatMoney(item.total, data.currency)}`)
    .join("\n");

  return `📋 *Facture ${data.invoiceNumber}*
━━━━━━━━━━━━━━━━━━━━

🏪 *${data.shopName}*
📅 ${formatDate(data.date)}

📦 *Articles:*
${itemsText}

━━━━━━━━━━━━━━━━━━━━
💰 *Total: ${formatMoney(data.total, data.currency)}*
💳 Type: ${data.paymentType === "cash" ? "Espèces ✅" : "Crédit ⏳"}
${data.note ? `\n📝 Note: ${data.note}` : ""}

Merci pour votre confiance! 🙏`;
}
