import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// Collections
const ITEMS_COL = 'inventory_items';
const CATEGORIES_COL = 'inventory_categories';
const PURCHASES_COL = 'inventory_purchases';
const COUNTS_COL = 'inventory_stock_counts';
const TXNS_COL = 'inventory_transactions';
const PERIODS_COL = 'inventory_periods';

// --- Types ---
export interface InventoryCategory {
  id: string;
  category_name: string;
}

export interface InventoryItem {
  id: string;
  item_name: string;
  category_id: string; // references InventoryCategory.id
  unit: string;
  cost_price: number;
  selling_price: number;
  opening_stock: number;
  current_stock: number;
  minimum_stock: number;
  created_at: string;
  supplier?: string;
}

export interface Purchase {
  id: string;
  supplier: string;
  purchase_date: string;
  item_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface StockCount {
  id: string;
  item_id: string;
  expected_quantity: number;
  actual_quantity: number;
  variance: number;
  count_date: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: 'Opening' | 'Purchase' | 'Used' | 'Adjustment';
  quantity: number;
  amount: number;
  date: string;
}

export interface InventoryPeriodItem {
  item_id: string;
  item_name: string;
  category_id: string;
  unit: string;
  cost_price: number;
  opening_stock: number;
  closing_stock: number;
}

export interface InventoryPeriod {
  id: string;
  start_date: string;
  end_date: string;
  items: InventoryPeriodItem[];
}

// --- CATEGORIES ---
export async function getInventoryCategories(): Promise<InventoryCategory[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORIES_COL));
    const cats: InventoryCategory[] = [];
    querySnapshot.forEach((d) => cats.push(d.data() as InventoryCategory));
    return cats.sort((a, b) => a.category_name.localeCompare(b.category_name));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function addInventoryCategory(name: string): Promise<InventoryCategory[]> {
  const id = `cat_${Date.now()}`;
  await setDoc(doc(db, CATEGORIES_COL, id), { id, category_name: name });
  return await getInventoryCategories();
}

export async function updateInventoryCategory(id: string, name: string): Promise<InventoryCategory[]> {
  await updateDoc(doc(db, CATEGORIES_COL, id), { category_name: name });
  return await getInventoryCategories();
}

export async function deleteInventoryCategory(id: string): Promise<InventoryCategory[]> {
  await deleteDoc(doc(db, CATEGORIES_COL, id));
  return await getInventoryCategories();
}

// --- ITEMS ---
export async function getInventoryItems(): Promise<InventoryItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, ITEMS_COL));
    const items: InventoryItem[] = [];
    querySnapshot.forEach((d) => items.push(d.data() as InventoryItem));
    return items.sort((a, b) => a.item_name.localeCompare(b.item_name));
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return [];
  }
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  try {
    const d = await getDoc(doc(db, ITEMS_COL, id));
    if (d.exists()) {
      return d.data() as InventoryItem;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'created_at'>): Promise<InventoryItem[]> {
  const id = `item_${Date.now()}`;
  const now = new Date().toISOString();
  const newItem = { ...item, id, created_at: now };
  await setDoc(doc(db, ITEMS_COL, id), newItem);
  
  if (item.opening_stock > 0) {
    await logInventoryTransaction({
      item_id: id,
      transaction_type: 'Opening',
      quantity: item.opening_stock,
      amount: item.opening_stock * item.cost_price,
      date: now
    });
  }
  
  return await getInventoryItems();
}

export async function updateInventoryItem(id: string, item: Partial<InventoryItem>): Promise<InventoryItem[]> {
  await updateDoc(doc(db, ITEMS_COL, id), item);
  return await getInventoryItems();
}

export async function deleteInventoryItem(id: string): Promise<InventoryItem[]> {
  await deleteDoc(doc(db, ITEMS_COL, id));
  return await getInventoryItems();
}

// --- PURCHASES ---
export async function getPurchases(): Promise<Purchase[]> {
  try {
    const querySnapshot = await getDocs(query(collection(db, PURCHASES_COL), orderBy('purchase_date', 'desc')));
    const purchases: Purchase[] = [];
    querySnapshot.forEach((d) => purchases.push(d.data() as Purchase));
    return purchases;
  } catch (error) {
    console.error("Error fetching purchases:", error);
    return [];
  }
}

export async function logPurchase(purchase: Omit<Purchase, 'id'>): Promise<void> {
  const id = `purch_${Date.now()}`;
  const newPurchase = { ...purchase, id };
  await setDoc(doc(db, PURCHASES_COL, id), newPurchase);
  
  const item = await getInventoryItem(purchase.item_id);
  if (item) {
    const newStock = item.current_stock + purchase.quantity;
    await updateDoc(doc(db, ITEMS_COL, purchase.item_id), { 
      current_stock: newStock,
      cost_price: purchase.unit_cost // Update cost price to latest purchase
    });
    
    await logInventoryTransaction({
      item_id: purchase.item_id,
      transaction_type: 'Purchase',
      quantity: purchase.quantity,
      amount: purchase.total_cost,
      date: purchase.purchase_date
    });
  }
}

// --- TRANSACTIONS ---
export async function getInventoryTransactions(): Promise<InventoryTransaction[]> {
  try {
    const querySnapshot = await getDocs(query(collection(db, TXNS_COL), orderBy('date', 'desc')));
    const txns: InventoryTransaction[] = [];
    querySnapshot.forEach((d) => txns.push(d.data() as InventoryTransaction));
    return txns;
  } catch (error) {
    console.error("Error fetching txns:", error);
    return [];
  }
}

export async function logInventoryTransaction(txn: Omit<InventoryTransaction, 'id'>): Promise<void> {
  const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  await setDoc(doc(db, TXNS_COL, id), { ...txn, id });
}

// POS USE ONLY - DEDUCT STOCK
export async function deductInventoryUsage(itemsUsed: { itemId: string, quantity: number }[]): Promise<void> {
  const now = new Date().toISOString();
  for (const usage of itemsUsed) {
    const item = await getInventoryItem(usage.itemId);
    if (item) {
      const newStock = Math.max(0, item.current_stock - usage.quantity);
      await updateDoc(doc(db, ITEMS_COL, usage.itemId), {
        current_stock: newStock
      });
      
      await logInventoryTransaction({
        item_id: usage.itemId,
        transaction_type: 'Used',
        quantity: usage.quantity,
        amount: usage.quantity * item.cost_price,
        date: now
      });
    }
  }
}

// --- STOCK COUNTS ---
export async function getStockCounts(): Promise<StockCount[]> {
  try {
    const querySnapshot = await getDocs(query(collection(db, COUNTS_COL), orderBy('count_date', 'desc')));
    const counts: StockCount[] = [];
    querySnapshot.forEach((d) => counts.push(d.data() as StockCount));
    return counts;
  } catch (error) {
    console.error("Error fetching stock counts:", error);
    return [];
  }
}

export async function recordStockCount(count: Omit<StockCount, 'id'>): Promise<void> {
  const id = `count_${Date.now()}`;
  await setDoc(doc(db, COUNTS_COL, id), { ...count, id });
  
  if (count.variance !== 0) {
    const item = await getInventoryItem(count.item_id);
    if (item) {
      await updateDoc(doc(db, ITEMS_COL, count.item_id), {
        current_stock: count.actual_quantity
      });
      
      await logInventoryTransaction({
        item_id: count.item_id,
        transaction_type: 'Adjustment',
        quantity: count.variance, // positive if gained, negative if lost
        amount: count.variance * item.cost_price,
        date: count.count_date
      });
    }
  }
}

// --- INVENTORY PERIODS ---
export async function getInventoryPeriods(): Promise<InventoryPeriod[]> {
  try {
    const querySnapshot = await getDocs(query(collection(db, PERIODS_COL), orderBy('end_date', 'desc')));
    const periods: InventoryPeriod[] = [];
    querySnapshot.forEach((d) => periods.push(d.data() as InventoryPeriod));
    return periods;
  } catch (error) {
    console.error("Error fetching inventory periods:", error);
    return [];
  }
}

export async function updateInventoryPeriod(id: string, items: InventoryPeriodItem[]): Promise<void> {
  await updateDoc(doc(db, PERIODS_COL, id), { items });
}

// Reset opening stock (beginning of period)
export async function resetOpeningStock(): Promise<void> {
  const items = await getInventoryItems();
  const now = new Date().toISOString();
  
  // 1. Save the current period snapshot
  const periods = await getInventoryPeriods();
  let start_date = now;
  if (periods.length > 0) {
    start_date = periods[0].end_date; // starts when the last one ended
  } else {
    // If it's the very first time, we don't have a strict start date, let's just make it a month ago or the earliest transaction date
    // For simplicity, we just use the current time minus 30 days or similar, but let's just use now if we can't find one
    // Actually, we can check the earliest transaction if we want, but for now we'll just say it started at a dummy date or simply "Initial"
    start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // roughly a month ago
  }

  const periodItems: InventoryPeriodItem[] = items.map(item => ({
    item_id: item.id,
    item_name: item.item_name,
    category_id: item.category_id,
    unit: item.unit,
    cost_price: item.cost_price,
    opening_stock: item.opening_stock,
    closing_stock: item.current_stock
  }));

  const periodId = `period_${Date.now()}`;
  await setDoc(doc(db, PERIODS_COL, periodId), {
    id: periodId,
    start_date,
    end_date: now,
    items: periodItems
  });
  
  // 2. Reset the actual items
  for (const item of items) {
    await updateDoc(doc(db, ITEMS_COL, item.id), {
      opening_stock: item.current_stock
    });
    
    await logInventoryTransaction({
        item_id: item.id,
        transaction_type: 'Opening',
        quantity: item.current_stock,
        amount: item.current_stock * item.cost_price,
        date: now
    });
  }
}
