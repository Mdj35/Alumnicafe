import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  FileText,
  DollarSign,
  Calendar,
  MoreVertical,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  ArrowLeft,
  Clock,
  Shield,
  UtensilsCrossed,
  Edit3,
  Trash2,
  X,
  Save,
  Search,
  ImagePlus,
  BanknoteArrowUp,
  CheckCircle2,
  Printer,
  Receipt,
  Tag,
  Package,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import cafeLogo from './CAFE.jpg';
import * as XLSX from 'xlsx-js-style';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { getMenuItems, saveMenuItems, addMenuItem, updateMenuItem, deleteMenuItem, MenuItem, getMenuCategories, addMenuCategory, deleteMenuCategory } from './menuStorage';
import { getTransactions, TransactionRecord, deleteTransaction, updateTransaction } from './transactions';
import { getCashiers, addCashier, updateCashier, deleteCashier, toggleCashierStatus, CashierAccount } from './cashierStorage';
import { getInventoryItems, InventoryItem } from './inventoryManager';
import InventoryDashboard from './components/inventory/InventoryDashboard';

export default function AdminDashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const isAuth = localStorage.getItem('cashier_auth') === 'true';
    const role = localStorage.getItem('cashier_role');
    if (!isAuth || role !== 'Admin') {
      navigate('/login');
    }
  }, [navigate]);

  const [activeTab, setActiveTab] = useState<'analytics' | 'cashiers' | 'reports' | 'menu' | 'inventory'>('analytics');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'specific' | 'range'>('weekly');
  const [analyticsSpecificDate, setAnalyticsSpecificDate] = useState('');
  const [analyticsSpecificDateEnd, setAnalyticsSpecificDateEnd] = useState('');
  const [time, setTime] = useState(new Date());

  // Menu management state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('All');
  const [formData, setFormData] = useState({ name: '', price: '', category: 'Coffee', icon: '☕', image: '', ingredients: [] as { inventoryId: string, quantity: number }[] });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Transaction state
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [viewingReceipt, setViewingReceipt] = useState<TransactionRecord | null>(null);

  // Cashier state
  const [cashiers, setCashiers] = useState<CashierAccount[]>([]);
  const [showCashierModal, setShowCashierModal] = useState(false);
  const [editingCashier, setEditingCashier] = useState<CashierAccount | null>(null);
  const [cashierForm, setCashierForm] = useState({ name: '', usernamePrefix: '', role: 'Cashier' });

  // Confirmation Modals State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: number | string; type: 'menu' | 'cashier' | 'inventory'; name: string } | null>(null);

  // Report state
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'specific' | 'range'>('daily');
  const [reportDateFilter, setReportDateFilter] = useState('');
  const [reportDateFilterEnd, setReportDateFilterEnd] = useState('');
  const [reportShiftFilter, setReportShiftFilter] = useState('All');
  const [reportCashierFilter, setReportCashierFilter] = useState('All');

  // Inventory state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);
  const [inventoryLogPeriod, setInventoryLogPeriod] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'specific'>('all');
  const [inventorySpecificDate, setInventorySpecificDate] = useState('');
  const [addInventoryForm, setAddInventoryForm] = useState({ name: '', quantity: '', unit: 'g' });
  const [isAddingNewStock, setIsAddingNewStock] = useState(false);
  const [showAddInventoryModal, setShowAddInventoryModal] = useState(false);
  const [addInventoryLocation, setAddInventoryLocation] = useState<'master' | 'cafe'>('master');

  // Inventory edit/delete (password-protected)
  const [showInvAuthModal, setShowInvAuthModal] = useState(false);
  const [invAuthAction, setInvAuthAction] = useState<'edit' | 'delete' | null>(null);
  const [invAuthTarget, setInvAuthTarget] = useState<string | null>(null); // inventory item id
  const [invAuthPassword, setInvAuthPassword] = useState('');
  const [invAuthError, setInvAuthError] = useState(false);
  const [editingInvItem, setEditingInvItem] = useState<{ id: string; name: string; quantity: string; unit: string } | null>(null);
  const [showInvEditModal, setShowInvEditModal] = useState(false);

  // Admin Auth state
  const [showAdminAuthModal, setShowAdminAuthModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [authCallback, setAuthCallback] = useState<{ type: 'void' | 'edit' | 'delete', txn: TransactionRecord } | null>(null);
  const [authError, setAuthError] = useState(false);

  // Edit Transaction state
  const [editingTransaction, setEditingTransaction] = useState<TransactionRecord | null>(null);
  const [editTxnForm, setEditTxnForm] = useState({ total: 0, subtotal: 0, discountAmount: 0, vatAmount: 0, items: [] as any[] });
  const VAT_RATE = 0.12;

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const [m, t, c, cat, i] = await Promise.all([
        getMenuItems(),
        getTransactions(),
        getCashiers(),
        getMenuCategories(),
        getInventoryItems()
      ]);
      if (isMounted) {
        setMenuItems(m);
        setTransactions(t);
        setCashiers(c);
        setCategories(cat);
        setInventory(i);
      }
    };
    loadData();

    const timer = setInterval(() => setTime(new Date()), 1000);
    const refresh = setInterval(loadData, 2000);
    return () => { 
      isMounted = false;
      clearInterval(timer); 
      clearInterval(refresh); 
    };
  }, []);

  // --- Inventory edit/delete handlers ---
  const initiateInvAuth = async (action: 'edit' | 'delete', itemId: string) => {
    if (action === 'delete') {
      const item = inventory.find(i => i.id === itemId);
      if (item) {
        setItemToDelete({ id: item.id, type: 'inventory', name: item.name });
        setShowDeleteConfirm(true);
      }
    } else if (action === 'edit') {
      const item = inventory.find(i => i.id === itemId);
      if (item) {
        setEditingInvItem({ id: item.id, name: item.name, quantity: item.quantity.toString(), unit: item.unit });
        setShowInvEditModal(true);
      }
    }
  };

  const handleInvAuthSubmit = async () => {
    if (invAuthPassword === 'alumnicafeadmin') {
      setShowInvAuthModal(false);
      setInvAuthError(false);
      if (invAuthAction === 'delete' && invAuthTarget) {
        const updated = inventory.filter(i => i.id !== invAuthTarget);
        await saveInventory(updated);
        setInventory(updated);
      } else if (invAuthAction === 'edit' && invAuthTarget) {
        const item = inventory.find(i => i.id === invAuthTarget);
        if (item) {
          setEditingInvItem({ id: item.id, name: item.name, quantity: item.quantity.toString(), unit: item.unit });
          setShowInvEditModal(true);
        }
      }
      setInvAuthAction(null);
      setInvAuthTarget(null);
      setInvAuthPassword('');
    } else {
      setInvAuthError(true);
      setTimeout(() => setInvAuthError(false), 2000);
    }
  };

  const handleSaveInvEdit = async () => {
    if (!editingInvItem) return;
    const newQty = parseFloat(editingInvItem.quantity) || 0;
    const updated = inventory.map(i =>
      i.id === editingInvItem.id
        ? { ...i, name: editingInvItem.name.trim(), quantity: newQty, unit: editingInvItem.unit as 'g' | 'ml' | 'pcs' }
        : i
    );
    await saveInventory(updated);
    setInventory(updated);
    setShowInvEditModal(false);
    setEditingInvItem(null);
  };

  // Menu handlers
  const handleAddInventory = async () => {
    const qty = parseFloat(addInventoryForm.quantity) || 0;
    const name = addInventoryForm.name.trim();
    
    if (qty > 0 && name) {
      const now = new Date();
      const locationLabel = addInventoryLocation === 'master' ? 'Master' : 'Cafe';
      
      // If adding to cafe stock, we must validate against Master Inventory
      if (addInventoryLocation === 'cafe') {
        const masterItem = inventory.find(i => 
          i.name.toLowerCase() === name.toLowerCase() && 
          i.unit === addInventoryForm.unit && 
          i.location === 'master'
        );
        
        if (!masterItem) {
          alert(`This item does not exist in Master Inventory. Please add it to Master Inventory first.`);
          return;
        }
        
        if (qty > masterItem.quantity) {
          alert(`Insufficient stock in Master Inventory! Only ${masterItem.quantity} ${masterItem.unit} of ${masterItem.name} is available.`);
          return;
        }
      }

      const newLogs = await addInventoryLog({
        date: now.toISOString(),
        time: now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }),
        stockName: `${name} (${locationLabel})`,
        addedQuantity: qty,
        unit: addInventoryForm.unit
      });
      setInventoryLogs(newLogs);

      let updated: Inventory = [...inventory];
      
      if (addInventoryLocation === 'cafe') {
        // 1. Deduct from Master Inventory
        const masterItem = inventory.find(i => 
          i.name.toLowerCase() === name.toLowerCase() && 
          i.unit === addInventoryForm.unit && 
          i.location === 'master'
        )!;
        updated = updated.map(i => i.id === masterItem.id ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i);
        
        // 2. Add to Cafe Inventory
        const existingCafeItem = inventory.find(i => 
          i.name.toLowerCase() === name.toLowerCase() && 
          i.unit === addInventoryForm.unit && 
          (i.location || 'cafe') === 'cafe'
        );
        
        if (existingCafeItem) {
          updated = updated.map(i => i.id === existingCafeItem.id ? { ...i, quantity: i.quantity + qty } : i);
        } else {
          const newId = `inv_${Date.now()}`;
          updated = [...updated, { id: newId, name, quantity: qty, unit: addInventoryForm.unit as 'g'|'ml'|'pcs', location: 'cafe' }];
        }
      } else {
        // Adding/stocking Master Inventory
        const existingMasterItem = inventory.find(i => 
          i.name.toLowerCase() === name.toLowerCase() && 
          i.unit === addInventoryForm.unit && 
          i.location === 'master'
        );
        
        if (existingMasterItem) {
          updated = updated.map(i => i.id === existingMasterItem.id ? { ...i, quantity: i.quantity + qty } : i);
        } else {
          const newId = `inv_${Date.now()}`;
          updated = [...updated, { id: newId, name, quantity: qty, unit: addInventoryForm.unit as 'g'|'ml'|'pcs', location: 'master' }];
        }
      }
      
      await saveInventory(updated);
      setInventory(updated);
      setAddInventoryForm({ name: '', quantity: '', unit: 'g' });
      setIsAddingNewStock(false);
      setShowAddInventoryModal(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = async () => {
    if (!formData.name || !formData.price) return;
    const updated = await addMenuItem({
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      icon: formData.icon,
      image: formData.image,
      ingredients: formData.ingredients
    });
    setMenuItems(updated);
    setFormData({ name: '', price: '', category: 'Coffee', icon: '☕', image: '', ingredients: [] });
    setShowAddModal(false);
  };

  const handleEditItem = async () => {
    if (!editingItem || !formData.name || !formData.price) return;
    const updated = await updateMenuItem(editingItem.id, {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      icon: formData.icon,
      image: formData.image,
      ingredients: formData.ingredients
    });
    setMenuItems(updated);
    setEditingItem(null);
    setFormData({ name: '', price: '', category: 'Coffee', icon: '☕', image: '', ingredients: [] });
  };

  const handleDeleteItem = (id: number, name: string) => {
    setItemToDelete({ id, type: 'menu', name });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'menu') {
      const updated = await deleteMenuItem(itemToDelete.id as number);
      setMenuItems(updated);
    } else if (itemToDelete.type === 'cashier') {
      setCashiers(await deleteCashier(itemToDelete.id as number));
    } else if (itemToDelete.type === 'inventory') {
      const updated = await deleteInventoryItem(itemToDelete.id as string);
      setInventory(updated);
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price.toString(),
      category: item.category,
      icon: item.icon,
      image: item.image || '',
      ingredients: item.ingredients ? item.ingredients.map(ing => ({ ...ing })) : []
    });
  };

  const handleAddCat = async () => {
    if (!newCategoryName.trim()) return;
    setCategories(await addMenuCategory(newCategoryName.trim()));
    setNewCategoryName('');
  };

  const handleDeleteCat = async (cat: string) => {
    if (confirm(`Are you sure you want to delete the "${cat}" category?`)) {
      setCategories(await deleteMenuCategory(cat));
      if (menuCategoryFilter === cat) setMenuCategoryFilter('All');
    }
  };

  const handleSaveCashier = async () => {
    if (!cashierForm.name || !cashierForm.usernamePrefix) return;
    const fullUsername = `${cashierForm.usernamePrefix}@alumnicafe`;
    if (editingCashier) {
      setCashiers(await updateCashier(editingCashier.id, { name: cashierForm.name, username: fullUsername, role: cashierForm.role }));
    } else {
      setCashiers(await addCashier({ name: cashierForm.name, username: fullUsername, role: cashierForm.role }));
    }
    setShowCashierModal(false);
    setEditingCashier(null);
    setCashierForm({ name: '', usernamePrefix: '', role: 'Cashier' });
  };

  const openEditCashier = (acc: CashierAccount) => {
    setEditingCashier(acc);
    setCashierForm({
      name: acc.name,
      usernamePrefix: acc.username.split('@')[0],
      role: acc.role
    });
    setShowCashierModal(true);
  };

  const handleToggleCashierStatus = async (id: number, isActive: boolean, name: string) => {
    if (confirm(`Are you sure you want to ${isActive ? 'reactivate' : 'deactivate'} the account for ${name}?`)) {
      setCashiers(await toggleCashierStatus(id, isActive));
    }
  };

  const handleDeleteCashier = (id: number, name: string) => {
    setItemToDelete({ id, type: 'cashier', name });
    setShowDeleteConfirm(true);
  };

  const initiateAdminAuth = (type: 'void' | 'edit' | 'delete', txn: TransactionRecord) => {
    setAuthCallback({ type, txn });
    setAdminPasswordInput('');
    setAuthError(false);
    setShowAdminAuthModal(true);
  };

  const handleAdminAuthSubmit = async () => {
    if (adminPasswordInput === 'alumnicafeadmin') {
      if (!authCallback) return;
      
      if (authCallback.type === 'void') {
        await updateTransaction(authCallback.txn.id, { status: 'Voided' });
        setTransactions(await getTransactions());
      } else if (authCallback.type === 'delete') {
        await deleteTransaction(authCallback.txn.id);
        setTransactions(await getTransactions());
      } else if (authCallback.type === 'edit') {
        setEditingTransaction(authCallback.txn);
        setEditTxnForm({ 
          total: authCallback.txn.total, 
          subtotal: authCallback.txn.subtotal,
          discountAmount: authCallback.txn.discountAmount,
          vatAmount: authCallback.txn.vatAmount,
          items: authCallback.txn.items.map(item => ({ ...item }))
        });
      }
      
      setShowAdminAuthModal(false);
      setAuthCallback(null);
      setAdminPasswordInput('');
      setAuthError(false);
    } else {
      setAuthError(true);
      setTimeout(() => setAuthError(false), 2000);
    }
  };

  const handleSaveEditTransaction = async () => {
    if (!editingTransaction) return;
    await updateTransaction(editingTransaction.id, { 
      total: editTxnForm.total, 
      subtotal: editTxnForm.subtotal,
      discountAmount: editTxnForm.discountAmount,
      vatAmount: editTxnForm.vatAmount,
      items: editTxnForm.items
    });
    setTransactions(await getTransactions());
    setEditingTransaction(null);
  };

  const handleUpdateEditItemQty = (index: number, delta: number) => {
    const updatedItems = [...editTxnForm.items];
    const newQty = Math.max(1, updatedItems[index].quantity + delta);
    updatedItems[index].quantity = newQty;
    
    // Auto-recalculate total based on items
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const discountRate = editingTransaction?.discountRate || 0;
    const newDiscountAmount = newSubtotal * discountRate;
    const taxableAmount = (newSubtotal - newDiscountAmount) / (1 + VAT_RATE);
    const newVatAmount = newSubtotal - newDiscountAmount - taxableAmount;
    const newTotal = newSubtotal - newDiscountAmount;

    setEditTxnForm({ 
      ...editTxnForm, 
      items: updatedItems, 
      total: newTotal,
      subtotal: newSubtotal,
      discountAmount: newDiscountAmount,
      vatAmount: newVatAmount
    });
  };
  const generateXlsxReport = (data: any[]) => {
    // Group transactions by date
    const groupedData: Record<string, any[]> = {};
    data.forEach(txn => {
      if (txn.status === 'Voided') return;
      const txnDate = new Date(txn.date);
      const dateStr = txnDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-');
      if (!groupedData[dateStr]) groupedData[dateStr] = [];
      groupedData[dateStr].push(txn);
    });

    const defaultFont = { name: "Arial", sz: 10 };
    const boldFont = { name: "Arial", sz: 10, bold: true };

    const rows: any[][] = [];
    const merges: any[] = [];
    
    // Header section
    rows.push([{v: 'Holy Cross of Davao College', s: { font: boldFont }}]);
    rows.push([{v: 'Center for Social Communications and Alumni Affairs', s: { font: boldFont }}]);
    rows.push([{v: 'Sta. Ana Avenue, corner C. de Guzman St., Davao City', s: { font: defaultFont }}]);
    rows.push([]);
    rows.push([{v: 'DAILY SALES REPORT', s: { font: boldFont }}]);
    rows.push([{v: 'HCDC Cross Blazers Café', s: { font: defaultFont }}]);
    rows.push([]);

    let startRow = 7;
    const sortedDates = Object.keys(groupedData).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const borderStyle = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
    const headerStyle = {
      font: boldFont,
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: borderStyle
    };
    const cellStyleRight = {
      font: defaultFont,
      alignment: { horizontal: "right", vertical: "center" },
      border: borderStyle
    };
    const cellStyleLeft = {
      font: defaultFont,
      alignment: { horizontal: "left", vertical: "center" },
      border: borderStyle
    };

    const createCell = (value: any, style: any, t?: string, z?: string) => {
      const cell: any = { v: value, s: style };
      if (t) cell.t = t;
      if (z) cell.z = z;
      return cell;
    };

    let maxCashiers = 0;

    sortedDates.forEach((dateStr) => {
      const dailyData = groupedData[dateStr];
      const cashiersInData = Array.from(new Set(dailyData.map(t => t.cashier))).sort();
      maxCashiers = Math.max(maxCashiers, cashiersInData.length);

      const itemStats: Record<string, { price: number, cashiers: Record<string, { qty: number, amnt: number }> }> = {};
      dailyData.forEach(txn => {
        txn.items.forEach((item: any) => {
          if (!itemStats[item.name]) {
            itemStats[item.name] = { price: item.price, cashiers: {} };
          }
          if (!itemStats[item.name].cashiers[txn.cashier]) {
            itemStats[item.name].cashiers[txn.cashier] = { qty: 0, amnt: 0 };
          }
          itemStats[item.name].cashiers[txn.cashier].qty += item.quantity;
          itemStats[item.name].cashiers[txn.cashier].amnt += (item.quantity * item.price);
        });
      });

      const itemNames = Object.keys(itemStats).sort();

      const hr1 = [
        createCell('Café Item', headerStyle),
        createCell('Price', headerStyle),
        createCell(dateStr, headerStyle)
      ];
      for (let i = 0; i < cashiersInData.length * 2 - 1; i++) hr1.push(createCell('', headerStyle));
      hr1.push(createCell('Total Qty and Sales', headerStyle), createCell('', headerStyle));
      rows.push(hr1);

      const hr2 = [createCell('', headerStyle), createCell('', headerStyle)];
      cashiersInData.forEach(c => { 
        hr2.push(createCell(c, headerStyle), createCell('', headerStyle)); 
      });
      hr2.push(createCell('', headerStyle), createCell('', headerStyle));
      rows.push(hr2);

      const hr3 = [createCell('', headerStyle), createCell('', headerStyle)];
      cashiersInData.forEach(() => { 
        hr3.push(createCell('Qty', headerStyle), createCell('Amnt', headerStyle)); 
      });
      hr3.push(createCell('Qty', headerStyle), createCell('Amnt', headerStyle));
      rows.push(hr3);

      let grandTotalQty = 0;
      let grandTotalAmnt = 0;
      const cashierTotals: Record<string, {qty: number, amnt: number}> = {};
      cashiersInData.forEach(c => cashierTotals[c] = {qty: 0, amnt: 0});

      itemNames.forEach(itemName => {
        const stats = itemStats[itemName];
        const row = [
          createCell(itemName, cellStyleLeft),
          createCell(stats.price, cellStyleRight, 'n', '#,##0.00')
        ];
        let itemTotalQty = 0;
        let itemTotalAmnt = 0;

        cashiersInData.forEach(c => {
          const cStats = stats.cashiers[c] || { qty: 0, amnt: 0 };
          row.push(createCell(cStats.qty || 0, cellStyleRight, 'n', '0.00'));
          row.push(createCell(cStats.amnt || 0, cellStyleRight, 'n', '#,##0.00'));
          itemTotalQty += cStats.qty;
          itemTotalAmnt += cStats.amnt;
          cashierTotals[c].qty += cStats.qty;
          cashierTotals[c].amnt += cStats.amnt;
        });

        row.push(createCell(itemTotalQty, cellStyleRight, 'n', '0.00'));
        row.push(createCell(itemTotalAmnt, cellStyleRight, 'n', '#,##0.00'));
        grandTotalQty += itemTotalQty;
        grandTotalAmnt += itemTotalAmnt;
        rows.push(row);
      });

      const totalRow: any[] = [
        createCell('', { font: defaultFont, border: borderStyle }),
        createCell('', { font: defaultFont, border: borderStyle })
      ];
      cashiersInData.forEach(c => {
        totalRow.push(createCell(cashierTotals[c].qty, cellStyleRight, 'n', '0.00'));
        totalRow.push(createCell(cashierTotals[c].amnt, cellStyleRight, 'n', '#,##0.00'));
      });
      totalRow.push(createCell(grandTotalQty, cellStyleRight, 'n', '0.00'));
      totalRow.push(createCell(grandTotalAmnt, { ...cellStyleRight, font: boldFont }, 'n', '#,##0.00'));
      rows.push(totalRow);

      merges.push(
        { s: { r: startRow, c: 0 }, e: { r: startRow + 2, c: 0 } },
        { s: { r: startRow, c: 1 }, e: { r: startRow + 2, c: 1 } },
        { s: { r: startRow, c: 2 }, e: { r: startRow, c: 1 + cashiersInData.length * 2 } },
        { s: { r: startRow, c: 2 + cashiersInData.length * 2 }, e: { r: startRow + 1, c: 3 + cashiersInData.length * 2 } }
      );

      cashiersInData.forEach((c, i) => {
        merges.push({ s: { r: startRow + 1, c: 2 + i * 2 }, e: { r: startRow + 1, c: 3 + i * 2 } });
      });

      startRow += 3 + itemNames.length + 1 + 2; 
      rows.push([]);
      rows.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!merges'] = merges;

    const wscols = [{ wch: 25 }, { wch: 10 }];
    for (let i = 0; i < maxCashiers * 2; i++) wscols.push({ wch: 12 });
    wscols.push({ wch: 12 }, { wch: 15 });
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Report");
    
    let periodStr = reportPeriod;
    if (reportPeriod === 'specific') {
      periodStr = reportDateFilter ? new Date(reportDateFilter).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : 'all';
    } else if (reportPeriod === 'range') {
      periodStr = (reportDateFilter && reportDateFilterEnd)
        ? `${new Date(reportDateFilter).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}_to_${new Date(reportDateFilterEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-')}`
        : reportDateFilter ? new Date(reportDateFilter).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-') : 'all';
    }

    XLSX.writeFile(wb, `AlumniCafe_Sales_${periodStr}.xlsx`);
  };

  const generateCsvReport = (data: Record<string, any>[]) => {
    console.log("Generating CSV report...", data);
    // Implementation for CSV generation goes here
  };

  const handleReportExport = (
    reportType: 'daily' | 'weekly' | 'monthly',
    reportData: Record<string, any>[]
  ): void => {
    if (reportType === 'daily' || reportType === 'weekly') {
      generateXlsxReport(reportData);
    } else if (reportType === 'monthly') {
      generateCsvReport(reportData);
    }
  };

  const exportCSV = () => {
    const headers = ['Transaction ID', 'Date', 'Time', 'Cashier', 'Customer Name', 'ID No.', 'Subtotal', 'VAT', 'Discount', 'Total', 'Cash', 'Change'];
    const rows = sortedTransactions.map(t => [
      t.id,
      t.date.split('T')[0],
      t.time,
      t.cashier,
      t.customerName || 'N/A',
      t.customerIdNumber || 'N/A',
      t.subtotal,
      t.vatAmount,
      t.discountAmount,
      t.total,
      t.cashTendered,
      t.change
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    let periodStr = reportPeriod;
    if (reportPeriod === 'specific') {
      periodStr = reportDateFilter || 'all';
    } else if (reportPeriod === 'range') {
      periodStr = (reportDateFilter && reportDateFilterEnd) ? `${reportDateFilter}_to_${reportDateFilterEnd}` : (reportDateFilter || 'all');
    }
    link.download = `alumnicafe_sales_${periodStr}.csv`;
    link.click();
  };

  const filteredInventoryLogs = useMemo(() => {
    const now = new Date();
    return inventoryLogs.filter(log => {
      if (inventoryLogPeriod === 'all') return true;
      const tDate = new Date(log.date);
      if (inventoryLogPeriod === 'daily') {
        return log.date.startsWith(now.toISOString().slice(0, 10));
      } else if (inventoryLogPeriod === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return tDate >= weekAgo;
      } else if (inventoryLogPeriod === 'monthly') {
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (inventoryLogPeriod === 'specific') {
        return inventorySpecificDate ? log.date.startsWith(inventorySpecificDate) : true;
      }
      return true;
    });
  }, [inventoryLogs, inventoryLogPeriod, inventorySpecificDate]);

  const exportInventoryCSV = () => {
    const headers = ['Log ID', 'Date', 'Time', 'Stock Name', 'Added Quantity', 'Unit'];
    const rows = [...filteredInventoryLogs].sort((a, b) => b.id - a.id).map(log => {
      return [
        log.id.toString(),
        log.date.split('T')[0],
        log.time,
        log.stockName,
        log.addedQuantity.toString(),
        log.unit
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `alumnicafe_inventory_log_${inventoryLogPeriod === 'specific' ? inventorySpecificDate : inventoryLogPeriod}.csv`;
    link.click();
  };

  const filteredMenu = menuItems.filter(item => {
    const matchesCat = menuCategoryFilter === 'All' || item.category === menuCategoryFilter;
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const formatDate = (date: Date) => date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  const formatTime = (date: Date) => date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

  // Filter transactions based on period
  const { filteredTransactions, previousTransactions } = useMemo(() => {
    const now = new Date();
    
    const curr = transactions.filter(t => {
      if (t.status === 'Voided') return false;
      const tDate = new Date(t.date);
      if (analyticsPeriod === 'daily') {
        return t.date.startsWith(now.toISOString().slice(0, 10));
      } else if (analyticsPeriod === 'weekly') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return tDate >= weekAgo;
      } else if (analyticsPeriod === 'monthly') {
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      } else if (analyticsPeriod === 'specific') {
        return analyticsSpecificDate ? t.date.startsWith(analyticsSpecificDate) : true;
      } else if (analyticsPeriod === 'range') {
        if (analyticsSpecificDate && analyticsSpecificDateEnd) {
          const start = new Date(analyticsSpecificDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(analyticsSpecificDateEnd);
          end.setHours(23, 59, 59, 999);
          return tDate >= start && tDate <= end;
        } else if (analyticsSpecificDate) {
          return t.date.startsWith(analyticsSpecificDate);
        } else if (analyticsSpecificDateEnd) {
          return t.date.startsWith(analyticsSpecificDateEnd);
        }
        return true;
      }
      return true;
    });

    const prev = transactions.filter(t => {
      if (t.status === 'Voided') return false;
      const tDate = new Date(t.date);
      if (analyticsPeriod === 'daily') {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return t.date.startsWith(yesterday.toISOString().slice(0, 10));
      } else if (analyticsPeriod === 'weekly') {
        const twoWeeksAgo = new Date();
        twoWeeksAgo.setDate(now.getDate() - 14);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return tDate >= twoWeeksAgo && tDate < oneWeekAgo;
      } else if (analyticsPeriod === 'monthly') {
        let prevMonth = now.getMonth() - 1;
        let prevYear = now.getFullYear();
        if (prevMonth < 0) {
          prevMonth = 11;
          prevYear--;
        }
        return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
      } else if (analyticsPeriod === 'specific') {
        if (analyticsSpecificDate) {
          const specific = new Date(analyticsSpecificDate);
          specific.setDate(specific.getDate() - 1);
          return t.date.startsWith(specific.toISOString().slice(0, 10));
        }
      } else if (analyticsPeriod === 'range') {
        if (analyticsSpecificDate && analyticsSpecificDateEnd) {
          const start = new Date(analyticsSpecificDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(analyticsSpecificDateEnd);
          end.setHours(23, 59, 59, 999);
          
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          const prevStart = new Date(start);
          prevStart.setDate(prevStart.getDate() - diffDays - 1);
          const prevEnd = new Date(start);
          prevEnd.setDate(prevEnd.getDate() - 1);
          prevEnd.setHours(23, 59, 59, 999);
          
          return tDate >= prevStart && tDate <= prevEnd;
        }
      }
      return false;
    });

    return { filteredTransactions: curr, previousTransactions: prev };
  }, [transactions, analyticsPeriod, analyticsSpecificDate, analyticsSpecificDateEnd]);

  // Calculate KPIs dynamically
  const totalSalesPeriod = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const totalOrdersPeriod = filteredTransactions.length;
  const avgOrderValue = totalOrdersPeriod > 0 ? totalSalesPeriod / totalOrdersPeriod : 0;

  const prevTotalSales = previousTransactions.reduce((sum, t) => sum + t.total, 0);
  const prevTotalOrders = previousTransactions.length;
  const prevAvgOrderValue = prevTotalOrders > 0 ? prevTotalSales / prevTotalOrders : 0;

  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) {
      if (current === 0) return { trend: '0.0%', up: true };
      return { trend: `+${current > 1000 ? (current/1000).toFixed(1)+'k' : current.toFixed(0)}%`, up: true };
    }
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return {
      trend: `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`,
      up: percentage >= 0
    };
  };

  const salesTrend = calculateTrend(totalSalesPeriod, prevTotalSales);
  const ordersTrend = calculateTrend(totalOrdersPeriod, prevTotalOrders);
  const avgOrderTrend = calculateTrend(avgOrderValue, prevAvgOrderValue);

  // Calculate Revenue Trends
  const trendData = useMemo(() => {
    if (analyticsPeriod === 'daily' || analyticsPeriod === 'specific' || analyticsPeriod === 'range') {
      const hourBuckets = Array.from({ length: 14 }, (_, i) => {
        const hour = i + 7; // 7 AM to 8 PM
        const displayHour = hour > 12 ? `${hour - 12} PM` : hour === 12 ? '12 PM' : `${hour} AM`;
        return { name: displayHour, sales: 0, orders: 0 };
      });
      filteredTransactions.forEach(t => {
        const isPM = t.time.includes('PM');
        const hourStr = t.time.split(':')[0];
        let hour = parseInt(hourStr, 10);
        if (isPM && hour !== 12) hour += 12;
        if (!isPM && hour === 12) hour = 0;

        const bucketIndex = hour - 7;
        if (bucketIndex >= 0 && bucketIndex < hourBuckets.length) {
          hourBuckets[bucketIndex].sales += t.total;
          hourBuckets[bucketIndex].orders += 1;
        }
      });
      return hourBuckets;
    } else if (analyticsPeriod === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weekBuckets = days.map(day => ({ name: day, sales: 0, orders: 0 }));
      filteredTransactions.forEach(t => {
        const tDate = new Date(t.date);
        weekBuckets[tDate.getDay()].sales += t.total;
        weekBuckets[tDate.getDay()].orders += 1;
      });
      return weekBuckets;
    } else {
      const monthBuckets = [
        { name: 'Week 1', sales: 0, orders: 0 },
        { name: 'Week 2', sales: 0, orders: 0 },
        { name: 'Week 3', sales: 0, orders: 0 },
        { name: 'Week 4', sales: 0, orders: 0 }
      ];
      filteredTransactions.forEach(t => {
        const tDate = new Date(t.date);
        const date = tDate.getDate();
        const week = Math.min(Math.floor((date - 1) / 7), 3);
        monthBuckets[week].sales += t.total;
        monthBuckets[week].orders += 1;
      });
      return monthBuckets;
    }
  }, [filteredTransactions, analyticsPeriod]);

  // Calculate Category Sales
  const categoryData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    let grandTotal = 0;

    filteredTransactions.forEach(txn => {
      txn.items.forEach(item => {
        const itemTotal = item.price * item.quantity;
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + itemTotal;
        grandTotal += itemTotal;
      });
    });

    if (grandTotal === 0) return [];

    return Object.entries(categoryTotals)
      .map(([name, val]) => ({ name, value: Math.round((val / grandTotal) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // Calculate Product Ranking
  const productRanking = useMemo(() => {
    const counts: Record<string, { quantity: number; revenue: number; category: string }> = {};

    filteredTransactions.forEach(txn => {
      txn.items.forEach(item => {
        if (!counts[item.name]) {
          counts[item.name] = { quantity: 0, revenue: 0, category: item.category };
        }
        counts[item.name].quantity += item.quantity;
        counts[item.name].revenue += item.quantity * item.price;
      });
    });

    return Object.entries(counts)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [filteredTransactions]);

  // Sort and filter transactions for the reports table
  let filteredReports = transactions;
  const now = new Date();

  filteredReports = filteredReports.filter(t => {
    const tDate = new Date(t.date);
    if (reportPeriod === 'daily') {
      return t.date.startsWith(now.toISOString().slice(0, 10));
    } else if (reportPeriod === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return tDate >= weekAgo;
    } else if (reportPeriod === 'monthly') {
      return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
    } else if (reportPeriod === 'specific') {
      return reportDateFilter ? t.date.startsWith(reportDateFilter) : true;
    } else if (reportPeriod === 'range') {
      if (reportDateFilter && reportDateFilterEnd) {
        const start = new Date(reportDateFilter);
        start.setHours(0, 0, 0, 0);
        const end = new Date(reportDateFilterEnd);
        end.setHours(23, 59, 59, 999);
        return tDate >= start && tDate <= end;
      } else if (reportDateFilter) {
        return t.date.startsWith(reportDateFilter);
      } else if (reportDateFilterEnd) {
        return t.date.startsWith(reportDateFilterEnd);
      }
      return true;
    }
    return true;
  });
  
  if (reportShiftFilter !== 'All') {
    filteredReports = filteredReports.filter(t => {
      const d = new Date(t.date);
      const hour = d.getHours();
      const minutes = d.getMinutes();
      const totalMinutes = hour * 60 + minutes;
      
      if (reportShiftFilter === 'Shift 1') {
        return totalMinutes >= 420 && totalMinutes < 760; // 7:00 AM - 12:40 PM
      } else if (reportShiftFilter === 'Shift 2') {
        return totalMinutes >= 760 && totalMinutes < 1100; // 12:40 PM - 6:20 PM
      } else if (reportShiftFilter === 'Shift 3') {
        return totalMinutes >= 1100 || totalMinutes < 420; // 6:20 PM - 12:00 MN
      }
      return true;
    });
  }

  if (reportCashierFilter !== 'All') {
    filteredReports = filteredReports.filter(t => t.cashier === reportCashierFilter);
  }
  
  const sortedTransactions = [...filteredReports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCashiersCount = cashiers.length;

  return (
    <div className="flex flex-col h-screen select-none print:block print:h-auto print:bg-white">
      {/* Admin Header */}
      <header className="no-print h-20 bg-gradient-to-r from-hcdc-blue to-hcdc-blue-dark flex items-center justify-between px-10 text-white shadow-xl shrink-0 z-20">
        <div className="flex items-center gap-5">
          <Link to="/" className="flex items-center gap-3 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all border border-white/10">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider">POS Terminal</span>
          </Link>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-xl shadow-lg">
              <Shield className="w-5 h-5 text-hcdc-blue" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl leading-tight tracking-tight">Admin Dashboard</h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-hcdc-gold font-semibold">AlumniCafe Management</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
          <Clock className="w-4 h-4 text-hcdc-gold" />
          <span className="text-sm font-semibold tabular-nums tracking-wide">
            {formatDate(time)} <span className="mx-2 opacity-30">|</span> {formatTime(time)}
          </span>
        </div>
      </header>

      <div className="no-print flex-1 bg-[#F9FAFB] p-10 flex flex-col overflow-hidden">
        {/* Admin Header */}
        <div className="flex justify-between items-end mb-8 shrink-0">
          <div>
            <h2 className="text-3xl font-black text-hcdc-blue tracking-tight">Admin Dashboard</h2>
            <p className="text-gray-500 font-medium mt-1">Overview, performance, and management.</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                }`}
            >
              <TrendingUp className="w-4 h-4" /> Analytics & Trends
            </button>
            <button
              onClick={() => setActiveTab('cashiers')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'cashiers' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                }`}
            >
              <Users className="w-4 h-4" /> Cashier Accounts
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'reports' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                }`}
            >
              <FileText className="w-4 h-4" /> Sales Report
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'menu' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                }`}
            >
              <UtensilsCrossed className="w-4 h-4" /> Menu Items
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'inventory' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                }`}
            >
              <Package className="w-4 h-4" /> Inventory
            </button>
          </div>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar -mr-4 pb-10">

          {/* --- ANALYTICS TAB --- */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {/* Global Analytics Filter */}
              <div className="flex justify-end mb-2 gap-3 items-center">
                {analyticsPeriod === 'specific' && (
                  <div className="flex items-center">
                    <input
                      type="date"
                      value={analyticsSpecificDate}
                      onChange={(e) => setAnalyticsSpecificDate(e.target.value)}
                      className="bg-white border-2 border-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none h-[42px]"
                    />
                  </div>
                )}
                {analyticsPeriod === 'range' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={analyticsSpecificDate}
                      onChange={(e) => setAnalyticsSpecificDate(e.target.value)}
                      className="bg-white border-2 border-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none h-[42px]"
                    />
                    <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">to</span>
                    <input
                      type="date"
                      value={analyticsSpecificDateEnd}
                      onChange={(e) => setAnalyticsSpecificDateEnd(e.target.value)}
                      className="bg-white border-2 border-gray-100 text-gray-600 px-4 py-2.5 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none h-[42px]"
                    />
                  </div>
                )}
                <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                  {(['daily', 'weekly', 'monthly', 'specific', 'range'] as const).map(period => (
                    <button
                      key={period}
                      onClick={() => setAnalyticsPeriod(period)}
                      className={`px-8 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${analyticsPeriod === period ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-400 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                        }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-4 gap-6">
                {[
                  { label: `Total Sales (${analyticsPeriod})`, value: `₱ ${totalSalesPeriod.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: salesTrend.trend, up: salesTrend.up, icon: <BanknoteArrowUp className="w-6 h-6 text-hcdc-blue" /> },
                  { label: `Total Orders (${analyticsPeriod})`, value: totalOrdersPeriod.toString(), trend: ordersTrend.trend, up: ordersTrend.up, icon: <FileText className="w-6 h-6 text-hcdc-gold" /> },
                  { label: 'Avg Order Value', value: `₱ ${avgOrderValue.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, trend: avgOrderTrend.trend, up: avgOrderTrend.up, icon: <TrendingUp className="w-6 h-6 text-hcdc-red" /> },
                  { label: 'Total Cashiers', value: totalCashiersCount.toString(), trend: '0%', up: true, icon: <Users className="w-6 h-6 text-purple-600" /> },
                ].map((kpi, i) => (
                  <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-all group">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                        {kpi.icon}
                      </div>
                      <div className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${kpi.up ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100'}`}>
                        {kpi.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {kpi.trend}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-gray-800 tracking-tight">{kpi.value}</h3>
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">{kpi.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-3 gap-6">
                {/* Main Trend Chart */}
                <div className="col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-lg font-black text-gray-800">Revenue Trends</h3>
                      <p className="text-xs text-gray-500 font-medium">Sales performance over time</p>
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1A3A6B" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#1A3A6B" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} />
                        <Tooltip
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }}
                          labelStyle={{ fontWeight: 800, color: '#1f2937', marginBottom: '4px' }}
                        />
                        <Area type="monotone" dataKey="orders" stroke="#1A3A6B" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                  <div className="mb-8">
                    <h3 className="text-lg font-black text-gray-800">Sales by Category</h3>
                    <p className="text-xs text-gray-500 font-medium">Distribution of revenue</p>
                  </div>
                  <div className="flex-1 flex flex-col justify-center gap-4">
                    {categoryData.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center">No sales data available yet.</p>
                    ) : (
                      categoryData.map((cat, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between text-sm font-bold">
                            <span className="text-gray-700">{cat.name}</span>
                            <span className="text-hcdc-blue">{cat.value}%</span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${cat.value}%`,
                                backgroundColor: i === 0 ? '#1A3A6B' : i === 1 ? '#E8A020' : i === 2 ? '#C0282A' : '#9ca3af'
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Product Ranking Section */}
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                <div className="mb-8 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-black text-gray-800">Top Selling Products</h3>
                    <p className="text-xs text-gray-500 font-medium">Performance ranking based on units sold</p>
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="px-4 py-2 bg-hcdc-light-blue rounded-xl text-hcdc-blue text-[10px] font-black uppercase tracking-widest">
                      Items: {productRanking.length}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {productRanking.slice(0, 9).map((product, i) => (
                    <motion.div
                      key={product.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-hcdc-blue/20 hover:bg-white hover:shadow-md transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-gray-800 text-sm truncate">{product.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-hcdc-blue">{product.quantity} sold</p>
                        <p className="text-[10px] font-bold text-hcdc-red italic">₱{product.revenue.toLocaleString()}</p>
                      </div>
                    </motion.div>
                  ))}
                  {productRanking.length === 0 && (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-gray-400 font-medium">No sales data available yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- CASHIERS TAB --- */}
          {activeTab === 'cashiers' && (
            <div className="space-y-8">
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h3 className="text-xl font-black text-gray-800">Manage Accounts</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Add, edit, or disable cashier access.</p>
                </div>
                <button onClick={() => setShowCashierModal(true)} className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
                  <Plus className="w-4 h-4" /> Add Cashier
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                      <th className="p-6 font-black">Name</th>
                      <th className="p-6 font-black">Username</th>
                      <th className="p-6 font-black">Role</th>
                      <th className="p-6 font-black">Status</th>
                      <th className="p-6 font-black">Last Login</th>
                      <th className="p-6 font-black text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cashiers.map((acc) => (
                      <tr key={acc.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-hcdc-light-blue text-hcdc-blue flex items-center justify-center font-black">
                              {acc.name.charAt(0)}
                            </div>
                            <span className="font-bold text-gray-800">{acc.name}</span>
                          </div>
                        </td>
                        <td className="p-6 font-mono text-sm text-gray-500">{acc.username}</td>
                        <td className="p-6">
                          <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
                            {acc.role}
                          </span>
                        </td>
                        <td className="p-6">
                          <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-lg ${acc.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {acc.isActive !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="p-6">
                          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            {acc.lastLogin || 'Never logged in'}
                          </span>
                        </td>

                        <td className="p-6 text-right flex justify-end gap-2 transition-opacity">
                          <button onClick={() => openEditCashier(acc)} className="p-2 text-hcdc-blue bg-hcdc-light-blue hover:bg-hcdc-blue hover:text-white rounded-xl transition-all" title="Edit">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {acc.isActive !== false ? (
                            <button onClick={() => handleToggleCashierStatus(acc.id, false, acc.name)} className="p-2 text-orange-500 bg-orange-50 hover:bg-orange-500 hover:text-white rounded-xl transition-all" title="Deactivate">
                              <Minus className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => handleToggleCashierStatus(acc.id, true, acc.name)} className="p-2 text-green-500 bg-green-50 hover:bg-green-500 hover:text-white rounded-xl transition-all" title="Reactivate">
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>


            </div>
          )}

          {/* --- SALES REPORT TAB --- */}
          {activeTab === 'reports' && (
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50 shrink-0">
                <div>
                  <h3 className="text-xl font-black text-gray-800">Transaction History</h3>
                  <p className="text-xs text-gray-500 font-medium mt-1">Detailed log of all sales.</p>
                </div>
                <div className="flex gap-3 items-center">
                  <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    {(['daily', 'weekly', 'monthly', 'specific', 'range'] as const).map(period => (
                      <button
                        key={period}
                        onClick={() => setReportPeriod(period)}
                        className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${reportPeriod === period ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-400 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
                          }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>

                  {reportPeriod === 'specific' && (
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        value={reportDateFilter}
                        onChange={(e) => setReportDateFilter(e.target.value)}
                        className="bg-white border-2 border-gray-100 text-gray-600 pl-10 pr-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none"
                      />
                    </div>
                  )}

                  {reportPeriod === 'range' && (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          value={reportDateFilter}
                          onChange={(e) => setReportDateFilter(e.target.value)}
                          className="bg-white border-2 border-gray-100 text-gray-600 pl-10 pr-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none"
                        />
                      </div>
                      <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">to</span>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Calendar className="w-4 h-4 text-gray-400" />
                        </div>
                        <input
                          type="date"
                          value={reportDateFilterEnd}
                          onChange={(e) => setReportDateFilterEnd(e.target.value)}
                          className="bg-white border-2 border-gray-100 text-gray-600 pl-10 pr-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none"
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Clock className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                      value={reportShiftFilter}
                      onChange={(e) => setReportShiftFilter(e.target.value)}
                      className="bg-white border-2 border-gray-100 text-gray-600 pl-10 pr-8 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none appearance-none"
                    >
                      <option value="All">All Shifts</option>
                      <option value="Shift 1">Shift 1 (7:00 AM - 12:40 PM)</option>
                      <option value="Shift 2">Shift 2 (12:40 PM - 6:20 PM)</option>
                      <option value="Shift 3">Shift 3 (6:20 PM - 12:00 MN)</option>
                    </select>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="w-4 h-4 text-gray-400" />
                    </div>
                    <select
                      value={reportCashierFilter}
                      onChange={(e) => setReportCashierFilter(e.target.value)}
                      className="bg-white border-2 border-gray-100 text-gray-600 pl-10 pr-8 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue focus:ring-0 transition-colors shadow-sm outline-none appearance-none"
                    >
                      <option value="All">All Cashiers</option>
                      {Array.from(new Set(transactions.map(t => t.cashier))).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => handleReportExport('daily', sortedTransactions)}
                    disabled={sortedTransactions.length === 0}
                    className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download className="w-4 h-4" /> Export XLSX
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
                    <tr className="border-b border-gray-100 text-[10px] uppercase tracking-widest text-gray-400 font-black">
                      <th className="p-6 font-black">Transaction ID</th>
                      <th className="p-6 font-black">Date</th>
                      <th className="p-6 font-black">Time</th>
                      <th className="p-6 font-black">Cashier</th>
                      <th className="p-6 font-black text-right">Amount</th>
                      <th className="p-6 font-black text-center">Status</th>
                      <th className="p-6 font-black text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sortedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-10 text-center text-gray-400 font-medium">No transactions yet.</td>
                      </tr>
                    ) : (
                      sortedTransactions.map((txn, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                          <td className="p-6 font-mono text-sm font-bold text-hcdc-blue">{txn.id}</td>
                          <td className="p-6 text-sm font-bold text-gray-700">{txn.date.split('T')[0]}</td>
                          <td className="p-6 text-sm text-gray-500 font-medium">{txn.time}</td>
                          <td className="p-6 text-sm font-bold text-gray-700">{txn.cashier}</td>
                          <td className="p-6 text-right font-black text-gray-800">
                            ₱ {txn.total.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-6 text-center">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg inline-block ${
                              txn.status === 'Voided' ? 'text-red-700 bg-red-100' : 'text-green-700 bg-green-100'
                            }`}>
                              {txn.status || 'Completed'}
                            </span>
                          </td>
                          <td className="p-6 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setViewingReceipt(txn)}
                                className="p-2 bg-gray-50 hover:bg-hcdc-light-blue text-hcdc-blue rounded-lg transition-colors"
                                title="View Receipt"
                              >
                                <Receipt className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => initiateAdminAuth('edit', txn)}
                                className="p-2 bg-gray-50 hover:bg-hcdc-gold/20 text-hcdc-gold rounded-lg transition-colors"
                                title="Edit Transaction"
                                disabled={txn.status === 'Voided'}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => initiateAdminAuth('void', txn)}
                                className="p-2 bg-gray-50 hover:bg-red-50 text-hcdc-red rounded-lg transition-colors"
                                title="Void Transaction"
                                disabled={txn.status === 'Voided'}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- MENU MANAGEMENT TAB --- */}
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm flex-1 max-w-md">
                    <Search className="w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search menu items..."
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full"
                    />
                  </div>
                  <div className="flex bg-white p-1 rounded-xl border border-gray-100 shadow-sm overflow-x-auto max-w-full no-scrollbar">
                    <button
                      onClick={() => setMenuCategoryFilter('All')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${menuCategoryFilter === 'All' ? 'bg-hcdc-blue text-white' : 'text-gray-400 hover:text-gray-700'}`}
                    >All</button>
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setMenuCategoryFilter(cat)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ${menuCategoryFilter === cat ? 'bg-hcdc-blue text-white' : 'text-gray-400 hover:text-gray-700'}`}
                      >{cat}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCategoryManager(true)}
                    className="bg-hcdc-gold text-hcdc-blue px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-[#D4921C] transition-colors shadow-md"
                  >
                    <Tag className="w-4 h-4" /> Categories
                  </button>
                  <button
                    onClick={() => { setShowAddModal(true); setEditingItem(null); setFormData({ name: '', price: '', category: categories[0] || 'Coffee', icon: '☕', image: '', ingredients: [] }); }}
                    className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>
              </div>

              {/* Menu Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {filteredMenu.map((item) => (
                  <div key={item.id} className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all group relative">
                    <div className="flex flex-col items-center text-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-hcdc-light-blue flex items-center justify-center overflow-hidden">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-3xl">{item.icon}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-sm leading-snug">{item.name}</h3>
                        <p className="text-hcdc-red font-black text-lg mt-1 tracking-tight">₱{item.price.toFixed(2)}</p>
                      </div>
                      <span className="px-3 py-1 bg-gray-50 text-gray-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                    {/* Action buttons */}
                    <div className="absolute top-4 right-4 flex gap-1.5 transition-opacity">
                      <button
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-full bg-hcdc-light-blue text-hcdc-blue flex items-center justify-center hover:bg-hcdc-blue hover:text-white transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.name)}
                        className="w-8 h-8 rounded-full bg-red-50 text-hcdc-red flex items-center justify-center hover:bg-hcdc-red hover:text-white transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-center text-xs text-gray-400 font-medium">Showing {filteredMenu.length} of {menuItems.length} items</p>
            </div>
          )}

          {/* --- INVENTORY TAB --- */}
          {activeTab === 'inventory' && (
            <div className="h-full">
              <InventoryDashboard />
            </div>
          )}

        </div>
      </div>

      {/* INVENTORY ADMIN AUTH MODAL */}
      <AnimatePresence>
        {showInvAuthModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-hcdc-blue p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-hcdc-gold" />
                </div>
                <h3 className="text-xl font-black">Admin Authentication</h3>
                <p className="text-sm text-white/60 mt-1 uppercase tracking-widest font-bold">
                  Required to {invAuthAction} ingredient
                </p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Admin Password</label>
                  <input
                    type="password"
                    autoFocus
                    value={invAuthPassword}
                    onChange={(e) => setInvAuthPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleInvAuthSubmit()}
                    className={`w-full h-14 px-6 bg-gray-50 border-2 rounded-2xl font-bold text-center text-xl transition-all focus:ring-0 ${
                      invAuthError ? 'border-hcdc-red bg-red-50' : 'border-transparent focus:border-hcdc-blue focus:bg-white'
                    }`}
                    placeholder="••••••••"
                  />
                  {invAuthError && (
                    <p className="text-hcdc-red text-[10px] font-black uppercase tracking-widest text-center mt-3 animate-pulse">Incorrect Password</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowInvAuthModal(false); setInvAuthAction(null); setInvAuthTarget(null); setInvAuthPassword(''); }}
                    className="flex-1 h-12 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleInvAuthSubmit}
                    className="flex-1 h-12 bg-hcdc-blue text-white font-bold rounded-xl hover:bg-hcdc-blue-dark shadow-lg shadow-hcdc-blue/20 transition-all"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVENTORY EDIT MODAL */}
      <AnimatePresence>
        {showInvEditModal && editingInvItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-hcdc-blue p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">Edit Ingredient</h3>
                  <p className="text-2xl font-black tracking-tight">{editingInvItem.name}</p>
                </div>
                <button
                  onClick={() => { setShowInvEditModal(false); setEditingInvItem(null); }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Name</label>
                  <input
                    type="text"
                    value={editingInvItem.name}
                    onChange={(e) => setEditingInvItem({ ...editingInvItem, name: e.target.value })}
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-xl font-bold transition-all focus:ring-0"
                    placeholder="e.g. Coffee Beans"
                  />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Quantity</label>
                    <input
                      type="number"
                      value={editingInvItem.quantity}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, quantity: e.target.value })}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-xl font-bold transition-all focus:ring-0"
                      placeholder="0"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Unit</label>
                    <select
                      value={editingInvItem.unit}
                      onChange={(e) => setEditingInvItem({ ...editingInvItem, unit: e.target.value })}
                      className="w-full h-12 px-3 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-xl font-bold transition-all focus:ring-0"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowInvEditModal(false); setEditingInvItem(null); }}
                    className="flex-1 h-12 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveInvEdit}
                    disabled={!editingInvItem.name.trim()}
                    className="flex-[2] h-12 bg-hcdc-blue hover:bg-hcdc-blue-dark text-white font-black rounded-xl shadow-lg shadow-hcdc-blue/20 flex items-center justify-center gap-2 transition-all disabled:opacity-30 text-sm uppercase tracking-wider"
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD INVENTORY MODAL */}
      <AnimatePresence>
        {showAddInventoryModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className={`p-8 text-white flex justify-between items-center ${addInventoryLocation === 'master' ? 'bg-hcdc-blue' : 'bg-hcdc-gold'}`}>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">Add Stock</h3>
                  <p className="text-2xl font-black tracking-tight font-heading">
                    {addInventoryLocation === 'master' ? 'Master Inventory' : 'Cafe Inventory'}
                  </p>
                </div>
                <button
                  onClick={() => { setShowAddInventoryModal(false); setIsAddingNewStock(false); }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 space-y-5">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Name of Stock</label>
                  <select
                    value={isAddingNewStock ? 'NEW_STOCK' : addInventoryForm.name}
                    onChange={(e) => {
                      if (e.target.value === 'NEW_STOCK') {
                        setIsAddingNewStock(true);
                        setAddInventoryForm({ ...addInventoryForm, name: '', unit: 'g' });
                      } else {
                        setIsAddingNewStock(false);
                        const selectedStock = inventory.find(i => i.name === e.target.value && i.location === 'master');
                        setAddInventoryForm({ ...addInventoryForm, name: e.target.value, unit: selectedStock?.unit || 'g' });
                      }
                    }}
                    className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue rounded-xl font-bold transition-all mb-1 appearance-none focus:outline-none text-sm text-gray-750"
                  >
                    <option value="" disabled>Select a stock item</option>
                    {addInventoryLocation === 'cafe' ? (
                      inventory
                        .filter(stock => stock.location === 'master' && stock.quantity > 0)
                        .map(stock => (
                          <option key={stock.id} value={stock.name}>
                            {stock.name} ({stock.quantity.toLocaleString()} {stock.unit} available in Master)
                          </option>
                        ))
                    ) : (
                      inventory
                        .filter(stock => stock.location === 'master')
                        .map(stock => (
                          <option key={stock.id} value={stock.name}>
                            {stock.name} ({stock.quantity.toLocaleString()} {stock.unit} current)
                          </option>
                        ))
                    )}
                    {addInventoryLocation === 'master' && (
                      <option value="NEW_STOCK" className="font-bold text-hcdc-blue">+ Add New Stock...</option>
                    )}
                  </select>
                  {addInventoryLocation === 'cafe' && (
                    <p className="text-[9px] text-amber-600 font-bold mb-3 mt-1 leading-normal">
                      ⚠️ Items must exist and have available quantity in Master Stock to transfer.
                    </p>
                  )}
                  
                  {isAddingNewStock && (
                    <input
                      type="text"
                      value={addInventoryForm.name}
                      onChange={(e) => setAddInventoryForm({ ...addInventoryForm, name: e.target.value })}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue rounded-xl font-bold transition-all mt-2 focus:outline-none"
                      placeholder="Type new stock name..."
                      autoFocus
                    />
                  )}
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Measurements</label>
                    <input
                      type="number"
                      value={addInventoryForm.quantity}
                      onChange={(e) => setAddInventoryForm({ ...addInventoryForm, quantity: e.target.value })}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue rounded-xl font-bold transition-all focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Unit</label>
                    <select
                      value={addInventoryForm.unit}
                      disabled={!isAddingNewStock && !!addInventoryForm.name}
                      onChange={(e) => setAddInventoryForm({ ...addInventoryForm, unit: e.target.value })}
                      className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue rounded-xl font-bold transition-all disabled:opacity-50 appearance-none focus:outline-none"
                    >
                      <option value="g">g</option>
                      <option value="ml">ml</option>
                      <option value="pcs">pcs</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setShowAddInventoryModal(false); setIsAddingNewStock(false); }}
                    className="flex-1 h-12 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddInventory}
                    disabled={!addInventoryForm.name.trim() || !addInventoryForm.quantity}
                    className={`flex-[2] h-12 text-white font-black rounded-xl shadow-lg transition-all disabled:opacity-30 text-sm uppercase tracking-wider ${
                      addInventoryLocation === 'master' ? 'bg-hcdc-blue hover:bg-hcdc-blue-dark shadow-hcdc-blue/20' : 'bg-hcdc-gold hover:bg-[#D4A017] shadow-hcdc-gold/20'
                    }`}
                  >
                    Update Inventory
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {(showAddModal || editingItem) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">
              <div className="bg-hcdc-blue p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">{editingItem ? 'Edit Item' : 'New Menu Item'}</h3>
                  <p className="text-2xl font-black tracking-tight">{editingItem ? formData.name || 'Editing...' : 'Add to Menu'}</p>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingItem(null); }} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Item Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Vanilla Latte"
                    className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-2xl font-bold text-lg transition-all focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Price (₱)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-2xl font-bold text-lg transition-all focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Item Image (PNG)</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.image ? (
                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="flex items-center gap-3 px-5 py-3 bg-gray-50 hover:bg-hcdc-light-blue border-2 border-gray-100 hover:border-hcdc-blue/20 rounded-2xl cursor-pointer transition-all">
                        <ImagePlus className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-bold text-gray-500">{formData.image ? 'Change Image' : 'Upload PNG'}</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageUpload} className="hidden" />
                      </label>
                      {formData.image && (
                        <button onClick={() => setFormData(prev => ({ ...prev, image: '' }))} className="text-[10px] font-bold text-hcdc-red mt-2 hover:underline">Remove image</button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block">Required Ingredients</label>
                    <button
                      onClick={() => {
                        setFormData({ ...formData, ingredients: [...formData.ingredients, { inventoryId: inventory[0]?.id || '', quantity: 0 }] });
                      }}
                      className="text-xs font-bold text-hcdc-blue hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Ingredient
                    </button>
                  </div>
                  {formData.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border-2 border-transparent focus-within:border-hcdc-blue/30 transition-all">
                      <select
                        value={ing.inventoryId}
                        onChange={(e) => {
                          const newIng = [...formData.ingredients];
                          newIng[idx].inventoryId = e.target.value;
                          setFormData({ ...formData, ingredients: newIng });
                        }}
                        className="flex-1 bg-white h-10 px-3 rounded-xl border border-gray-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-hcdc-blue/20"
                      >
                        <option value="" disabled>Select Stock</option>
                        {inventory.map(stock => (
                          <option key={stock.id} value={stock.id}>{stock.item_name} ({stock.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={ing.quantity || ''}
                        onChange={(e) => {
                          const newIng = [...formData.ingredients];
                          newIng[idx].quantity = parseFloat(e.target.value) || 0;
                          setFormData({ ...formData, ingredients: newIng });
                        }}
                        placeholder="Qty"
                        className="w-24 bg-white h-10 px-3 rounded-xl border border-gray-100 font-bold text-sm text-center focus:outline-none focus:ring-2 focus:ring-hcdc-blue/20"
                      />
                      <button
                        onClick={() => {
                          const newIng = formData.ingredients.filter((_, i) => i !== idx);
                          setFormData({ ...formData, ingredients: newIng });
                        }}
                        className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 transition-colors shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.ingredients.length === 0 && (
                    <div className="text-center py-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <p className="text-sm font-medium text-gray-400">No ingredients added</p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Category</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`py-3 rounded-xl text-xs font-black border-2 transition-all ${formData.category === cat ? 'bg-hcdc-blue border-hcdc-blue text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <button
                    onClick={() => { setShowAddModal(false); setEditingItem(null); }}
                    className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={editingItem ? handleEditItem : handleAddItem}
                    disabled={!formData.name || !formData.price}
                    className="flex-[2] h-14 bg-hcdc-blue hover:bg-hcdc-blue-dark text-white font-black rounded-2xl shadow-xl shadow-hcdc-blue/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:scale-100 text-sm uppercase tracking-wider"
                  >
                    <Save className="w-4 h-4" /> {editingItem ? 'Save Changes' : 'Add Item'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {viewingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:static print:bg-transparent print:p-0 print:block">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-100 print:shadow-none print:h-auto print:rounded-none print:max-w-none print:w-full print:block print:border-none"
            >
              <div className="bg-hcdc-blue p-6 text-white flex justify-between items-center shrink-0 no-print">
                <h3 className="font-bold flex items-center gap-2"><Receipt className="w-5 h-5" /> Transaction Receipt</h3>
                <button onClick={() => setViewingReceipt(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-[#F9FAFB] scroll-smooth custom-scrollbar print:overflow-visible print:p-0 print:bg-white print:block">
                {/* Simulated Thermal Receipt */}
                <div id="receipt-content" className="bg-white p-6 shadow-md mx-auto max-w-[320px] font-mono text-[11px] text-gray-800 border-t-8 border-hcdc-blue relative">
                  {/* Background watermark */}
                  <div className="absolute inset-0 opacity-[0.02] flex items-center justify-center pointer-events-none">
                    <UtensilsCrossed className="w-48 h-48" />
                  </div>

                  <div className="text-center space-y-1 mb-6 relative">
                    <img src={cafeLogo} alt="HCDC Logo" className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order Number</p>
                    <p className="text-4xl font-black text-hcdc-blue tracking-tight">{viewingReceipt.id.split('-').pop()}</p>
                    <div className="h-2"></div>
                    <p className="text-base font-black uppercase tracking-tight text-gray-900">HCDC Alumni Cafe</p>
                  </div>

                  <div className="border-t border-dashed border-gray-400 py-3 space-y-1.5 text-xs relative">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cashier:</span>
                      <span className="font-bold">{viewingReceipt.cashier}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-500 shrink-0">Date & Time:</span>
                      <span className="font-bold text-right">{new Date(viewingReceipt.date).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })} {viewingReceipt.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Transaction Number:</span>
                      <span className="font-bold">{viewingReceipt.id}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-400 pt-3 mb-1 font-bold text-[10px] relative">
                    <div className="flex justify-between gap-4 text-gray-500">
                      <span className="w-10">QTY</span>
                      <span className="w-20">CATEGORY</span>
                      <span className="flex-1 text-right">ITEM</span>
                    </div>
                  </div>
                  <div className="border-b border-gray-400 pb-2 mb-4 relative">
                    {viewingReceipt.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between gap-4 py-1.5 leading-tight text-[11px]">
                        <span className="w-10 font-bold">{item.quantity}</span>
                        <span className="w-20 truncate text-gray-600">{item.category}</span>
                        <span className="flex-1 text-right font-bold truncate text-gray-900">{item.name}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-dashed border-gray-400 pt-4 text-center relative">
                    <p className="font-bold text-[10px] text-gray-500 tracking-wider">
                      THIS IS NOT AN OFFICIAL RECEIPT
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100 shrink-0 bg-white no-print">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-hcdc-blue hover:bg-hcdc-blue-dark text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <Printer className="w-5 h-5" /> Print Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CASHIER ADD/EDIT MODAL */}
      <AnimatePresence>
        {(showCashierModal) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100">
              <div className="bg-hcdc-blue p-8 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">{editingCashier ? 'Edit Cashier' : 'New Cashier'}</h3>
                  <p className="text-2xl font-black tracking-tight">{editingCashier ? cashierForm.name || 'Editing...' : 'Add Account'}</p>
                </div>
                <button onClick={() => { setShowCashierModal(false); setEditingCashier(null); setCashierForm({ name: '', usernamePrefix: '', role: 'Cashier' }); }} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-10 space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={cashierForm.name}
                    onChange={(e) => setCashierForm({ ...cashierForm, name: e.target.value })}
                    placeholder="e.g. Juan Dela Cruz"
                    className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-2xl font-bold text-lg transition-all focus:ring-0"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Username</label>
                  <div className="flex bg-gray-50 rounded-2xl overflow-hidden border-2 border-transparent focus-within:border-hcdc-blue focus-within:bg-white transition-all h-14">
                    <input
                      type="text"
                      value={cashierForm.usernamePrefix}
                      onChange={(e) => setCashierForm({ ...cashierForm, usernamePrefix: e.target.value })}
                      placeholder="e.g. juan"
                      className="flex-1 h-full px-6 bg-transparent border-none font-bold text-lg focus:ring-0 text-right"
                    />
                    <div className="flex items-center px-6 bg-gray-100 text-gray-500 font-bold text-lg select-none">
                      @alumnicafe
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Role</label>
                    <select
                      value={cashierForm.role}
                      onChange={(e) => setCashierForm({ ...cashierForm, role: e.target.value })}
                      className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-2xl font-bold text-sm transition-all focus:ring-0"
                    >
                      <option value="Cashier">Cashier</option>
                      <option value="Senior Cashier">Senior Cashier</option>
                      <option value="Manager">Manager</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => { setShowCashierModal(false); setEditingCashier(null); setCashierForm({ name: '', usernamePrefix: '', role: 'Cashier' }); }}
                    className="flex-1 h-14 bg-white border-2 border-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-50 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCashier}
                    disabled={!cashierForm.name || !cashierForm.usernamePrefix}
                    className="flex-[2] h-14 bg-hcdc-blue hover:bg-hcdc-blue-dark text-white font-black rounded-2xl shadow-xl shadow-hcdc-blue/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:scale-100 text-sm uppercase tracking-wider"
                  >
                    <Save className="w-4 h-4" /> {editingCashier ? 'Save Changes' : 'Create Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* CATEGORY MANAGER MODAL */}
      <AnimatePresence>
        {showCategoryManager && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-hcdc-gold p-6 text-hcdc-blue flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2"><Tag className="w-5 h-5" /> Manage Categories</h3>
                <button onClick={() => setShowCategoryManager(false)} className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-8">
                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-xl font-bold text-sm transition-all outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
                  />
                  <button
                    onClick={handleAddCat}
                    disabled={!newCategoryName.trim()}
                    className="bg-hcdc-blue text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-hcdc-blue-dark transition-all disabled:opacity-30 shadow-md shadow-hcdc-blue/20"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                  {categories.map(cat => (
                    <div key={cat} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl group border border-transparent hover:border-gray-200 transition-all">
                      <span className="font-bold text-gray-700">{cat}</span>
                      <button
                        onClick={() => handleDeleteCat(cat)}
                        className="p-2 text-gray-300 hover:text-hcdc-red transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-4">No categories created yet.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN AUTH MODAL */}
      <AnimatePresence>
        {showAdminAuthModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-hcdc-blue p-8 text-white text-center">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-hcdc-gold" />
                </div>
                <h3 className="text-xl font-black">Admin Authentication</h3>
                <p className="text-sm text-white/60 mt-1 uppercase tracking-widest font-bold">Required to {authCallback?.type} transaction</p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Admin Password</label>
                  <input
                    type="password"
                    autoFocus
                    value={adminPasswordInput}
                    onChange={(e) => setAdminPasswordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminAuthSubmit()}
                    className={`w-full h-14 px-6 bg-gray-50 border-2 rounded-2xl font-bold text-center text-xl transition-all focus:ring-0 ${
                      authError ? 'border-hcdc-red bg-red-50' : 'border-transparent focus:border-hcdc-blue focus:bg-white'
                    }`}
                    placeholder="••••••••"
                  />
                  {authError && (
                    <p className="text-hcdc-red text-[10px] font-black uppercase tracking-widest text-center mt-3 animate-pulse">Incorrect Password</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowAdminAuthModal(false); setAuthCallback(null); }}
                    className="flex-1 h-12 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminAuthSubmit}
                    className="flex-1 h-12 bg-hcdc-blue text-white font-bold rounded-xl hover:bg-hcdc-blue-dark shadow-lg shadow-hcdc-blue/20 transition-all"
                  >
                    Verify
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TRANSACTION MODAL */}
      <AnimatePresence>
        {editingTransaction && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-hcdc-gold p-8 text-hcdc-blue">
                <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-1">Edit Transaction</h3>
                <p className="text-2xl font-black tracking-tight">{editingTransaction.id}</p>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-2">Total Amount (₱)</label>
                  <input
                    type="number"
                    value={editTxnForm.total}
                    onChange={(e) => setEditTxnForm({ ...editTxnForm, total: parseFloat(e.target.value) || 0 })}
                    className="w-full h-14 px-6 bg-gray-50 border-2 border-transparent focus:border-hcdc-blue focus:bg-white rounded-2xl font-bold text-lg transition-all"
                  />
                </div>
                <div className="bg-blue-50 p-6 rounded-[2rem] border border-hcdc-blue/10">
                  <p className="text-[11px] text-hcdc-blue font-black uppercase tracking-[0.2em] mb-4">Edit Items Sold</p>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {editTxnForm.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-hcdc-blue/5">
                        <div className="flex-1 min-w-0 mr-4">
                          <p className="font-bold text-gray-800 text-sm truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">₱{item.price.toFixed(2)} / unit</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleUpdateEditItemQty(idx, -1)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-hcdc-red hover:border-hcdc-red/20 transition-all shadow-sm"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center font-black text-hcdc-blue text-sm">{item.quantity}</span>
                          <button 
                            onClick={() => handleUpdateEditItemQty(idx, 1)}
                            className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-hcdc-blue hover:border-hcdc-blue/20 transition-all shadow-sm"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingTransaction(null)}
                    className="flex-1 h-14 bg-gray-50 text-gray-400 font-bold rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEditTransaction}
                    className="flex-[2] h-14 bg-hcdc-blue text-white font-black rounded-2xl shadow-xl shadow-hcdc-blue/30 transition-all hover:scale-[1.02] active:scale-95 uppercase tracking-wider text-sm"
                  >
                    Update Record
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Global Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && itemToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl p-8 text-center"
            >
              <div className="w-20 h-20 bg-hcdc-light-red rounded-full flex items-center justify-center mx-auto mb-6 text-hcdc-red">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black mb-2">Delete {itemToDelete.type === 'menu' ? 'Menu Item' : itemToDelete.type === 'cashier' ? 'Cashier' : 'Ingredient'}?</h3>
              <p className="text-sm text-gray-500 mb-8">
                Are you sure you want to remove <span className="font-bold text-gray-800">{itemToDelete.name}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 h-12 bg-gray-50 text-gray-400 font-bold rounded-xl hover:bg-gray-100">Cancel</button>
                <button onClick={handleConfirmDelete} className="flex-1 h-12 bg-hcdc-red text-white font-bold rounded-xl hover:bg-[#A01E1F] shadow-lg shadow-hcdc-red/20">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
