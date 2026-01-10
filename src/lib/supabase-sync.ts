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
  
  // Then push all unsynced items from stores
  const directPushResult = await pushUnsyncedToCloud(userId);
  
  // Then pull remote changes
  await pullFromCloud(userId);

  return { 
    pushed: result.success + directPushResult.pushed, 
    failed: result.failed + directPushResult.failed 
  };
}

// Push all unsynced items directly from stores (not just queue)
export async function pushUnsyncedToCloud(userId: string): Promise<{ pushed: number; failed: number }> {
  const supabase = await getSupabaseClient();
  const db = await getDB();
  
  let pushed = 0;
  let failed = 0;

  // 1. Push unsynced sales
  const allSales = await db.getAll("sales");
  const unsyncedSales = allSales.filter(s => !s.synced);
  
  for (const sale of unsyncedSales) {
    try {
      const { error } = await supabase
        .from("sales")
        .upsert({
          id: sale.id,
          type: sale.type,
          amount: sale.amount,
          note: sale.note || null,
          client_id: sale.clientId || null,
          user_id: userId,
          created_at: sale.createdAt,
        }, { onConflict: 'id' });

      if (!error) {
        await db.put("sales", { ...sale, synced: true });
        pushed++;
      } else {
        console.error("Error syncing sale:", error);
        failed++;
      }
    } catch (err) {
      console.error("Error syncing sale:", err);
      failed++;
    }
  }

  // 2. Push unsynced clients
  const allClients = await db.getAll("clients");
  const unsyncedClients = allClients.filter(c => !c.synced);
  
  for (const client of unsyncedClients) {
    try {
      const { error } = await supabase
        .from("clients")
        .upsert({
          id: client.id,
          name: client.name,
          phone: client.phone,
          photo: client.photo || null,
          is_risky: client.is_risky || false,
          user_id: userId,
          created_at: client.createdAt,
          updated_at: client.updatedAt,
        }, { onConflict: 'id' });

      if (!error) {
        await db.put("clients", { ...client, synced: true });
        pushed++;
      } else {
        console.error("Error syncing client:", error);
        failed++;
      }
    } catch (err) {
      console.error("Error syncing client:", err);
      failed++;
    }
  }

  // 3. Push unsynced debts
  const allDebts = await db.getAll("debts");
  const unsyncedDebts = allDebts.filter(d => !d.synced);
  
  for (const debt of unsyncedDebts) {
    try {
      const { error } = await supabase
        .from("debts")
        .upsert({
          id: debt.id,
          client_id: debt.clientId,
          amount: debt.amount,
          paid: debt.paid,
          user_id: userId,
          created_at: debt.createdAt,
          updated_at: debt.updatedAt,
        }, { onConflict: 'id' });

      if (!error) {
        await db.put("debts", { ...debt, synced: true });
        pushed++;
      } else {
        console.error("Error syncing debt:", error);
        failed++;
      }
    } catch (err) {
      console.error("Error syncing debt:", err);
      failed++;
    }
  }

  // 4. Push unsynced payments
  const allPayments = await db.getAll("payments");
  const unsyncedPayments = allPayments.filter(p => !p.synced);
  
  for (const payment of unsyncedPayments) {
    try {
      const { error } = await supabase
        .from("payments")
        .upsert({
          id: payment.id,
          debt_id: payment.debtId,
          client_id: payment.clientId,
          amount: payment.amount,
          user_id: userId,
          created_at: payment.createdAt,
        }, { onConflict: 'id' });

      if (!error) {
        await db.put("payments", { ...payment, synced: true });
        pushed++;
      } else {
        console.error("Error syncing payment:", error);
        failed++;
      }
    } catch (err) {
      console.error("Error syncing payment:", err);
      failed++;
    }
  }

  // 5. Push unsynced stock items
  const allStock = await db.getAll("stock_items");
  const unsyncedStock = allStock.filter(s => !s.synced);
  
  for (const stock of unsyncedStock) {
    try {
      const { error } = await supabase
        .from("stock_items")
        .upsert({
          id: stock.id,
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
        await db.put("stock_items", { ...stock, synced: true });
        pushed++;
      } else {
        console.error("Error syncing stock:", error);
        failed++;
      }
    } catch (err) {
      console.error("Error syncing stock:", err);
      failed++;
    }
  }

  console.log(`Pushed ${pushed} items, ${failed} failed`);
  return { pushed, failed };
}
