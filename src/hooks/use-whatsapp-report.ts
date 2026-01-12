import { useProfile } from "./use-profile";
import { useRole } from "./use-role";
import { useSales } from "./use-sales";
import { useCashDrawer } from "./use-cash-drawer";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export function useWhatsAppReport() {
  const { profile } = useProfile();
  const { role } = useRole();
  const { getTodayStats } = useSales();
  const { todayEntry, isDrawerOpen } = useCashDrawer();

  const getOwnerPhone = async (): Promise<string | null> => {
    // If user is owner, use their own phone
    if (role === "owner" && profile?.phone) {
      return profile.phone;
    }

    // If user is employee, fetch owner's phone
    if (role === "employee" && profile?.linked_owner_id && isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", profile.linked_owner_id)
          .single();

        if (!error && data?.phone) {
          return data.phone;
        }
      } catch (error) {
        console.error("Error fetching owner phone:", error);
      }
    }

    return null;
  };

  const generateReportText = (): string => {
    const todayStats = getTodayStats();
    const shopName = profile?.shop_name || "Ma Boutique";
    const date = new Date().toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let report = `📊 *Rapport du jour - ${shopName}*\n`;
    report += `📅 ${date}\n\n`;
    
    report += `💰 *Ventes*\n`;
    report += `• Total: ${todayStats.total.toLocaleString("fr-FR")} CFA\n`;
    report += `• Cash: ${todayStats.cash.toLocaleString("fr-FR")} CFA\n`;
    report += `• Crédit: ${todayStats.credit.toLocaleString("fr-FR")} CFA\n\n`;

    if (todayEntry) {
      report += `🏪 *Caisse*\n`;
      report += `• Ouverture: ${todayEntry.opening_amount.toLocaleString("fr-FR")} CFA\n`;
      
      if (todayEntry.closing_amount !== null) {
        report += `• Clôture: ${todayEntry.closing_amount.toLocaleString("fr-FR")} CFA\n`;
        const expected = todayEntry.opening_amount + todayStats.cash;
        const diff = todayEntry.closing_amount - expected;
        if (diff !== 0) {
          report += `• Écart: ${diff > 0 ? "+" : ""}${diff.toLocaleString("fr-FR")} CFA\n`;
        }
      } else {
        report += `• État: En cours\n`;
      }
    }

    report += `\n_Envoyé via KÒR_`;
    
    return report;
  };

  const shareReport = async () => {
    const phone = await getOwnerPhone();
    const report = generateReportText();
    const encodedReport = encodeURIComponent(report);
    
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = phone?.replace(/[\s\-\(\)]/g, "") || "";
    
    // Open WhatsApp with pre-filled message
    const whatsappUrl = cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodedReport}`
      : `https://wa.me/?text=${encodedReport}`;
    
    window.open(whatsappUrl, "_blank");
  };

  return {
    shareReport,
    getOwnerPhone,
    generateReportText,
  };
}
