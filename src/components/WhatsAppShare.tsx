import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WhatsAppShareProps {
  type: "debt" | "sales" | "reminder";
  data: {
    clientName?: string;
    clientPhone?: string;
    amount?: number;
    totalSales?: number;
    cashSales?: number;
    creditSales?: number;
    date?: string;
    shopName?: string;
    daysOverdue?: number;
  };
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  iconOnly?: boolean;
}

export function WhatsAppShare({ 
  type, 
  data, 
  variant = "outline", 
  size = "sm", 
  className,
  iconOnly = false
}: WhatsAppShareProps) {
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  const generateDebtMessage = () => {
    const { clientName, amount, shopName = "CAISSE+", daysOverdue } = data;
    
    let urgencyText = "";
    if (daysOverdue && daysOverdue >= 30) {
      urgencyText = "\n\n⚠️ Ce crédit date de plus d'un mois.";
    } else if (daysOverdue && daysOverdue >= 7) {
      urgencyText = "\n\n📅 Ce crédit date de plus d'une semaine.";
    }
    
    return `Bonjour ${clientName} 👋

Ceci est un rappel amical de ${shopName}.

💰 Montant dû: ${formatMoney(amount || 0)} CFA${urgencyText}

Merci de régulariser votre situation dès que possible.

Cordialement,
${shopName}`;
  };

  const generateReminderMessage = () => {
    const { clientName, amount, shopName = "CAISSE+" } = data;
    return `Bonjour ${clientName} 👋

Juste un petit rappel de ${shopName} concernant votre solde de ${formatMoney(amount || 0)} CFA.

Passez nous voir quand vous pouvez ! 🙏

Merci,
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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    let message: string;
    if (type === "reminder") {
      message = generateReminderMessage();
    } else if (type === "debt") {
      message = generateDebtMessage();
    } else {
      message = generateSalesMessage();
    }
    
    const encodedMessage = encodeURIComponent(message);
    
    let phoneNumber = "";
    if ((type === "debt" || type === "reminder") && data.clientPhone) {
      // Clean phone number (remove spaces, dashes)
      phoneNumber = data.clientPhone.replace(/[\s-]/g, "");
      // Add country code if not present
      if (!phoneNumber.startsWith("+")) {
        phoneNumber = "+228" + phoneNumber; // Default to Togo
      }
    }

    const whatsappUrl = phoneNumber
      ? `https://wa.me/${phoneNumber.replace("+", "")}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;

    window.open(whatsappUrl, "_blank");
    toast.success("Ouverture de WhatsApp...");
  };

  if (iconOnly) {
    return (
      <Button
        variant={variant}
        size="icon"
        onClick={handleShare}
        className={className}
      >
        <MessageCircle className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className={className}
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Rappeler
    </Button>
  );
}
