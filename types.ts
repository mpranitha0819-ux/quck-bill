
export interface Item {
  id: string;
  name: string;
  rate: number;
  category: string;
}

export interface BillItem {
  id: string;
  itemId: string;
  name: string;
  rate: number;
  quantity: number;
  total: number;
}

export interface Transaction {
  id: string;
  timestamp: number;
  items: BillItem[];
  totalAmount: number;
  customerName?: string;
}

export interface User {
  phone: string;
  pin: string;
}

export type AppView = 'billing' | 'history' | 'inventory' | 'auth';
