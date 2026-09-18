import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface MenuItemIngredient {
  inventoryId: string;
  quantity: number;
}

export interface MenuItem {
  id: number;
  name: string;
  price: number;
  category: string;
  icon: string;
  image?: string; 
  coffeeGrams?: number; 
  milkAmount?: number; 
  ingredients?: MenuItemIngredient[];
  cashier_stock_threshold?: number;
}

const MENU_COLLECTION = 'menu';
const CATEGORY_COLLECTION = 'categories';



export async function getMenuCategories(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORY_COLLECTION));
    if (querySnapshot.empty) {
      return [];
    }
    const categories: string[] = [];
    querySnapshot.forEach((docSnap) => {
      categories.push(docSnap.id);
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function saveMenuCategories(cats: string[]): Promise<void> {
  for (const cat of cats) {
    await setDoc(doc(db, CATEGORY_COLLECTION, cat), { name: cat });
  }
}

export async function addMenuCategory(cat: string): Promise<string[]> {
  await setDoc(doc(db, CATEGORY_COLLECTION, cat), { name: cat });
  return await getMenuCategories();
}

export async function deleteMenuCategory(cat: string): Promise<string[]> {
  await deleteDoc(doc(db, CATEGORY_COLLECTION, cat));
  return await getMenuCategories();
}

export async function getMenuItems(): Promise<MenuItem[]> {
  try {
    const querySnapshot = await getDocs(collection(db, MENU_COLLECTION));
    if (querySnapshot.empty) {
      return [];
    }
    const items: MenuItem[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(docSnap.data() as MenuItem);
    });
    return items.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }
}

export async function saveMenuItems(items: MenuItem[]): Promise<void> {
  for (const item of items) {
    await setDoc(doc(db, MENU_COLLECTION, item.id.toString()), item);
  }
}

export async function addMenuItem(item: Omit<MenuItem, 'id'>): Promise<MenuItem[]> {
  const currentItems = await getMenuItems();
  const newId = currentItems.length > 0 ? Math.max(...currentItems.map(i => i.id)) + 1 : 1;
  const newItem = { ...item, id: newId };
  
  await setDoc(doc(db, MENU_COLLECTION, newId.toString()), newItem);
  return await getMenuItems();
}

export async function updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem[]> {
  await updateDoc(doc(db, MENU_COLLECTION, id.toString()), updates as any);
  return await getMenuItems();
}

export async function deleteMenuItem(id: number): Promise<MenuItem[]> {
  await deleteDoc(doc(db, MENU_COLLECTION, id.toString()));
  return await getMenuItems();
}
