import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where, runTransaction } from 'firebase/firestore';
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
  customerName?: string;
  customerIdNumber?: string;
  status?: 'Completed' | 'Voided';
  paymentMethod?: 'Cash' | 'OR' | 'Online';
  orNumber?: string;
  onlineReference?: string;
}

const TRANSACTIONS_COLLECTION = 'transactions';
const COUNTERS_COLLECTION = 'system';
const TXN_COUNTER_DOC = 'txn_counter';

export async function getNextTxnNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  const counterRef = doc(db, COUNTERS_COLLECTION, TXN_COUNTER_DOC);
  
  try {
    const nextNum = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;
      
      if (!counterDoc.exists()) {
        transaction.set(counterRef, { count: 1, date: dateStr });
      } else {
        const data = counterDoc.data();
        if (data.date === dateStr) {
          newCount = (data.count || 0) + 1;
          transaction.update(counterRef, { count: newCount });
        } else {
          transaction.update(counterRef, { count: 1, date: dateStr });
        }
      }
      return newCount;
    });
    
    return `TXN-${dateStr}-${nextNum.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error("Error generating shared transaction number: ", error);
    // Fallback: random string to prevent overwrite
    return `TXN-${dateStr}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
  }
}

export async function saveTransaction(txn: TransactionRecord): Promise<void> {
  const finalTxn: any = { ...txn, status: txn.status || 'Completed' };
  Object.keys(finalTxn).forEach(key => finalTxn[key] === undefined && delete finalTxn[key]);
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
