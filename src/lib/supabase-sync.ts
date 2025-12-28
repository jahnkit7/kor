import { supabase } from "@/integrations/supabase/client";
import { getDB, getSyncQueue, removeSyncQueueItem } from "./db";
import type { Client, Sale, Debt, Payment, SyncQueueItem } from "./db";

// Sync a single item to the cloud
async function syncItemToCloud(item: SyncQueueItem, userId: string): Promise<boolean> {
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
        console.error(`Sync error for ${table}:`, error);
        return false;
      }
    } else if (type === "update") {
      const id = record.id as string;
      const { synced, ...rest } = record as { synced?: boolean; [key: string]: unknown };
      const cloudData = { ...rest, user_id: userId };

      const { error } = await supabase.from(table).update(cloudData as never).eq("id", id);
      if (error) {
        console.error(`Update sync error for ${table}:`, error);
        return false;
      }
    } else if (type === "delete") {
      const id = record.id as string;
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) {
        console.error(`Delete sync error for ${table}:`, error);
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error("Sync item error:", error);
    return false;
  }
}

// Process the entire sync queue
export async function processSyncQueue(userId: string): Promise<{ success: number; failed: number }> {
  const queue = await getSyncQueue();
  let success = 0;
  let failed = 0;

  // Sort by created date to maintain order
  queue.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const item of queue) {
    const synced = await syncItemToCloud(item, userId);
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
      const localSale: Sale = {
        id: sale.id,
        type: sale.type as "cash" | "credit",
        amount: sale.amount,
        note: sale.note || undefined,
        clientId: sale.client_id || undefined,
        createdAt: sale.created_at,
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

  console.log("Data pulled from cloud successfully");
}

// Full sync: push pending changes then pull updates
export async function fullSync(userId: string): Promise<{ pushed: number; failed: number }> {
  // First push local changes
  const result = await processSyncQueue(userId);
  
  // Then pull remote changes
  await pullFromCloud(userId);

  return { pushed: result.success, failed: result.failed };
}
