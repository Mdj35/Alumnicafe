import { collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface CashCountDenominations {
  '1000'?: number;
  '500'?: number;
  '200'?: number;
  '100'?: number;
  '50'?: number;
  '20'?: number;
  '10'?: number;
  '5'?: number;
  '1'?: number;
  'centavos'?: number;
}

export interface CashCountRecord {
  id: string;
  date: string;        // ISO date string
  time: string;        // formatted time
  cashier: string;
  amount: number;
  totalORAmount?: number;
  denominations?: CashCountDenominations;
}

const CASH_COUNTS_COLLECTION = 'cash_counts';

export async function saveCashCount(record: CashCountRecord): Promise<void> {
  await setDoc(doc(db, CASH_COUNTS_COLLECTION, record.id), record);
}

export async function getCashCounts(): Promise<CashCountRecord[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CASH_COUNTS_COLLECTION));
    const counts: CashCountRecord[] = [];
    querySnapshot.forEach((docSnap) => {
      counts.push(docSnap.data() as CashCountRecord);
    });
    // Sort descending by date
    return counts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error("Error fetching cash counts: ", error);
    return [];
  }
}
