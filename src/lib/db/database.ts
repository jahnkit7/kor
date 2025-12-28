import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Client, Sale, Debt, Payment, SyncQueueItem, AppSettings } from "./types";

interface CaissePlusDB extends DBSchema {
  clients: {
    key: string;
    value: Client;
    indexes: { "by-name": string; "by-synced": number };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: { "by-date": string; "by-synced": number; "by-type": string };
  };
  debts: {
    key: string;
    value: Debt;
    indexes: { "by-client": string; "by-synced": number };
  };
  payments: {
    key: string;
    value: Payment;
    indexes: { "by-debt": string; "by-client": string; "by-synced": number };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { "by-date": string };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = "caisse-plus-db";
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<CaissePlusDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<CaissePlusDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CaissePlusDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Clients store
      if (!db.objectStoreNames.contains("clients")) {
        const clientStore = db.createObjectStore("clients", { keyPath: "id" });
        clientStore.createIndex("by-name", "name");
        clientStore.createIndex("by-synced", "synced");
      }

      // Sales store
      if (!db.objectStoreNames.contains("sales")) {
        const salesStore = db.createObjectStore("sales", { keyPath: "id" });
        salesStore.createIndex("by-date", "createdAt");
        salesStore.createIndex("by-synced", "synced");
        salesStore.createIndex("by-type", "type");
      }

      // Debts store
      if (!db.objectStoreNames.contains("debts")) {
        const debtsStore = db.createObjectStore("debts", { keyPath: "id" });
        debtsStore.createIndex("by-client", "clientId");
        debtsStore.createIndex("by-synced", "synced");
      }

      // Payments store
      if (!db.objectStoreNames.contains("payments")) {
        const paymentsStore = db.createObjectStore("payments", { keyPath: "id" });
        paymentsStore.createIndex("by-debt", "debtId");
        paymentsStore.createIndex("by-client", "clientId");
        paymentsStore.createIndex("by-synced", "synced");
      }

      // Sync queue store
      if (!db.objectStoreNames.contains("syncQueue")) {
        const syncStore = db.createObjectStore("syncQueue", { keyPath: "id" });
        syncStore.createIndex("by-date", "createdAt");
      }

      // Settings store
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "shopName" });
      }
    },
  });

  return dbInstance;
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Client operations
export async function addClient(client: Omit<Client, "id" | "createdAt" | "updatedAt" | "synced">): Promise<Client> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newClient: Client = {
    ...client,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    synced: false,
  };
  await db.put("clients", newClient);
  await addToSyncQueue("create", "clients", newClient);
  return newClient;
}

export async function getClients(): Promise<Client[]> {
  const db = await getDB();
  return db.getAll("clients");
}

export async function getClient(id: string): Promise<Client | undefined> {
  const db = await getDB();
  return db.get("clients", id);
}

export async function updateClient(id: string, updates: Partial<Client>): Promise<Client | undefined> {
  const db = await getDB();
  const client = await db.get("clients", id);
  if (!client) return undefined;
  
  const updated: Client = {
    ...client,
    ...updates,
    updatedAt: new Date().toISOString(),
    synced: false,
  };
  await db.put("clients", updated);
  await addToSyncQueue("update", "clients", updated);
  return updated;
}

// Sale operations
export async function addSale(sale: Omit<Sale, "id" | "createdAt" | "synced">): Promise<Sale> {
  const db = await getDB();
  const newSale: Sale = {
    ...sale,
    id: generateId(),
    createdAt: new Date().toISOString(),
    synced: false,
  };
  await db.put("sales", newSale);
  await addToSyncQueue("create", "sales", newSale);
  
  // If credit sale, create/update debt
  if (sale.type === "credit" && sale.clientId) {
    await addOrUpdateDebt(sale.clientId, sale.amount);
  }
  
  return newSale;
}

export async function getSales(): Promise<Sale[]> {
  const db = await getDB();
  return db.getAll("sales");
}

export async function getTodaySales(): Promise<Sale[]> {
  const db = await getDB();
  const today = new Date().toISOString().split("T")[0];
  const allSales = await db.getAll("sales");
  return allSales.filter((s) => s.createdAt.startsWith(today));
}

// Debt operations
export async function addOrUpdateDebt(clientId: string, amount: number): Promise<Debt> {
  const db = await getDB();
  const existingDebts = await db.getAllFromIndex("debts", "by-client", clientId);
  const activeDebt = existingDebts.find((d) => d.amount > d.paid);

  if (activeDebt) {
    const updated: Debt = {
      ...activeDebt,
      amount: activeDebt.amount + amount,
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    await db.put("debts", updated);
    await addToSyncQueue("update", "debts", updated);
    return updated;
  }

  const newDebt: Debt = {
    id: generateId(),
    clientId,
    amount,
    paid: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  };
  await db.put("debts", newDebt);
  await addToSyncQueue("create", "debts", newDebt);
  return newDebt;
}

export async function getDebts(): Promise<Debt[]> {
  const db = await getDB();
  return db.getAll("debts");
}

export async function getClientDebts(clientId: string): Promise<Debt[]> {
  const db = await getDB();
  return db.getAllFromIndex("debts", "by-client", clientId);
}

// Payment operations
export async function addPayment(payment: Omit<Payment, "id" | "createdAt" | "synced">): Promise<Payment> {
  const db = await getDB();
  const newPayment: Payment = {
    ...payment,
    id: generateId(),
    createdAt: new Date().toISOString(),
    synced: false,
  };
  await db.put("payments", newPayment);
  await addToSyncQueue("create", "payments", newPayment);

  // Update debt paid amount
  const debt = await db.get("debts", payment.debtId);
  if (debt) {
    const updated: Debt = {
      ...debt,
      paid: debt.paid + payment.amount,
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    await db.put("debts", updated);
    await addToSyncQueue("update", "debts", updated);
  }

  return newPayment;
}

export async function getPayments(): Promise<Payment[]> {
  const db = await getDB();
  return db.getAll("payments");
}

// Sync queue operations
export async function addToSyncQueue(
  type: SyncQueueItem["type"],
  table: SyncQueueItem["table"],
  data: unknown
): Promise<void> {
  const db = await getDB();
  const item: SyncQueueItem = {
    id: generateId(),
    type,
    table,
    data,
    createdAt: new Date().toISOString(),
    retries: 0,
  };
  await db.put("syncQueue", item);
}

export async function getSyncQueue(): Promise<SyncQueueItem[]> {
  const db = await getDB();
  return db.getAll("syncQueue");
}

export async function removeSyncQueueItem(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("syncQueue", id);
}

export async function clearSyncQueue(): Promise<void> {
  const db = await getDB();
  await db.clear("syncQueue");
}

// Settings operations
export async function getSettings(): Promise<AppSettings | undefined> {
  const db = await getDB();
  const all = await db.getAll("settings");
  return all[0];
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put("settings", settings);
}

// Stats helpers
export async function getDashboardStats() {
  const todaySales = await getTodaySales();
  const debts = await getDebts();
  const clients = await getClients();

  const totalSales = todaySales.reduce((sum, s) => sum + s.amount, 0);
  const cashSales = todaySales.filter((s) => s.type === "cash").reduce((sum, s) => sum + s.amount, 0);
  const creditSales = todaySales.filter((s) => s.type === "credit").reduce((sum, s) => sum + s.amount, 0);
  const totalDebts = debts.reduce((sum, d) => sum + (d.amount - d.paid), 0);
  const clientsWithDebts = new Set(debts.filter((d) => d.amount > d.paid).map((d) => d.clientId)).size;

  return {
    totalSales,
    cashSales,
    creditSales,
    totalDebts,
    clientsWithDebts,
    totalClients: clients.length,
  };
}
