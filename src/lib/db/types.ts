// Types for offline database

export interface Client {
  id: string;
  name: string;
  phone: string;
  photo?: string;
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
  createdAt: string;
  synced: boolean;
}

export interface Debt {
  id: string;
  clientId: string;
  amount: number;
  paid: number;
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface Payment {
  id: string;
  debtId: string;
  clientId: string;
  amount: number;
  createdAt: string;
  synced: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: "create" | "update" | "delete";
  table: "clients" | "sales" | "debts" | "payments";
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
