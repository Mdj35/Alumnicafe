import React, { useState, useEffect } from 'react';
import { getInventoryItems, getPurchases, getInventoryTransactions, getStockCounts, InventoryItem, Purchase, InventoryTransaction, StockCount } from '../../inventoryManager';
import { getMenuCategories } from '../../menuStorage';
import { BarChart3, TrendingUp, Package, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getTransactions, TransactionRecord } from '../../transactions';
import PeriodicTracker from './PeriodicTracker';

export default function InventoryReports() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [posTxns, setPosTxns] = useState<TransactionRecord[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [activeTab, setActiveTab] = useState<'Overview' | 'Tracker'>('Overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_items, _purchases, _txns, _cats, _posTxns, _counts] = await Promise.all([
      getInventoryItems(), getPurchases(), getInventoryTransactions(), getMenuCategories(), getTransactions(), getStockCounts()
    ]);
    setItems(_items);
    setPurchases(_purchases);
    setTransactions(_txns);
    setCategories(_cats);
    setPosTxns(_posTxns);
    setStockCounts(_counts);
  };

  // KPI Calculations
  const totalItems = items.length;
  const lowStockItems = items.filter(i => i.current_stock <= i.minimum_stock).length;
  const currentInventoryValue = items.reduce((sum, item) => sum + (item.current_stock * item.cost_price), 0);
  const beginningInventoryValue = items.reduce((sum, item) => sum + (item.opening_stock * item.cost_price), 0);
  const totalPurchasesValue = purchases.reduce((sum, p) => sum + p.total_cost, 0);

  // Category Distribution
  const catDistribution = categories.map(cat => {
    const catItems = items.filter(i => i.category_id === cat);
    const value = catItems.reduce((sum, item) => sum + (item.current_stock * item.cost_price), 0);
    return { name: cat, value };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  // Recent Transactions for Chart (Aggregate by Date)
  const txnsByDate = transactions.reduce((acc, txn) => {
    const d = txn.date.split('T')[0];
    if (!acc[d]) acc[d] = { date: d, used: 0, purchased: 0 };
    if (txn.transaction_type === 'Used') acc[d].used += txn.amount;
    if (txn.transaction_type === 'Purchase') acc[d].purchased += txn.amount;
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(txnsByDate).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-14); // Last 14 active days

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Inventory Reports</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Analytics, valuation, and historical tracking</p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('Overview')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'Overview' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('Tracker')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-colors ${activeTab === 'Tracker' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Periodic Tracker
          </button>
        </div>
      </div>

      {activeTab === 'Tracker' ? (
        <PeriodicTracker items={items} purchases={purchases} inventoryTxns={transactions} posTxns={posTxns} categories={categories} stockCounts={stockCounts} />
      ) : (
        <>
          {/* Overview Tab Content */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-hcdc-light-blue text-hcdc-blue flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800">₱ {currentInventoryValue.toLocaleString('en-PH', {minimumFractionDigits: 2})}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Total Inventory Value</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800">{totalItems}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Total Unique Items</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800">{lowStockItems}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Low Stock Items</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3">
              <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl font-black text-gray-800">₱ {totalPurchasesValue.toLocaleString('en-PH', {minimumFractionDigits: 2})}</h3>
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Total Purchases</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <div className="mb-8">
                <h3 className="text-lg font-black text-gray-800">Inventory Movement Trend</h3>
                <p className="text-xs text-gray-500 font-medium">Purchases vs Usage value over time</p>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPurchased" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="purchased" name="Purchased ₱" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchased)" />
                    <Area type="monotone" dataKey="used" name="Used ₱" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorUsed)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="mb-8">
                <h3 className="text-lg font-black text-gray-800">Category Value Distribution</h3>
                <p className="text-xs text-gray-500 font-medium">Current stock value by category</p>
              </div>
              <div className="flex-1 flex flex-col justify-center gap-4">
                {catDistribution.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center">No data available.</p>
                ) : (
                  catDistribution.slice(0,5).map((cat, i) => {
                    const percentage = (cat.value / currentInventoryValue) * 100;
                    return (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-gray-700">{cat.name}</span>
                          <span className="text-hcdc-blue">₱ {cat.value.toLocaleString()}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: i === 0 ? '#1A3A6B' : i === 1 ? '#E8A020' : i === 2 ? '#C0282A' : '#9ca3af'
                            }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-black text-gray-800">Period Summary</h3>
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Beginning Inventory Value</p>
                <p className="text-xl font-black text-gray-800">₱ {beginningInventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Purchases</p>
                <p className="text-xl font-black text-green-600">+ ₱ {totalPurchasesValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Calculated Ending Value</p>
                <p className="text-xl font-black text-hcdc-blue">₱ {currentInventoryValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Flow</p>
                <p className={`text-xl font-black ${currentInventoryValue >= beginningInventoryValue ? 'text-green-600' : 'text-red-500'}`}>
                  {currentInventoryValue >= beginningInventoryValue ? '+' : '-'} ₱ {Math.abs(currentInventoryValue - beginningInventoryValue).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
