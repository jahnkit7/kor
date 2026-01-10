// Types for offline database

export interface Client {
  id: string;
  name: string;
  phone: string;
  photo?: string;
  is_risky?: boolean;
  user_id?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface Sale {
  id: string;
  type: "cash" | "credit";
  amount: number;
  note?: string;
  clientId?: string;
  client_name?: string;
  user_id?: string;
  createdAt: string;
  synced: boolean;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  stock_item_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  synced: boolean;
}

export interface Debt {
  id: string;
  clientId: string;
  client_name?: string;
  amount: number;
  paid: number;
  user_id?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface Payment {
  id: string;
  debtId: string;
  clientId: string;
  amount: number;
  user_id?: string;
  createdAt: string;
  synced: boolean;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  model?: string | null;
  source?: "manual" | "approximate" | "voice";
  user_id?: string;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: "create" | "update" | "delete";
  table: "clients" | "sales" | "debts" | "payments" | "stock_items" | "sale_items";
  data: unknown;
  createdAt: string;
  retries: number;
}

export interface AppSettings {
  shopName: string;
  ownerName: string;
  phone: string;
  currency: string;
  language: string;
  pin?: string;
}
