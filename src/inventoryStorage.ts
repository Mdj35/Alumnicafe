import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

const INVENTORY_COLLECTION = 'inventory';
const INVENTORY_LOG_COLLECTION = 'inventoryLogs';

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: 'g' | 'ml' | 'pcs';
  location?: 'master' | 'cafe';
}

export type Inventory = InventoryItem[];

const DEFAULT_INVENTORY: Inventory = [
  { id: 'inv_1', name: 'Coffee Beans', quantity: 0, unit: 'g', location: 'cafe' },
  { id: 'inv_2', name: 'Milk', quantity: 0, unit: 'ml', location: 'cafe' }
];

export async function getInventory(): Promise<Inventory> {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_COLLECTION));
    if (querySnapshot.empty) {
      for (const item of DEFAULT_INVENTORY) {
        await setDoc(doc(db, INVENTORY_COLLECTION, item.id), item);
      }
      return [...DEFAULT_INVENTORY];
    }
    const inventory: Inventory = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as InventoryItem;
      if (!data.location) {
        data.location = 'cafe';
      }
      inventory.push(data);
    });
    return inventory.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error("Error fetching inventory: ", error);
    return [...DEFAULT_INVENTORY];
  }
}

export async function saveInventory(inv: Inventory): Promise<void> {
  for (const item of inv) {
    await setDoc(doc(db, INVENTORY_COLLECTION, item.id), item);
  }
}

export async function deleteInventoryItem(id: string): Promise<Inventory> {
  await deleteDoc(doc(db, INVENTORY_COLLECTION, id));
  return await getInventory();
}

export interface InventoryLog {
  id: number;
  date: string;
  time: string;
  stockName: string;
  addedQuantity: number;
  unit: string;
}

export async function getInventoryLogs(): Promise<InventoryLog[]> {
  try {
    const querySnapshot = await getDocs(collection(db, INVENTORY_LOG_COLLECTION));
    const logs: InventoryLog[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as InventoryLog);
    });
    return logs.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error fetching inventory logs: ", error);
    return [];
  }
}

export async function addInventoryLog(log: Omit<InventoryLog, 'id'>): Promise<InventoryLog[]> {
  const currentLogs = await getInventoryLogs();
  const newId = currentLogs.length > 0 ? Math.max(...currentLogs.map(l => l.id)) + 1 : 1;
  const newLog = { ...log, id: newId };
  
  await setDoc(doc(db, INVENTORY_LOG_COLLECTION, newId.toString()), newLog);
  return await getInventoryLogs();
}
