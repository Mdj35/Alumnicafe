import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface CashierAccount {
  id: number;
  name: string;
  username: string;
  role: string;
  password?: string;
  lastLogin?: string;
  isActive?: boolean;
}

const COLLECTION_NAME = 'cashiers';

const DEFAULT_CASHIERS: CashierAccount[] = [
  { id: 1, name: 'Juan Dela Cruz', username: 'juan@alumnicafe', role: 'Senior Cashier', password: '12345' },
  { id: 2, name: 'Maria Santos', username: 'maria@alumnicafe', role: 'Cashier', password: '12345' },
  { id: 3, name: 'Pedro Reyes', username: 'pedro@alumnicafe', role: 'Cashier', password: '12345' },
];

export async function getCashiers(): Promise<CashierAccount[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    if (querySnapshot.empty) {
      // Initialize with default cashiers if empty
      for (const cashier of DEFAULT_CASHIERS) {
        await setDoc(doc(db, COLLECTION_NAME, cashier.id.toString()), cashier);
      }
      return [...DEFAULT_CASHIERS];
    }
    const cashiers: CashierAccount[] = [];
    querySnapshot.forEach((docSnap) => {
      cashiers.push(docSnap.data() as CashierAccount);
    });
    return cashiers.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error fetching cashiers: ", error);
    return [...DEFAULT_CASHIERS]; // fallback
  }
}

export async function addCashier(item: Omit<CashierAccount, 'id'>): Promise<CashierAccount[]> {
  const currentCashiers = await getCashiers();
  const newId = currentCashiers.length > 0 ? Math.max(...currentCashiers.map(i => i.id)) + 1 : 1;
  const newItem = { ...item, id: newId, password: item.password ?? '12345', isActive: true };
  
  await setDoc(doc(db, COLLECTION_NAME, newId.toString()), newItem);
  return await getCashiers();
}

export async function updateCashier(id: number, updates: Partial<CashierAccount>): Promise<CashierAccount[]> {
  const docRef = doc(db, COLLECTION_NAME, id.toString());
  await updateDoc(docRef, updates as any);
  return await getCashiers();
}

export async function deleteCashier(id: number): Promise<CashierAccount[]> {
  const docRef = doc(db, COLLECTION_NAME, id.toString());
  await updateDoc(docRef, { isActive: false });
  return await getCashiers();
}

export async function toggleCashierStatus(id: number, isActive: boolean): Promise<CashierAccount[]> {
  const docRef = doc(db, COLLECTION_NAME, id.toString());
  await updateDoc(docRef, { isActive });
  return await getCashiers();
}

export async function recordCashierLogin(id: number): Promise<void> {
  const now = new Date();
  await updateCashier(id, { 
    lastLogin: now.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + 
               now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true })
  });
}
