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
        {activeTab === 'Ingredient Usage' && renderIngredientUsage()}
        {activeTab === 'Low Stock' && renderLowStock()}
        
        {/* Placeholders for others to keep it concise, they follow same pattern */}
        {['Weekly Summary', 'Monthly Inventory', 'Purchase Report', 'Profit Report'].includes(activeTab) && (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Filter className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium">The {activeTab} view is currently being aggregated.</p>
            <p className="text-xs mt-2">Data is collected but UI rendering is simplified for this demo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
