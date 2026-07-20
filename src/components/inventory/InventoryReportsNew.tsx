import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryItems, getPurchases, getInventoryTransactions, InventoryItem, Purchase, InventoryTransaction } from '../../inventoryManager';
import { getTransactions, TransactionRecord } from '../../transactions';
import { FileText, Calendar, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

type ReportType = 'Daily Sales' | 'Weekly Summary' | 'Monthly Inventory' | 'Purchase Report' | 'Ingredient Usage' | 'Low Stock' | 'Profit Report';

export default function InventoryReportsNew() {
  const [activeTab, setActiveTab] = useState<ReportType>('Daily Sales');
  
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

  const exportExcel = (data: any[], filename: string) => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  };

  const renderDailySales = () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayPos = posTxns.filter(t => t.date.startsWith(today) && t.status !== 'Voided');
    const todayCogsTxns = txns.filter(t => t.date.startsWith(today) && t.transaction_type === 'Used');
    
    const grossSales = todayPos.reduce((sum, t) => sum + t.total, 0);
    const netSales = grossSales / 1.12;
    const cogs = todayCogsTxns.reduce((sum, t) => sum + t.amount, 0);
    const profit = netSales - cogs;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gross Sales</p>
            <h4 className="text-xl font-black mt-1">₱ {grossSales.toFixed(2)}</h4>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Net Sales (less VAT)</p>
            <h4 className="text-xl font-black mt-1">₱ {netSales.toFixed(2)}</h4>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">COGS (Used)</p>
            <h4 className="text-xl font-black mt-1 text-red-500">₱ {cogs.toFixed(2)}</h4>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gross Profit</p>
            <h4 className="text-xl font-black mt-1 text-green-600">₱ {profit.toFixed(2)}</h4>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
              <tr><th className="p-4">Time</th><th className="p-4">Transaction ID</th><th className="p-4 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {todayPos.map(t => (
                <tr key={t.id}>
                  <td className="p-4 text-sm font-bold">{t.time}</td>
                  <td className="p-4 text-sm font-mono text-gray-500">{t.id}</td>
                  <td className="p-4 text-sm font-black text-right">₱ {t.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderIngredientUsage = () => {
    // group by item_id
    const usage: Record<string, { qty: number, val: number }> = {};
    txns.filter(t => t.transaction_type === 'Used').forEach(t => {
      if(!usage[t.item_id]) usage[t.item_id] = { qty: 0, val: 0 };
      usage[t.item_id].qty += t.quantity;
      usage[t.item_id].val += t.amount;
    });

    const data = Object.entries(usage).map(([id, stats]) => {
      const item = items.find(i => i.id === id);
      return {
        code: item?.item_code || '',
        name: item?.item_name || 'Unknown',
        qty: stats.qty,
        unit: item?.unit || '',
        val: stats.val
      };
    }).sort((a,b) => b.val - a.val);

    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center">
          <h4 className="font-bold text-gray-800">All Time Ingredient Usage (from Sales)</h4>
          <button onClick={() => exportExcel(data, 'ingredient_usage')} className="text-xs font-bold text-hcdc-blue hover:underline">Export CSV</button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
            <tr><th className="p-4">Code</th><th className="p-4">Item Name</th><th className="p-4 text-right">Qty Used</th><th className="p-4 text-right">Total Cost Value</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((d, i) => (
              <tr key={i}>
                <td className="p-4 text-sm font-mono text-gray-500">{d.code}</td>
                <td className="p-4 text-sm font-bold">{d.name}</td>
                <td className="p-4 text-sm font-bold text-right">{d.qty.toFixed(2)} {d.unit}</td>
                <td className="p-4 text-sm font-black text-red-500 text-right">₱ {d.val.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderLowStock = () => {
    const low = items.filter(i => (i.current_stock || 0) <= (i.minimum_stock || 0));
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
            <tr><th className="p-4">Item</th><th className="p-4 text-right">Current Stock</th><th className="p-4 text-right">Min Level</th><th className="p-4 text-right">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {low.map(item => (
              <tr key={item.id}>
                <td className="p-4 text-sm font-bold">{item.item_name}</td>
                <td className="p-4 text-sm font-black text-red-600 text-right">{(item.current_stock || 0).toFixed(2)} {item.unit}</td>
                <td className="p-4 text-sm font-bold text-gray-500 text-right">{item.minimum_stock} {item.unit}</td>
                <td className="p-4 text-right"><span className="bg-red-100 text-red-600 px-2 py-1 rounded-lg text-xs font-bold">Needs Reorder</span></td>
              </tr>
            ))}
            {low.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">All items sufficiently stocked.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  };

  const renderWeeklySummary = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().slice(0, 10);
    
    const weekPos = posTxns.filter(t => t.date >= weekAgoStr && t.status !== 'Voided');
    const weekCogsTxns = txns.filter(t => t.date >= weekAgoStr && t.transaction_type === 'Used');
    
    const grossSales = weekPos.reduce((sum, t) => sum + t.total, 0);
    const netSales = grossSales / 1.12;
    const cogs = weekCogsTxns.reduce((sum, t) => sum + t.amount, 0);
    const profit = netSales - cogs;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gross Sales (7 Days)</p>
            <h4 className="text-xl font-black mt-1">₱ {grossSales.toFixed(2)}</h4>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Net Sales (less VAT)</p>
            <h4 className="text-xl font-black mt-1">₱ {netSales.toFixed(2)}</h4>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">COGS (Used)</p>
            <h4 className="text-xl font-black mt-1 text-red-500">₱ {cogs.toFixed(2)}</h4>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Gross Profit</p>
            <h4 className="text-xl font-black mt-1 text-green-600">₱ {profit.toFixed(2)}</h4>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
              <tr><th className="p-4">Date</th><th className="p-4">Transaction ID</th><th className="p-4 text-right">Amount</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {weekPos.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                <tr key={t.id}>
                  <td className="p-4 text-sm font-bold">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-mono text-gray-500">{t.id}</td>
                  <td className="p-4 text-sm font-black text-right">₱ {t.total.toFixed(2)}</td>
                </tr>
              ))}
              {weekPos.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-gray-500">No sales in the last 7 days.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderMonthlyInventory = () => {
    const totalValuation = items.reduce((sum, item) => sum + ((item.current_stock || 0) * (item.cost_price || 0)), 0);
    
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-800">Total Inventory Valuation</h3>
            <p className="text-sm text-gray-500">Based on current stock and cost price</p>
          </div>
          <h2 className="text-3xl font-black text-hcdc-blue">₱ {totalValuation.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h4 className="font-bold text-gray-800">Current Inventory</h4>
            <button onClick={() => exportExcel(items, 'monthly_inventory')} className="text-xs font-bold text-hcdc-blue hover:underline">Export CSV</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
              <tr><th className="p-4">Item</th><th className="p-4 text-right">Stock</th><th className="p-4 text-right">Unit Cost</th><th className="p-4 text-right">Total Value</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.sort((a,b) => ((b.current_stock || 0) * (b.cost_price || 0)) - ((a.current_stock || 0) * (a.cost_price || 0))).map(item => (
                <tr key={item.id}>
                  <td className="p-4 text-sm font-bold">{item.item_name}</td>
                  <td className="p-4 text-sm font-medium text-right">{(item.current_stock || 0).toFixed(2)} {item.unit}</td>
                  <td className="p-4 text-sm font-mono text-gray-500 text-right">₱ {(item.cost_price || 0).toFixed(2)}</td>
                  <td className="p-4 text-sm font-black text-right">₱ {((item.current_stock || 0) * (item.cost_price || 0)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPurchaseReport = () => {
    const totalPurchases = purchases.reduce((sum, p) => sum + p.total_cost, 0);
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-800">Total Purchases</h3>
            <p className="text-sm text-gray-500">All time purchase history</p>
          </div>
          <h2 className="text-3xl font-black text-red-500">₱ {totalPurchases.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h4 className="font-bold text-gray-800">Purchase Records</h4>
            <button onClick={() => exportExcel(purchases, 'purchases')} className="text-xs font-bold text-hcdc-blue hover:underline">Export CSV</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
              <tr><th className="p-4">Date</th><th className="p-4">Item</th><th className="p-4 text-right">Qty</th><th className="p-4 text-right">Total Cost</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {purchases.sort((a,b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()).map(p => {
                const item = items.find(i => i.id === p.item_id);
                return (
                  <tr key={p.id}>
                    <td className="p-4 text-sm font-bold">{new Date(p.purchase_date).toLocaleDateString()}</td>
                    <td className="p-4 text-sm font-medium">{item?.item_name || 'Unknown Item'}</td>
                    <td className="p-4 text-sm font-medium text-right">{p.quantity_purchased} {item?.unit || ''}</td>
                    <td className="p-4 text-sm font-black text-right text-red-500">₱ {p.total_cost.toFixed(2)}</td>
                  </tr>
                );
              })}
              {purchases.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No purchases recorded.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProfitReport = () => {
    const days: Record<string, { sales: number, cogs: number }> = {};
    
    posTxns.filter(t => t.status !== 'Voided').forEach(t => {
      const date = t.date.split('T')[0];
      if (!days[date]) days[date] = { sales: 0, cogs: 0 };
      days[date].sales += (t.total / 1.12);
    });
    
    txns.filter(t => t.transaction_type === 'Used').forEach(t => {
      const date = t.date.split('T')[0];
      if (!days[date]) days[date] = { sales: 0, cogs: 0 };
      days[date].cogs += t.amount;
    });

    const data = Object.entries(days)
      .map(([date, stats]) => ({ date, ...stats, profit: stats.sales - stats.cogs }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    const totalProfit = data.reduce((sum, d) => sum + d.profit, 0);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-gray-800">30-Day Profitability</h3>
            <p className="text-sm text-gray-500">Gross profit over the last 30 active days</p>
          </div>
          <h2 className="text-3xl font-black text-green-600">₱ {totalProfit.toFixed(2)}</h2>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h4 className="font-bold text-gray-800">Daily Profit Tracker</h4>
            <button onClick={() => exportExcel(data, 'profit_report')} className="text-xs font-bold text-hcdc-blue hover:underline">Export CSV</button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500 font-black">
              <tr><th className="p-4">Date</th><th className="p-4 text-right">Net Sales</th><th className="p-4 text-right">COGS</th><th className="p-4 text-right">Gross Profit</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((d, i) => (
                <tr key={i}>
                  <td className="p-4 text-sm font-bold">{new Date(d.date).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-medium text-right">₱ {d.sales.toFixed(2)}</td>
                  <td className="p-4 text-sm font-medium text-right text-red-500">₱ {d.cogs.toFixed(2)}</td>
                  <td className="p-4 text-sm font-black text-right text-green-600">₱ {d.profit.toFixed(2)}</td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500">No active days found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-6 border-b border-gray-50 flex flex-col gap-4 bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-hcdc-blue" />
            Inventory Reports
          </h3>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          {(['Daily Sales', 'Weekly Summary', 'Monthly Inventory', 'Purchase Report', 'Ingredient Usage', 'Low Stock', 'Profit Report'] as ReportType[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-colors ${
                activeTab === tab 
                  ? 'bg-hcdc-blue text-white shadow-md' 
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-hcdc-blue/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
        {activeTab === 'Daily Sales' && renderDailySales()}
        {activeTab === 'Weekly Summary' && renderWeeklySummary()}
        {activeTab === 'Monthly Inventory' && renderMonthlyInventory()}
        {activeTab === 'Purchase Report' && renderPurchaseReport()}
        {activeTab === 'Ingredient Usage' && renderIngredientUsage()}
        {activeTab === 'Low Stock' && renderLowStock()}
        {activeTab === 'Profit Report' && renderProfitReport()}
      </div>
    </div>
  );
}
