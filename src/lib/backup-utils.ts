import * as localDB from "@/lib/db";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export interface BackupData {
  version: string;
  exportedAt: string;
  exportedAtFormatted: string;
  appVersion: string;
  data: {
    sales: unknown[];
    clients: unknown[];
    debts: unknown[];
    payments: unknown[];
    stockItems: unknown[];
  };
  stats: {
    salesCount: number;
    clientsCount: number;
    debtsCount: number;
    paymentsCount: number;
    stockItemsCount: number;
    totalSalesAmount: number;
    totalDebtsAmount: number;
  };
}

/**
 * Exporte toutes les données de l'utilisateur en JSON
 */
export async function exportUserData(): Promise<BackupData> {
  const [sales, clients, debts, payments, stockItems] = await Promise.all([
    localDB.getSales(),
    localDB.getClients(),
    localDB.getDebts(),
    localDB.getPayments(),
    localDB.getStockItems(),
  ]);

  const now = new Date();

  // Calculate stats
  const totalSalesAmount = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalDebtsAmount = debts.reduce((sum, d) => sum + ((d.amount || 0) - (d.paid || 0)), 0);

  return {
    version: "1.0",
    exportedAt: now.toISOString(),
    exportedAtFormatted: format(now, "d MMMM yyyy 'à' HH:mm", { locale: fr }),
    appVersion: "DÉKON 1.0",
    data: {
      sales,
      clients,
      debts,
      payments,
      stockItems,
    },
    stats: {
      salesCount: sales.length,
      clientsCount: clients.length,
      debtsCount: debts.length,
      paymentsCount: payments.length,
      stockItemsCount: stockItems.length,
      totalSalesAmount,
      totalDebtsAmount,
    },
  };
}

/**
 * Télécharge les données en fichier JSON
 */
export async function downloadBackup(): Promise<void> {
  const data = await exportUserData();
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const dateStr = format(new Date(), "yyyy-MM-dd_HH-mm");
  const filename = `dekon-backup-${dateStr}.json`;
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
