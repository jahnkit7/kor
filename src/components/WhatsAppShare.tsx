import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WhatsAppShareProps {
  type: "debt" | "sales";
  data: {
    clientName?: string;
    clientPhone?: string;
    amount?: number;
    totalSales?: number;
    cashSales?: number;
    creditSales?: number;
    date?: string;
    shopName?: string;
  };
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function WhatsAppShare({ type, data, variant = "outline", size = "sm", className }: WhatsAppShareProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  const generateDebtMessage = () => {
    const { clientName, amount, shopName = "CAISSE+" } = data;
    return `Bonjour ${clientName} 👋

Ceci est un rappel amical de ${shopName}.

💰 Montant dû: ${formatMoney(amount || 0)} CFA

Merci de régulariser votre situation dès que possible.

Cordialement,
${shopName}`;
  };

  const generateSalesMessage = () => {
    const { date, totalSales, cashSales, creditSales, shopName = "CAISSE+" } = data;
    const today = date || new Date().toLocaleDateString("fr-FR");
    
    return `📊 Résumé des ventes - ${today}

🏪 ${shopName}

💰 Total: ${formatMoney(totalSales || 0)} CFA
├── Cash: ${formatMoney(cashSales || 0)} CFA
└── Crédit: ${formatMoney(creditSales || 0)} CFA

Généré par CAISSE+`;
  };

  const handleShare = () => {
    const message = type === "debt" ? generateDebtMessage() : generateSalesMessage();
    const encodedMessage = encodeURIComponent(message);
    
    let phoneNumber = "";
    if (type === "debt" && data.clientPhone) {
      // Clean phone number (remove spaces, dashes)
      phoneNumber = data.clientPhone.replace(/[\s-]/g, "");
      // Add country code if not present
      if (!phoneNumber.startsWith("+")) {
        phoneNumber = "+221" + phoneNumber; // Default to Senegal
      }
    }

    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber.replace("+", "")}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Ouverture de WhatsApp...");
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      WhatsApp
    </Button>
  );
}
