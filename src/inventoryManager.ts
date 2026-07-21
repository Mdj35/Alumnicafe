import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

// Collections
const ITEMS_COL = 'inventory_items';
const CATEGORIES_COL = 'inventory_categories';
const PURCHASES_COL = 'inventory_purchases';
const COUNTS_COL = 'inventory_stock_counts';
const TXNS_COL = 'inventory_transactions';
const PERIODS_COL = 'inventory_periods';
const RECIPES_COL = 'inventory_recipes';
const OPENING_STOCK_COL = 'inventory_opening_stock';

// --- Types ---
export interface InventoryCategory {
  id: string;
  category_name: string;
}

export interface InventoryItem {
  id: string;
  item_code: string;
  item_name: string;
  category_id: string;
  description?: string;
  purchase_unit?: string;
  usage_unit?: string;
  unit: string; // legacy usage unit
  supplier?: string;
  purchase_price: number;
  package_quantity: number;
  unit_cost: number;
  cost_price: number; // alias for unit_cost for legacy compatibility
  selling_price: number;
  opening_stock: number;
  current_stock: number;
  minimum_stock: number; // reorder_level
  weighted_avg_cost: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  item_id: string;
  supplier: string;
  purchase_date: string;
  purchase_qty: number;
  package_quantity: number;
  quantity: number; // total units added to stock = purchase_qty * package_quantity
  purchase_price: number;
  unit_cost: number;
  total_cost: number;
  note?: string;
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
  sale_id?: string;
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

export interface RecipeIngredient {
  item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number; // snapshot cost
}

export interface Recipe {
  id: string; // same as menu_item_id or unique
  menu_item_id: number;
  menu_item_name: string;
  selling_price: number;
  ingredients: RecipeIngredient[];
  recipe_cost: number;
  cost_per_serving: number;
  food_cost_percentage: number;
  gross_profit: number;
}

export interface OpeningStockItem {
  item_id: string;
  qty: number;
  unit_cost: number;
  value: number;
}

export interface OpeningStockEntry {
  id: string;
  date: string;
  items: OpeningStockItem[];
  total_value: number;
  notes?: string;
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
      amount: item.opening_stock * item.unit_cost,
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

export async function clearPurchaseHistory(): Promise<void> {
  const querySnapshot = await getDocs(collection(db, PURCHASES_COL));
  const batch = writeBatch(db);
  querySnapshot.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  await batch.commit();
}

export async function logPurchase(purchase: Omit<Purchase, 'id' | 'quantity' | 'unit_cost' | 'total_cost'>): Promise<void> {
  const id = `purch_${Date.now()}`;
  
  const unit_cost = purchase.purchase_price / purchase.package_quantity;
  const quantity = purchase.purchase_qty * purchase.package_quantity;
  const total_cost = purchase.purchase_qty * purchase.purchase_price;

  const newPurchase: Purchase = { 
    ...purchase, 
    id,
    quantity,
    unit_cost,
    total_cost
  };

  const item = await getInventoryItem(purchase.item_id);
  
  const batch = writeBatch(db);
  batch.set(doc(db, PURCHASES_COL, id), newPurchase);

  if (item) {
    const old_stock = item.current_stock;
    const old_unit_cost = item.weighted_avg_cost || item.unit_cost;
    const newStock = old_stock + quantity;
    
    // Calculate new weighted average cost
    let new_weighted_avg = 0;
    if (newStock > 0) {
      new_weighted_avg = ((old_stock * old_unit_cost) + (quantity * unit_cost)) / newStock;
    }
    
    batch.update(doc(db, ITEMS_COL, purchase.item_id), { 
      current_stock: newStock,
      purchase_price: purchase.purchase_price,
      package_quantity: purchase.package_quantity,
      unit_cost: unit_cost,
      cost_price: unit_cost, // update legacy cost_price
      weighted_avg_cost: new_weighted_avg
    });
    
    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    batch.set(doc(db, TXNS_COL, txnId), {
      id: txnId,
      item_id: purchase.item_id,
      transaction_type: 'Purchase',
      quantity: quantity,
      amount: total_cost,
      date: purchase.purchase_date
    });
  }

  await batch.commit();
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

// POS USE ONLY - DEDUCT STOCK VIA RECIPE
export async function deductInventoryUsage(itemsUsed: { itemId: string, quantity: number }[]): Promise<void> {
  // Kept for backward compatibility if any legacy component uses it.
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  for (const usage of itemsUsed) {
    const item = await getInventoryItem(usage.itemId);
    if (item) {
      const newStock = Math.max(0, item.current_stock - usage.quantity);
      batch.update(doc(db, ITEMS_COL, usage.itemId), {
        current_stock: newStock
      });
      
      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(db, TXNS_COL, txnId), {
        id: txnId,
        item_id: usage.itemId,
        transaction_type: 'Used',
        quantity: usage.quantity,
        amount: usage.quantity * item.unit_cost,
        date: now
      });
    }
  }

  await batch.commit();
}

export async function deductIngredientsByRecipe(cartItems: { id: number, quantity: number }[], saleId: string): Promise<void> {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const recipes = await getRecipes();
  
  // Consolidate ingredient usage
  const usage: Record<string, number> = {};

  for (const cartItem of cartItems) {
    const recipe = recipes.find(r => r.menu_item_id === cartItem.id);
    if (recipe && recipe.ingredients) {
      for (const ing of recipe.ingredients) {
        usage[ing.item_id] = (usage[ing.item_id] || 0) + (ing.quantity * cartItem.quantity);
      }
    }
  }

  const inventoryItems = await getInventoryItems();

  for (const [itemId, qty] of Object.entries(usage)) {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      const newStock = item.current_stock - qty; // allow negative if they sold more than recorded stock
      batch.update(doc(db, ITEMS_COL, itemId), {
        current_stock: newStock
      });

      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(db, TXNS_COL, txnId), {
        id: txnId,
        item_id: itemId,
        transaction_type: 'Used',
        quantity: qty,
        amount: qty * item.unit_cost,
        date: now,
        sale_id: saleId
      });
    }
  }

  await batch.commit();
}

// --- RECIPES ---
export async function getRecipes(): Promise<Recipe[]> {
  try {
    const querySnapshot = await getDocs(collection(db, RECIPES_COL));
    const recipes: Recipe[] = [];
    querySnapshot.forEach((d) => recipes.push(d.data() as Recipe));
    return recipes;
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return [];
  }
}

export async function saveRecipe(recipe: Omit<Recipe, 'id'> | Recipe): Promise<void> {
  const id = 'id' in recipe && recipe.id ? recipe.id : `recipe_${recipe.menu_item_id}`;
  await setDoc(doc(db, RECIPES_COL, id), { ...recipe, id });
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteDoc(doc(db, RECIPES_COL, id));
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
  
  const batch = writeBatch(db);
  batch.set(doc(db, COUNTS_COL, id), { ...count, id });
  
  if (count.variance !== 0) {
    const item = await getInventoryItem(count.item_id);
    if (item) {
      batch.update(doc(db, ITEMS_COL, count.item_id), {
        current_stock: count.actual_quantity
      });
      
      const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      batch.set(doc(db, TXNS_COL, txnId), {
        id: txnId,
        item_id: count.item_id,
        transaction_type: 'Adjustment',
        quantity: count.variance, // positive if gained, negative if lost
        amount: count.variance * item.unit_cost,
        date: count.count_date
      });
    }
  }

  await batch.commit();
}


// --- OPENING STOCK ---
export async function getOpeningStocks(): Promise<OpeningStockEntry[]> {
  try {
    const querySnapshot = await getDocs(query(collection(db, OPENING_STOCK_COL), orderBy('date', 'desc')));
    const entries: OpeningStockEntry[] = [];
    querySnapshot.forEach((d) => entries.push(d.data() as OpeningStockEntry));
    return entries;
  } catch (error) {
    console.error("Error fetching opening stocks:", error);
    return [];
  }
}

export async function saveOpeningStock(entry: Omit<OpeningStockEntry, 'id'>): Promise<void> {
  const id = `opening_${Date.now()}`;
  
  const batch = writeBatch(db);
  batch.set(doc(db, OPENING_STOCK_COL, id), { ...entry, id });

  for (const item of entry.items) {
    batch.update(doc(db, ITEMS_COL, item.item_id), {
      opening_stock: item.qty,
      current_stock: item.qty // reset current stock
    });
    
    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    batch.set(doc(db, TXNS_COL, txnId), {
      id: txnId,
      item_id: item.item_id,
      transaction_type: 'Opening',
      quantity: item.qty,
      amount: item.value,
      date: entry.date
    });
  }

  await batch.commit();
}

export async function updateOpeningStock(id: string, updates: Partial<Omit<OpeningStockEntry, 'id'>>): Promise<void> {
  await updateDoc(doc(db, OPENING_STOCK_COL, id), updates);
}

export async function deleteOpeningStock(id: string): Promise<void> {
  await deleteDoc(doc(db, OPENING_STOCK_COL, id));
}

// --- INVENTORY PERIODS (Legacy compat) ---
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

export async function resetOpeningStock(): Promise<void> {
  const items = await getInventoryItems();
  const now = new Date().toISOString();
  
  const periods = await getInventoryPeriods();
  let start_date = now;
  if (periods.length > 0) {
    start_date = periods[0].end_date;
  } else {
    start_date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  }

  // Fetch all stock counts to find the most recent actual physical count per item
  const allCounts = await getStockCounts();

  const periodItems: InventoryPeriodItem[] = items.map(item => {
    // Find the most recent stock count for this item (ordered desc by count_date)
    const itemCounts = allCounts
      .filter(c => c.item_id === item.id)
      .sort((a, b) => b.count_date.localeCompare(a.count_date));

    // Only use an actual counted value; never use current_stock as a proxy
    const latestCount = itemCounts[0];
    const closingStock = latestCount != null ? latestCount.actual_quantity : null;

    return {
      item_id: item.id,
      item_name: item.item_name,
      category_id: item.category_id,
      unit: item.unit,
      cost_price: item.unit_cost,
      opening_stock: item.opening_stock,
      closing_stock: closingStock as unknown as number  // null means not yet counted
    };
  });

  const periodId = `period_${Date.now()}`;
  
  const batch = writeBatch(db);
  batch.set(doc(db, PERIODS_COL, periodId), {
    id: periodId,
    start_date,
    end_date: now,
    items: periodItems
  });
  
  for (const item of items) {
    batch.update(doc(db, ITEMS_COL, item.id), {
      opening_stock: item.current_stock
    });
    
    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    batch.set(doc(db, TXNS_COL, txnId), {
      id: txnId,
      item_id: item.id,
      transaction_type: 'Opening',
      quantity: item.current_stock,
      amount: item.current_stock * item.unit_cost,
      date: now
    });
  }

  await batch.commit();
}

