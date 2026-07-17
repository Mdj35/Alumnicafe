import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryItems, getPurchases, getOpeningStocks, InventoryItem, Purchase, OpeningStockEntry } from '../../inventoryManager';
import { Calculator, Calendar, DollarSign, Package, TrendingDown } from 'lucide-react';

export default function InventoryCostCalculator() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [openings, setOpenings] = useState<OpeningStockEntry[]>([]);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_i, _p, _o] = await Promise.all([getInventoryItems(), getPurchases(), getOpeningStocks()]);
    setItems(_i);
    setPurchases(_p);
    setOpenings(_o);
  };

  const { cogsSummary, itemValuations } = useMemo(() => {
    // 1. Current Valuation
    const valuations = items.map(item => ({
      ...item,
      total_value: (item.current_stock || 0) * (item.unit_cost || 0)
    })).sort((a, b) => b.total_value - a.total_value);

    // 2. COGS for Date Range
    // Find closest opening stock entry on or before start date
    let openingVal = 0;
    const pastOpenings = openings.filter(o => o.date <= dateRange.start).sort((a,b) => b.date.localeCompare(a.date));
    if (pastOpenings.length > 0) {
      openingVal = pastOpenings[0].total_value;
    } else {
      // Fallback: sum of all item opening_stocks
      openingVal = items.reduce((sum, i) => sum + ((i.opening_stock || 0) * (i.unit_cost || 0)), 0);
    }

    const periodPurchases = purchases
      .filter(p => p.purchase_date >= dateRange.start && p.purchase_date <= dateRange.end)
      .reduce((sum, p) => sum + p.total_cost, 0);

    const closingVal = valuations.reduce((sum, i) => sum + i.total_value, 0);

    // COGS = Opening + Purchases - Closing
    const cogs = openingVal + periodPurchases - closingVal;

    return {
      cogsSummary: { opening: openingVal, purchases: periodPurchases, closing: closingVal, cogs },
      itemValuations: valuations
    };
  }, [items, purchases, openings, dateRange]);

  const totalInvValue = itemValuations.reduce((sum, i) => sum + i.total_value, 0);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      
      <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-hcdc-blue" />
            Inventory Cost & Valuation
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Calculate Cost of Goods Sold (COGS) and current inventory value.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <Calendar className="w-4 h-4 text-gray-400 ml-2" />
          <div className="flex items-center gap-2">
            <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="text-sm font-bold text-gray-700 outline-none bg-transparent" />
            <span className="text-gray-300">→</span>
            <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="text-sm font-bold text-gray-700 outline-none bg-transparent" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-0 border-b border-gray-100 bg-white">
        <div className="p-6 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Package className="w-3 h-3"/> Opening Stock</p>
          <h4 className="text-2xl font-black text-gray-800">₱ {cogsSummary.opening.toLocaleString('en-PH', {minimumFractionDigits:2})}</h4>
        </div>
        <div className="p-6 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> + Purchases</p>
          <h4 className="text-2xl font-black text-hcdc-blue">₱ {cogsSummary.purchases.toLocaleString('en-PH', {minimumFractionDigits:2})}</h4>
        </div>
        <div className="p-6 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Package className="w-3 h-3"/> - Closing Stock</p>
          <h4 className="text-2xl font-black text-gray-800">₱ {cogsSummary.closing.toLocaleString('en-PH', {minimumFractionDigits:2})}</h4>
        </div>
        <div className="p-6 bg-red-50/30">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> = Cost of Goods Sold</p>
          <h4 className="text-2xl font-black text-red-600">₱ {cogsSummary.cogs.toLocaleString('en-PH', {minimumFractionDigits:2})}</h4>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 p-6">
        <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">Current Inventory Valuation: <span className="text-hcdc-blue">₱ {totalInvValue.toLocaleString('en-PH', {minimumFractionDigits:2})}</span></h4>
        
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)] z-10">
              <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                <th className="p-4 pl-6">Code</th>
                <th className="p-4">Item Name</th>
                <th className="p-4 text-right">Current Stock</th>
                <th className="p-4 text-right">Weighted Avg Unit Cost</th>
                <th className="p-4 pr-6 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itemValuations.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 text-sm font-mono text-gray-500">{item.item_code}</td>
                  <td className="p-4 font-bold text-gray-800">{item.item_name}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">{(item.current_stock || 0).toFixed(2)} <span className="text-xs text-gray-400 font-medium">{item.unit}</span></td>
                  <td className="p-4 text-sm font-bold text-gray-500 text-right">₱ {(item.unit_cost || 0).toFixed(4)}</td>
                  <td className="p-4 pr-6 text-sm font-black text-hcdc-blue text-right">₱ {item.total_value.toLocaleString('en-PH', {minimumFractionDigits:2})}</td>
                </tr>
              ))}
              {itemValuations.length === 0 && (
                <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-medium">No items in inventory.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
