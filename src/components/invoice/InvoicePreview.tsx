import { useMemo } from "react";
import { SaleInvoiceData, InvoiceStyle, generateSaleInvoiceHTML } from "@/lib/sale-invoice-generator";

interface InvoicePreviewProps {
  data: SaleInvoiceData;
  style: InvoiceStyle;
}

export function InvoicePreview({ data, style }: InvoicePreviewProps) {
  const htmlContent = useMemo(() => {
    return generateSaleInvoiceHTML(data, style);
  }, [data, style]);

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-inner">
      <iframe
        srcDoc={htmlContent}
        className="w-full h-[400px] border-0"
        title="Aperçu de la facture"
      />
    </div>
  );
}
