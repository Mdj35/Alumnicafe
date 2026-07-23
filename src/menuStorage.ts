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

const DEFAULT_PRODUCTS: MenuItem[] = [
  { id: 1, name: 'Americano', price: 75, category: 'Coffee', icon: '☕', ingredients: [{ inventoryId: 'inv_1', quantity: 18 }] },
  { id: 2, name: 'Café Latte', price: 95, category: 'Coffee', icon: '🥛', ingredients: [{ inventoryId: 'inv_1', quantity: 18 }, { inventoryId: 'inv_2', quantity: 150 }] },
  { id: 3, name: 'Spanish Latte', price: 115, category: 'Coffee', icon: '☕', ingredients: [{ inventoryId: 'inv_1', quantity: 18 }, { inventoryId: 'inv_2', quantity: 180 }] },
  { id: 4, name: 'Caramel Macchiato', price: 125, category: 'Coffee', icon: '🍮', ingredients: [{ inventoryId: 'inv_1', quantity: 18 }, { inventoryId: 'inv_2', quantity: 160 }] },
];

const DEFAULT_CATEGORIES = ['Coffee'];

export async function getMenuCategories(): Promise<string[]> {
  try {
    const querySnapshot = await getDocs(collection(db, CATEGORY_COLLECTION));
    if (querySnapshot.empty) {
      for (const cat of DEFAULT_CATEGORIES) {
        await setDoc(doc(db, CATEGORY_COLLECTION, cat), { name: cat });
      }
      return [...DEFAULT_CATEGORIES];
    }
    const categories: string[] = [];
    querySnapshot.forEach((docSnap) => {
      categories.push(docSnap.id);
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [...DEFAULT_CATEGORIES];
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
      for (const item of DEFAULT_PRODUCTS) {
        await setDoc(doc(db, MENU_COLLECTION, item.id.toString()), item);
      }
      return [...DEFAULT_PRODUCTS];
    }
    const items: MenuItem[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push(docSnap.data() as MenuItem);
    });
    return items.sort((a, b) => a.id - b.id);
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return [...DEFAULT_PRODUCTS];
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
