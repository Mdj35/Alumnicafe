import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface TransactionRecord {
  id: string;
  date: string;        // ISO date string
  time: string;        // formatted time
  cashier: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    category: string;
  }[];
  subtotal: number;
  discountType: string;
  discountRate: number;
  discountAmount: number;
  vatAmount: number;
  total: number;
  cashTendered: number;
  change: number;
  status?: 'Completed' | 'Voided';
}

const TRANSACTIONS_COLLECTION = 'transactions';

export async function saveTransaction(txn: TransactionRecord): Promise<void> {
  const finalTxn = { ...txn, status: txn.status || 'Completed' };
  await setDoc(doc(db, TRANSACTIONS_COLLECTION, finalTxn.id), finalTxn);
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, TRANSACTIONS_COLLECTION));
    const transactions: TransactionRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      transactions.push(docSnap.data() as TransactionRecord);
    });
    // Sort descending by date
    return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching transactions: ", error);
    return [];
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, TRANSACTIONS_COLLECTION, id));
}

export async function updateTransaction(id: string, updatedTxn: Partial<TransactionRecord>): Promise<void> {
  await updateDoc(doc(db, TRANSACTIONS_COLLECTION, id), updatedTxn as any);
}

export async function getTransactionsForDate(dateStr: string): Promise<TransactionRecord[]> {
  try {
    const all = await getTransactions();
    return all.filter(t => t.date.startsWith(dateStr));
  } catch (error) {
    console.error("Error fetching transactions for date: ", error);
    return [];
  }
}

export async function getTodayTransactions(): Promise<TransactionRecord[]> {
  const today = new Date().toISOString().slice(0, 10);
  return await getTransactionsForDate(today);
}

export async function updateCashierNames(oldName: string, newName: string): Promise<void> {
  try {
    const q = query(collection(db, TRANSACTIONS_COLLECTION), where("cashier", "==", oldName));
    const querySnapshot = await getDocs(q);
    
    for (const document of querySnapshot.docs) {
      await updateDoc(doc(db, TRANSACTIONS_COLLECTION, document.id), { cashier: newName });
    }
  } catch (error) {
    console.error("Error updating cashier names in transactions: ", error);
  }
}
