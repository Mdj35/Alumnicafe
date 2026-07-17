import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryItems, getPurchases, getInventoryTransactions, InventoryItem, Purchase, InventoryTransaction } from '../../inventoryManager';
import { getTransactions, TransactionRecord } from '../../transactions';
import { Package, TrendingUp, AlertCircle, DollarSign, Activity, ChevronRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function InvDashboardHome({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [txns, setTxns] = useState<InventoryTransaction[]>([]);
  const [posTxns, setPosTxns] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_items, _purchases, _txns, _pos] = await Promise.all([
      getInventoryItems(),
      getPurchases(),
      getInventoryTransactions(),
      getTransactions()
    ]);
    setItems(_items);
    setPurchases(_purchases);
    setTxns(_txns);
    setPosTxns(_pos);
  };

  const {
    currentValue,
    lowStockItems,
    lowStockCount,
    monthlyPurchases,
    monthlySales,
    chartData,
    cogs,
    grossProfit
  } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const value = items.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0);
    const lowItems = items.filter(i => i.current_stock <= i.minimum_stock);
    
    const monthPurchases = purchases.filter(p => {
      const d = new Date(p.purchase_date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, p) => sum + p.total_cost, 0);

    const todaySales = posTxns.filter(t => {
      if (t.status === 'Voided') return false;
      return t.date.startsWith(now.toISOString().slice(0, 10));
    }).reduce((sum, t) => sum + t.total, 0);

    const monthPos = posTxns.filter(t => {
      if (t.status === 'Voided') return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    
    const mSales = monthPos.reduce((sum, t) => sum + (t.total / 1.12), 0); // Net sales

    const mUsed = txns.filter(t => {
      if (t.transaction_type !== 'Used') return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).reduce((sum, t) => sum + t.amount, 0);

    const gProfit = mSales - mUsed;

    // Chart data - last 14 days
    const dailyTxns: Record<string, { date: string, purchases: number, usage: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      dailyTxns[dStr] = { date: dStr, purchases: 0, usage: 0 };
    }

    txns.forEach(t => {
      const d = t.date.split('T')[0];
      if (dailyTxns[d]) {
        if (t.transaction_type === 'Purchase') dailyTxns[d].purchases += t.amount;
        if (t.transaction_type === 'Used') dailyTxns[d].usage += t.amount;
      }
    });

    return {
      currentValue: value,
      lowStockItems: lowItems,
      lowStockCount: lowItems.length,
      monthlyPurchases: monthPurchases,
      monthlySales: todaySales,
      cogs: mUsed,
      grossProfit: gProfit,
      chartData: Object.values(dailyTxns)
    };
  }, [items, purchases, txns, posTxns]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-full overflow-y-auto pb-10">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-hcdc-blue/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="w-12 h-12 rounded-2xl bg-hcdc-light-blue text-hcdc-blue flex items-center justify-center relative z-10">
            <DollarSign className="w-6 h-6" />
          </div>
          <div className="relative z-10 mt-2">
            <h3 className="text-3xl font-black text-gray-800 tracking-tight">₱{currentValue.toLocaleString('en-PH', {minimumFractionDigits: 2})}</h3>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Current Stock Value</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center relative z-10">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="relative z-10 mt-2">
            <h3 className="text-3xl font-black text-gray-800 tracking-tight">₱{monthlySales.toLocaleString('en-PH', {minimumFractionDigits: 2})}</h3>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Today's Sales</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center relative z-10">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="relative z-10 mt-2">
            <h3 className="text-3xl font-black text-gray-800 tracking-tight">{lowStockCount}</h3>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Low Stock Alerts</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-hcdc-gold/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-hcdc-gold flex items-center justify-center relative z-10">
            <Activity className="w-6 h-6" />
          </div>
          <div className="relative z-10 mt-2">
            <h3 className="text-3xl font-black text-gray-800 tracking-tight">₱{grossProfit.toLocaleString('en-PH', {minimumFractionDigits: 2})}</h3>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mt-1">Monthly Gross Profit</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Chart Section */}
        <div className="col-span-2 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-lg font-black text-gray-800">Inventory Movement Trend</h3>
              <p className="text-xs text-gray-500 font-medium">Purchases vs Usage value over last 14 days</p>
            </div>
            <button onClick={() => setActiveTab('reports')} className="text-xs font-bold text-hcdc-blue hover:underline flex items-center">
              View Full Reports <ChevronRight className="w-3 h-3 ml-1" />
            </button>
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
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} dy={10} tickFormatter={(val) => val.split('-').slice(1).join('/')} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af', fontWeight: 600 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="purchases" name="Purchases ₱" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorPurchased)" />
                <Area type="monotone" dataKey="usage" name="Used ₱" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorUsed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Low Stock Widget */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-lg font-black text-gray-800">Low Stock Alerts</h3>
              <p className="text-xs text-gray-500 font-medium">Items requiring reorder</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
            {lowStockItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <Package className="w-10 h-10 mb-2" />
                <p className="text-sm font-medium">All items well stocked</p>
              </div>
            ) : (
              lowStockItems.map(item => (
                <div key={item.id} className="p-3 bg-red-50/50 rounded-2xl border border-red-100/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-sm text-gray-800">{item.item_name}</span>
                    <span className="text-xs font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-lg">
                      {item.current_stock.toFixed(1)} {item.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-gray-500 font-medium flex justify-between">
                    <span>Reorder Level: {item.minimum_stock}</span>
                    <span>Cost: ₱{item.unit_cost.toFixed(2)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
