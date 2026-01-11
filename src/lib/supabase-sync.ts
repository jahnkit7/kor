import { getSupabaseClient } from "@/lib/supabase";
import { getDB, getSyncQueue, removeSyncQueueItem } from "./db";
import type { Client, Sale, Debt, Payment, SyncQueueItem } from "./db";

// Sync a single item to the cloud
async function syncItemToCloud(
  supabase: Awaited<ReturnType<typeof getSupabaseClient>>,
  item: SyncQueueItem,
  userId: string
): Promise<boolean> {
  try {
    const { table, type, data } = item;
    const record = data as Record<string, unknown>;

    if (type === "create") {
      // Prepare cloud data with user_id
      const { synced, ...rest } = record as { synced?: boolean; [key: string]: unknown };
      const cloudData = {
        ...rest,
        user_id: userId,
      };

      const { error } = await supabase.from(table).insert(cloudData as never);
      if (error) {
        if (import.meta.env.DEV) console.error(`Sync error for ${table}:`, error);
        return false;
      }
    } else if (type === "update") {
      const id = record.id as string;
      const { synced, ...rest } = record as { synced?: boolean; [key: string]: unknown };
      const cloudData = { ...rest, user_id: userId };

      const { error } = await supabase.from(table).update(cloudData as never).eq("id", id);
      if (error) {
        if (import.meta.env.DEV) console.error(`Update sync error for ${table}:`, error);
        return false;
      }
    } else if (type === "delete") {
      const id = record.id as string;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        if (import.meta.env.DEV) console.error(`Delete sync error for ${table}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    if (import.meta.env.DEV) console.error("Sync item error:", error);
    return false;
  }
}

// Process the entire sync queue
export async function processSyncQueue(userId: string): Promise<{ success: number; failed: number }> {
  const supabase = await getSupabaseClient();
  const queue = await getSyncQueue();
  let success = 0;
  let failed = 0;

  // Sort by created date to maintain order
  queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const item of queue) {
    const synced = await syncItemToCloud(supabase, item, userId);
    if (synced) {
      await removeSyncQueueItem(item.id);
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

// Fetch all data from cloud to local
export async function pullFromCloud(userId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  const db = await getDB();

  // Fetch clients
  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .eq("user_id", userId);

  if (clients) {
    for (const client of clients) {
      const localClient: Client = {
        id: client.id,
        name: client.name,
        phone: client.phone,
        photo: client.photo || undefined,
        createdAt: client.created_at,
        updatedAt: client.updated_at,
        synced: true,
      };
      await db.put("clients", localClient);
    }
  }

  // Fetch sales
  const { data: sales } = await supabase
    .from("sales")
    .select("*")
    .eq("user_id", userId);

  if (sales) {
    for (const sale of sales) {
      // Derive local day from created_at for existing cloud records
      const createdDate = new Date(sale.created_at);
      const localDay = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}-${String(createdDate.getDate()).padStart(2, "0")}`;
      
      const localSale: Sale = {
        id: sale.id,
        type: sale.type as "cash" | "credit",
        amount: sale.amount,
        note: sale.note || undefined,
        clientId: sale.client_id || undefined,
        createdAt: sale.created_at,
        createdAtLocalDay: localDay,
        synced: true,
      };
      await db.put("sales", localSale);
    }
  }

  // Fetch debts
  const { data: debts } = await supabase
    .from("debts")
    .select("*")
    .eq("user_id", userId);

  if (debts) {
    for (const debt of debts) {
      const localDebt: Debt = {
        id: debt.id,
        clientId: debt.client_id,
        amount: debt.amount,
        paid: debt.paid,
        createdAt: debt.created_at,
        updatedAt: debt.updated_at,
        synced: true,
      };
      await db.put("debts", localDebt);
    }
  }

  // Fetch payments
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId);

  if (payments) {
    for (const payment of payments) {
      const localPayment: Payment = {
        id: payment.id,
        debtId: payment.debt_id,
        clientId: payment.client_id,
        amount: payment.amount,
        createdAt: payment.created_at,
        synced: true,
      };
      await db.put("payments", localPayment);
    }
  }

  if (import.meta.env.DEV) console.log("Data pulled from cloud successfully");
}

// Full sync: push pending changes then pull updates
export async function fullSync(userId: string): Promise<{ pushed: number; failed: number }> {
  // First push local changes
  const result = await processSyncQueue(userId);
  
  // Then push all unsynced items from stores
  const directPushResult = await pushUnsyncedToCloud(userId);
  
  // Then pull remote changes
  await pullFromCloud(userId);

  return { 
    pushed: result.success + directPushResult.pushed, 
    failed: result.failed + directPushResult.failed 
  };
}

// Helper to validate UUID format
function isValidUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

// Helper to generate a valid UUID
function generateValidUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Push all unsynced items directly from stores (not just queue)
export async function pushUnsyncedToCloud(userId: string): Promise<{ pushed: number; failed: number; details: { sales: number; clients: number; debts: number; payments: number; stock: number } }> {
  const supabase = await getSupabaseClient();
  const db = await getDB();
  
  let pushed = 0;
  let failed = 0;
  const details = { sales: 0, clients: 0, debts: 0, payments: 0, stock: 0 };

  if (import.meta.env.DEV) console.log("[SYNC] Starting pushUnsyncedToCloud for user:", userId);

  // 1. Push unsynced sales
  const allSales = await db.getAll("sales");
  const unsyncedSales = allSales.filter(s => !s.synced);
  if (import.meta.env.DEV) console.log(`[SYNC] Found ${unsyncedSales.length} unsynced sales`);
  
  for (const sale of unsyncedSales) {
    try {
      // Migrate invalid IDs to valid UUIDs
      let cloudId = sale.id;
      const oldId = sale.id;
      
      if (!isValidUUID(sale.id)) {
        cloudId = generateValidUUID();
        if (import.meta.env.DEV) console.log(`[SYNC] Migrating invalid ID ${oldId} -> ${cloudId}`);
      }
      
      if (import.meta.env.DEV) console.log(`[SYNC] Pushing sale: ${cloudId}, amount: ${sale.amount}`);
      const { error } = await supabase
        .from("sales")
        .upsert({
          id: cloudId,
          type: sale.type,
          amount: sale.amount,
          note: sale.note || null,
          client_id: sale.clientId || null,
          user_id: userId,
          created_at: sale.createdAt,
        }, { onConflict: 'id' });

      if (!error) {
        // If ID was migrated, delete old and insert with new ID
        if (cloudId !== oldId) {
          await db.delete("sales", oldId);
          await db.put("sales", { ...sale, id: cloudId, synced: true });
        } else {
          await db.put("sales", { ...sale, synced: true });
        }
        pushed++;
        details.sales++;
        if (import.meta.env.DEV) console.log(`[SYNC] ✓ Sale ${cloudId} synced successfully`);
      } else {
        if (import.meta.env.DEV) console.error(`[SYNC] ✗ Error syncing sale ${cloudId}:`, error);
        failed++;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error(`[SYNC] ✗ Exception syncing sale ${sale.id}:`, err);
      failed++;
    }
  }

  // 2. Push unsynced clients
  const allClients = await db.getAll("clients");
  const unsyncedClients = allClients.filter(c => !c.synced);
  if (import.meta.env.DEV) console.log(`[SYNC] Found ${unsyncedClients.length} unsynced clients`);
  
  for (const client of unsyncedClients) {
    try {
      let cloudId = client.id;
      const oldId = client.id;
      
      if (!isValidUUID(client.id)) {
        cloudId = generateValidUUID();
        if (import.meta.env.DEV) console.log(`[SYNC] Migrating client ID ${oldId} -> ${cloudId}`);
      }
      
      const { error } = await supabase
        .from("clients")
        .upsert({
          id: cloudId,
          name: client.name,
          phone: client.phone,
          photo: client.photo || null,
          is_risky: client.is_risky || false,
          user_id: userId,
          created_at: client.createdAt,
          updated_at: client.updatedAt,
        }, { onConflict: 'id' });

      if (!error) {
        if (cloudId !== oldId) {
          await db.delete("clients", oldId);
          await db.put("clients", { ...client, id: cloudId, synced: true });
        } else {
          await db.put("clients", { ...client, synced: true });
        }
        pushed++;
        details.clients++;
      } else {
        if (import.meta.env.DEV) console.error(`[SYNC] ✗ Error syncing client ${cloudId}:`, error);
        failed++;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error(`[SYNC] ✗ Exception syncing client ${client.id}:`, err);
      failed++;
    }
  }

  // 3. Push unsynced debts
  const allDebts = await db.getAll("debts");
  const unsyncedDebts = allDebts.filter(d => !d.synced);
  if (import.meta.env.DEV) console.log(`[SYNC] Found ${unsyncedDebts.length} unsynced debts`);
  
  for (const debt of unsyncedDebts) {
    try {
      let cloudId = debt.id;
      const oldId = debt.id;
      
      if (!isValidUUID(debt.id)) {
        cloudId = generateValidUUID();
        if (import.meta.env.DEV) console.log(`[SYNC] Migrating debt ID ${oldId} -> ${cloudId}`);
      }
      
      // Also check if clientId is valid UUID - if not, try to find migrated client
      let clientIdForCloud = debt.clientId;
      if (debt.clientId && !isValidUUID(debt.clientId)) {
        // Find if client was already migrated by checking local DB for matching client
        const allClientsNow = await db.getAll("clients");
        const migratedClient = allClientsNow.find(c => c.name && c.synced);
        if (migratedClient) {
          clientIdForCloud = migratedClient.id;
        }
      }
      
      const { error } = await supabase
        .from("debts")
        .upsert({
          id: cloudId,
          client_id: clientIdForCloud,
          amount: debt.amount,
          paid: debt.paid,
          user_id: userId,
          created_at: debt.createdAt,
          updated_at: debt.updatedAt,
        }, { onConflict: 'id' });

      if (!error) {
        if (cloudId !== oldId) {
          await db.delete("debts", oldId);
          await db.put("debts", { ...debt, id: cloudId, clientId: clientIdForCloud, synced: true });
        } else {
          await db.put("debts", { ...debt, synced: true });
        }
        pushed++;
        details.debts++;
      } else {
        if (import.meta.env.DEV) console.error(`[SYNC] ✗ Error syncing debt ${cloudId}:`, error);
        failed++;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error(`[SYNC] ✗ Exception syncing debt ${debt.id}:`, err);
      failed++;
    }
  }

  // 4. Push unsynced payments
  const allPayments = await db.getAll("payments");
  const unsyncedPayments = allPayments.filter(p => !p.synced);
  if (import.meta.env.DEV) console.log(`[SYNC] Found ${unsyncedPayments.length} unsynced payments`);
  
  for (const payment of unsyncedPayments) {
    try {
      let cloudId = payment.id;
      const oldId = payment.id;
      
      if (!isValidUUID(payment.id)) {
        cloudId = generateValidUUID();
        if (import.meta.env.DEV) console.log(`[SYNC] Migrating payment ID ${oldId} -> ${cloudId}`);
      }
      
      const { error } = await supabase
        .from("payments")
        .upsert({
          id: cloudId,
          debt_id: payment.debtId,
          client_id: payment.clientId,
          amount: payment.amount,
          user_id: userId,
          created_at: payment.createdAt,
        }, { onConflict: 'id' });

      if (!error) {
        if (cloudId !== oldId) {
          await db.delete("payments", oldId);
          await db.put("payments", { ...payment, id: cloudId, synced: true });
        } else {
          await db.put("payments", { ...payment, synced: true });
        }
        pushed++;
        details.payments++;
      } else {
        if (import.meta.env.DEV) console.error(`[SYNC] ✗ Error syncing payment ${cloudId}:`, error);
        failed++;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error(`[SYNC] ✗ Exception syncing payment ${payment.id}:`, err);
      failed++;
    }
  }

  // 5. Push unsynced stock items
  const allStock = await db.getAll("stock_items");
  const unsyncedStock = allStock.filter(s => !s.synced);
  if (import.meta.env.DEV) console.log(`[SYNC] Found ${unsyncedStock.length} unsynced stock items`);
  
  for (const stock of unsyncedStock) {
    try {
      let cloudId = stock.id;
      const oldId = stock.id;
      
      if (!isValidUUID(stock.id)) {
        cloudId = generateValidUUID();
        if (import.meta.env.DEV) console.log(`[SYNC] Migrating stock ID ${oldId} -> ${cloudId}`);
      }
      
      const { error } = await supabase
        .from("stock_items")
        .upsert({
          id: cloudId,
          name: stock.name,
          quantity: stock.quantity,
          unit_price: stock.unit_price,
          model: stock.model || null,
          source: stock.source || "manual",
          user_id: userId,
          created_at: stock.createdAt,
          updated_at: stock.updatedAt,
        }, { onConflict: 'id' });

      if (!error) {
        if (cloudId !== oldId) {
          await db.delete("stock_items", oldId);
          await db.put("stock_items", { ...stock, id: cloudId, synced: true });
        } else {
          await db.put("stock_items", { ...stock, synced: true });
        }
        pushed++;
        details.stock++;
      } else {
        if (import.meta.env.DEV) console.error(`[SYNC] ✗ Error syncing stock ${cloudId}:`, error);
        failed++;
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error(`[SYNC] ✗ Exception syncing stock ${stock.id}:`, err);
      failed++;
    }
  }

  if (import.meta.env.DEV) console.log(`[SYNC] Complete: ${pushed} pushed, ${failed} failed`, details);
  return { pushed, failed, details };
}

// Retry failed items with tracking
export async function retryFailedItems(userId: string): Promise<{ retried: number; stillFailed: number }> {
  const db = await getDB();
  let retried = 0;
  let stillFailed = 0;

  if (import.meta.env.DEV) console.log("[SYNC-RETRY] Starting retry for failed items...");

  // Get all unsynced items
  const [sales, clients, debts, payments, stockItems] = await Promise.all([
    db.getAll("sales"),
    db.getAll("clients"),
    db.getAll("debts"),
    db.getAll("payments"),
    db.getAll("stock_items"),
  ]);

  const unsyncedSales = sales.filter(s => !s.synced);
  const unsyncedClients = clients.filter(c => !c.synced);
  const unsyncedDebts = debts.filter(d => !d.synced);
  const unsyncedPayments = payments.filter(p => !p.synced);
  const unsyncedStock = stockItems.filter(s => !s.synced);

  const totalUnsynced = unsyncedSales.length + unsyncedClients.length + 
                        unsyncedDebts.length + unsyncedPayments.length + unsyncedStock.length;

  if (totalUnsynced === 0) {
    if (import.meta.env.DEV) console.log("[SYNC-RETRY] No items to retry");
    return { retried: 0, stillFailed: 0 };
  }

  if (import.meta.env.DEV) console.log(`[SYNC-RETRY] Found ${totalUnsynced} unsynced items to retry`);

  // Use pushUnsyncedToCloud which handles all the logic
  const result = await pushUnsyncedToCloud(userId);
  
  retried = result.pushed;
  stillFailed = result.failed;

  console.log(`[SYNC-RETRY] Complete: ${retried} synced, ${stillFailed} still failed`);
  return { retried, stillFailed };
}
