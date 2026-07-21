import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryItems, getPurchases, getOpeningStocks, getStockCounts, InventoryItem, Purchase, OpeningStockEntry, StockCount } from '../../inventoryManager';
import { Calculator, Calendar, DollarSign, Package, TrendingDown, AlertCircle } from 'lucide-react';

export default function InventoryCostCalculator() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [openings, setOpenings] = useState<OpeningStockEntry[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10)
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_i, _p, _o, _sc] = await Promise.all([getInventoryItems(), getPurchases(), getOpeningStocks(), getStockCounts()]);
    setItems(_i);
    setPurchases(_p);
    setOpenings(_o);
    setStockCounts(_sc);
  };

  const { cogsSummary, itemValuations, hasAllCounts, uncountedItems } = useMemo(() => {
    // 1. Current Valuation (live system stock — always computed for the per-item table)
    const valuations = items.map(item => {
      // Find the most recent stock count for this item on or before dateRange.end
      const relevantCounts = stockCounts
        .filter(c => c.item_id === item.id && c.count_date <= dateRange.end)
        .sort((a, b) => b.count_date.localeCompare(a.count_date));

      const latestCount = relevantCounts[0] ?? null;
      const countedQty = latestCount ? latestCount.actual_quantity : null;
      const countedValue = countedQty != null ? countedQty * (item.unit_cost || 0) : null;

      return {
        ...item,
        total_value: (item.current_stock || 0) * (item.unit_cost || 0), // live system value for table
        counted_qty: countedQty,
        counted_value: countedValue,
        count_date: latestCount?.count_date ?? null,
        has_count: latestCount != null
      };
    }).sort((a, b) => b.total_value - a.total_value);

    // 2. Determine which items are uncounted in the selected period
    const uncounted = valuations.filter(v => !v.has_count);
    const allCounted = uncounted.length === 0 && valuations.length > 0;

    // 3. Closing value = sum of actual counted quantities for items that have a count
    //    Items without a count are excluded from the closing figure (shown as "Not Counted")
    const closingVal = valuations
      .filter(v => v.counted_value != null)
      .reduce((sum, v) => sum + (v.counted_value as number), 0);
    const closingIsPartial = !allCounted && valuations.some(v => v.has_count);
    const closingIsEmpty = !allCounted && !closingIsPartial;

    // 4. Opening
    let openingVal = 0;
    const pastOpenings = openings.filter(o => o.date <= dateRange.start).sort((a, b) => b.date.localeCompare(a.date));
    if (pastOpenings.length > 0) {
      openingVal = pastOpenings[0].total_value;
    } else {
      openingVal = items.reduce((sum, i) => sum + ((i.opening_stock || 0) * (i.unit_cost || 0)), 0);
    }

    // 5. Purchases in range
    const periodPurchases = purchases
      .filter(p => p.purchase_date >= dateRange.start && p.purchase_date <= dateRange.end)
      .reduce((sum, p) => sum + p.total_cost, 0);

    // 6. COGS — only meaningful when we have at least some closing counts
    const cogs = closingIsEmpty ? null : openingVal + periodPurchases - closingVal;

    return {
      cogsSummary: { opening: openingVal, purchases: periodPurchases, closing: closingIsEmpty ? null : closingVal, closingIsPartial, closingIsEmpty, cogs },
      itemValuations: valuations,
      hasAllCounts: allCounted,
      uncountedItems: uncounted.length
    };
  }, [items, purchases, openings, stockCounts, dateRange]);

  const totalInvValue = itemValuations.reduce((sum, i) => sum + i.total_value, 0);

  const fmtMoney = (v: number) => v.toLocaleString('en-PH', { minimumFractionDigits: 2 });

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      
      <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-hcdc-blue" />
            Inventory Cost &amp; Valuation
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

      {/* Banner when stock count is missing */}
      {cogsSummary.closingIsEmpty && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-xs font-bold text-amber-800">
            No physical stock count found for the selected period. Complete a stock count to calculate Closing Stock and COGS.
          </p>
        </div>
      )}
      {cogsSummary.closingIsPartial && (
        <div className="mx-6 mt-4 p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-xs font-bold text-blue-800">
            Partial count: {uncountedItems} item{uncountedItems !== 1 ? 's' : ''} not yet counted. Closing Stock and COGS shown are based on counted items only.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-0 border-b border-gray-100 bg-white mt-0">
        <div className="p-6 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Package className="w-3 h-3"/> Opening Stock</p>
          <h4 className="text-2xl font-black text-gray-800">₱ {fmtMoney(cogsSummary.opening)}</h4>
        </div>
        <div className="p-6 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><DollarSign className="w-3 h-3"/> + Purchases</p>
          <h4 className="text-2xl font-black text-hcdc-blue">₱ {fmtMoney(cogsSummary.purchases)}</h4>
        </div>
        <div className="p-6 border-r border-gray-100">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Package className="w-3 h-3"/> - Closing Stock</p>
          {cogsSummary.closing != null ? (
            <div>
              <h4 className="text-2xl font-black text-gray-800">₱ {fmtMoney(cogsSummary.closing)}</h4>
              {cogsSummary.closingIsPartial && (
                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">PARTIAL COUNT</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">Not Counted</span>
            </div>
          )}
        </div>
        <div className="p-6 bg-red-50/30">
          <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3"/> = Cost of Goods Sold</p>
          {cogsSummary.cogs != null ? (
            <h4 className="text-2xl font-black text-red-600">₱ {fmtMoney(cogsSummary.cogs)}</h4>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">Awaiting Count</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/30 p-6">
        <h4 className="text-sm font-black text-gray-800 uppercase tracking-widest mb-4">
          Current Inventory Valuation: <span className="text-hcdc-blue">₱ {fmtMoney(totalInvValue)}</span>
        </h4>
        
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)] z-10">
              <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                <th className="p-4 pl-6">Code</th>
                <th className="p-4">Item Name</th>
                <th className="p-4 text-right">System Stock</th>
                <th className="p-4 text-right">Closing (Counted)</th>
                <th className="p-4 text-right">Last Count Date</th>
                <th className="p-4 text-right">Weighted Avg Cost</th>
                <th className="p-4 pr-6 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itemValuations.map(item => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 text-sm font-mono text-gray-500">{item.item_code}</td>
                  <td className="p-4 font-bold text-gray-800">{item.item_name}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">{(item.current_stock || 0).toFixed(2)} <span className="text-xs text-gray-400 font-medium">{item.unit}</span></td>
                  <td className="p-4 text-right">
                    {item.counted_qty != null ? (
                      <span className="text-sm font-black text-green-700">{item.counted_qty.toFixed(2)} <span className="text-xs font-medium">{item.unit}</span></span>
                    ) : (
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">Not Counted</span>
                    )}
                  </td>
                  <td className="p-4 text-sm text-gray-500 font-medium text-right">{item.count_date ?? '—'}</td>
                  <td className="p-4 text-sm font-bold text-gray-500 text-right">₱ {(item.unit_cost || 0).toFixed(4)}</td>
                  <td className="p-4 pr-6 text-sm font-black text-hcdc-blue text-right">₱ {item.total_value.toLocaleString('en-PH', {minimumFractionDigits:2})}</td>
                </tr>
              ))}
              {itemValuations.length === 0 && (
                <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-medium">No items in inventory.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
