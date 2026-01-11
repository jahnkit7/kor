import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Client, Sale, SaleItem, Debt, Payment, StockItem, SyncQueueItem, AppSettings, AudioRecording, ProductDictionary } from "./types";

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
  sale_items: {
    key: string;
    value: SaleItem;
    indexes: { "by-sale": string; "by-synced": number };
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
  stock_items: {
    key: string;
    value: StockItem;
    indexes: { "by-name": string; "by-synced": number };
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
  audio_recordings: {
    key: string;
    value: AudioRecording;
    indexes: { "by-synced": number; "by-type": string };
  };
  product_dictionary: {
    key: string;
    value: ProductDictionary;
    indexes: { "by-name": string; "by-category": string };
  };
}

const DB_NAME = "caisse-plus-db";
const DB_VERSION = 3; // Increment version for new stores

let dbInstance: IDBPDatabase<CaissePlusDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<CaissePlusDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CaissePlusDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
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

      // Sale items store (new)
      if (!db.objectStoreNames.contains("sale_items")) {
        const saleItemsStore = db.createObjectStore("sale_items", { keyPath: "id" });
        saleItemsStore.createIndex("by-sale", "sale_id");
        saleItemsStore.createIndex("by-synced", "synced");
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

      // Stock items store (new)
      if (!db.objectStoreNames.contains("stock_items")) {
        const stockStore = db.createObjectStore("stock_items", { keyPath: "id" });
        stockStore.createIndex("by-name", "name");
        stockStore.createIndex("by-synced", "synced");
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

      // Audio recordings store (for offline deferred transcription)
      if (!db.objectStoreNames.contains("audio_recordings")) {
        const audioStore = db.createObjectStore("audio_recordings", { keyPath: "id" });
        audioStore.createIndex("by-synced", "synced");
        audioStore.createIndex("by-type", "type");
      }

      // Product dictionary store (for local parsing)
      if (!db.objectStoreNames.contains("product_dictionary")) {
        const dictStore = db.createObjectStore("product_dictionary", { keyPath: "id" });
        dictStore.createIndex("by-name", "name");
        dictStore.createIndex("by-category", "category");
      }
    },
  });

  return dbInstance;
}

// Generate valid UUID - critical for Supabase compatibility
export function generateId(): string {
  // Use crypto.randomUUID() available in all modern browsers
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: generate UUID v4 manually
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
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

// Helper: Get local day string (YYYY-MM-DD in local timezone)
function getLocalDayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Sale operations
// BUG 2 FIX: Removed automatic debt creation here - it's now handled ONLY in use-sales.ts
// with idempotent UPSERT using sale_id to prevent duplicates
export async function addSale(sale: Omit<Sale, "id" | "createdAt" | "createdAtLocalDay" | "synced">): Promise<Sale> {
  const db = await getDB();
  const newSale: Sale = {
    ...sale,
    id: generateId(),
    createdAt: new Date().toISOString(),
    createdAtLocalDay: getLocalDayString(), // Local timezone day
    synced: false,
  };
  await db.put("sales", newSale);
  await addToSyncQueue("create", "sales", newSale);
  
  // NOTE: Debt creation is NO LONGER done here to prevent duplicates
  // It's now handled exclusively in use-sales.ts with idempotent UPSERT
  
  return newSale;
}

/**
 * Create debt for a sale with idempotency (Bug 2 fix)
 * Uses sale_id to ensure 1 debt = 1 credit sale
 */
export async function createDebtForSale(params: {
  id: string;
  saleId: string;
  clientId: string;
  amount: number;
  paid: number;
  userId?: string;
  clientName?: string;
}): Promise<Debt> {
  const db = await getDB();
  const now = new Date().toISOString();
  
  // Check if debt for this sale already exists (idempotency)
  const existingDebts = await db.getAllFromIndex("debts", "by-client", params.clientId);
  const existingDebtForSale = existingDebts.find(d => d.sale_id === params.saleId);
  
  if (existingDebtForSale) {
    // Debt already exists for this sale - return it (idempotent)
    return existingDebtForSale;
  }
  
  const newDebt: Debt = {
    id: params.id,
    clientId: params.clientId,
    client_name: params.clientName,
    amount: params.amount,
    paid: params.paid,
    user_id: params.userId,
    sale_id: params.saleId,
    createdAt: now,
    updatedAt: now,
    synced: false,
  };
  
  await db.put("debts", newDebt);
  await addToSyncQueue("create", "debts", newDebt);
  
  return newDebt;
}

export async function getSales(): Promise<Sale[]> {
  const db = await getDB();
  return db.getAll("sales");
}

export async function getTodaySales(): Promise<Sale[]> {
  const db = await getDB();
  const todayLocal = getLocalDayString();
  const allSales = await db.getAll("sales");
  // Use createdAtLocalDay if available, fallback to createdAt for old records
  return allSales.filter((s) => {
    if (s.createdAtLocalDay) {
      return s.createdAtLocalDay === todayLocal;
    }
    // CORRECT FALLBACK: Recalculate local day from UTC createdAt
    const saleDate = new Date(s.createdAt);
    const saleLocalDay = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, "0")}-${String(saleDate.getDate()).padStart(2, "0")}`;
    return saleLocalDay === todayLocal;
  });
}

/**
 * Get today's sales COUNT (optimized for limit checks)
 * Uses createdAtLocalDay for timezone-safe counting
 */
export async function getTodaySalesCount(): Promise<number> {
  const sales = await getTodaySales();
  return sales.length;
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

// Stock item operations
export async function addStockItem(item: Omit<StockItem, "id" | "createdAt" | "updatedAt" | "synced">): Promise<StockItem> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newItem: StockItem = {
    ...item,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    synced: false,
  };
  await db.put("stock_items", newItem);
  await addToSyncQueue("create", "stock_items", newItem);
  return newItem;
}

export async function getStockItems(): Promise<StockItem[]> {
  const db = await getDB();
  return db.getAll("stock_items");
}

export async function getStockItem(id: string): Promise<StockItem | undefined> {
  const db = await getDB();
  return db.get("stock_items", id);
}

export async function updateStockItem(id: string, updates: Partial<StockItem>): Promise<StockItem | undefined> {
  const db = await getDB();
  const item = await db.get("stock_items", id);
  if (!item) return undefined;
  
  const updated: StockItem = {
    ...item,
    ...updates,
    updatedAt: new Date().toISOString(),
    synced: false,
  };
  await db.put("stock_items", updated);
  await addToSyncQueue("update", "stock_items", updated);
  return updated;
}

export async function deleteStockItem(id: string): Promise<boolean> {
  const db = await getDB();
  const item = await db.get("stock_items", id);
  if (!item) return false;
  
  await db.delete("stock_items", id);
  await addToSyncQueue("delete", "stock_items", { id });
  return true;
}

// Sale items operations
export async function addSaleItems(items: Omit<SaleItem, "id" | "synced">[]): Promise<SaleItem[]> {
  const db = await getDB();
  const newItems: SaleItem[] = items.map(item => ({
    ...item,
    id: generateId(),
    synced: false,
  }));
  
  for (const item of newItems) {
    await db.put("sale_items", item);
    await addToSyncQueue("create", "sale_items", item);
  }
  
  return newItems;
}

export async function getSaleItemsBySale(saleId: string): Promise<SaleItem[]> {
  const db = await getDB();
  return db.getAllFromIndex("sale_items", "by-sale", saleId);
}

// Mark as synced helper
export async function markAsSynced(
  table: "clients" | "sales" | "debts" | "payments" | "stock_items" | "sale_items",
  id: string
): Promise<void> {
  const db = await getDB();
  const record = await db.get(table, id);
  if (record) {
    await db.put(table, { ...record, synced: true });
  }
}

// Bulk update from cloud data
export async function upsertFromCloud<T extends { id: string }>(
  table: "clients" | "sales" | "debts" | "payments" | "stock_items",
  items: T[]
): Promise<void> {
  const db = await getDB();
  for (const item of items) {
    const existing = await db.get(table, item.id);
    // Only update if local version is synced (no pending changes)
    if (!existing || existing.synced) {
      await db.put(table, { ...item, synced: true } as never);
    }
  }
}

// Clear all data for a specific table
export async function clearTable(table: "clients" | "sales" | "debts" | "payments" | "stock_items" | "sale_items"): Promise<void> {
  const db = await getDB();
  await db.clear(table);
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

// Audio recording operations (for deferred offline transcription)
export async function addAudioRecording(recording: Omit<AudioRecording, "id" | "createdAt" | "synced">): Promise<AudioRecording> {
  const db = await getDB();
  const newRecording: AudioRecording = {
    ...recording,
    id: generateId(),
    createdAt: new Date().toISOString(),
    synced: false,
  };
  await db.put("audio_recordings", newRecording);
  return newRecording;
}

export async function getAudioRecordings(): Promise<AudioRecording[]> {
  const db = await getDB();
  return db.getAll("audio_recordings");
}

export async function getPendingAudioRecordings(): Promise<AudioRecording[]> {
  const db = await getDB();
  const all = await db.getAll("audio_recordings");
  return all.filter(r => !r.synced);
}

export async function updateAudioRecording(id: string, updates: Partial<AudioRecording>): Promise<AudioRecording | undefined> {
  const db = await getDB();
  const recording = await db.get("audio_recordings", id);
  if (!recording) return undefined;
  
  const updated: AudioRecording = {
    ...recording,
    ...updates,
  };
  await db.put("audio_recordings", updated);
  return updated;
}

export async function deleteAudioRecording(id: string): Promise<boolean> {
  const db = await getDB();
  const recording = await db.get("audio_recordings", id);
  if (!recording) return false;
  await db.delete("audio_recordings", id);
  return true;
}

// Product dictionary operations (for local parsing)
export async function addProductToDictionary(product: Omit<ProductDictionary, "id" | "createdAt" | "updatedAt" | "usage_count">): Promise<ProductDictionary> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newProduct: ProductDictionary = {
    ...product,
    id: generateId(),
    usage_count: 0,
    createdAt: now,
    updatedAt: now,
  };
  await db.put("product_dictionary", newProduct);
  return newProduct;
}

export async function getProductDictionary(): Promise<ProductDictionary[]> {
  const db = await getDB();
  return db.getAll("product_dictionary");
}

export async function incrementProductUsage(id: string): Promise<void> {
  const db = await getDB();
  const product = await db.get("product_dictionary", id);
  if (product) {
    await db.put("product_dictionary", {
      ...product,
      usage_count: product.usage_count + 1,
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function findProductByName(searchName: string): Promise<ProductDictionary | undefined> {
  const db = await getDB();
  const all = await db.getAll("product_dictionary");
  const normalized = searchName.toLowerCase().trim();
  
  return all.find(p => 
    p.name.toLowerCase() === normalized ||
    p.aliases.some(alias => alias.toLowerCase() === normalized)
  );
}
