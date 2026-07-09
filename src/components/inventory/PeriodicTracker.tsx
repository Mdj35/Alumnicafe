import React, { useState, useMemo } from 'react';
import { InventoryItem, Purchase, InventoryTransaction } from '../../inventoryManager';
import { TransactionRecord } from '../../transactions';

interface PeriodicTrackerProps {
  items: InventoryItem[];
  purchases: Purchase[];
  inventoryTxns: InventoryTransaction[];
  posTxns: TransactionRecord[];
  categories: string[];
}

interface Period {
  label: string;
  start_date: Date;
  end_date: Date;
}

export default function PeriodicTracker({ items, purchases, inventoryTxns, posTxns, categories }: PeriodicTrackerProps) {
  const [interval, setInterval] = useState<'Daily' | 'Weekly'>('Weekly');
  const [targetMargin, setTargetMargin] = useState<number>(72);
  const [staffMeal, setStaffMeal] = useState<number>(20);

  const periods: Period[] = useMemo(() => {
    const p: Period[] = [];
    const now = new Date();
    // set to end of today
    now.setHours(23, 59, 59, 999);

    if (interval === 'Daily') {
      for (let i = 0; i < 7; i++) {
        const end = new Date(now);
        end.setDate(now.getDate() - i);
        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        
        p.unshift({
          label: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          start_date: start,
          end_date: end
        });
      }
    } else {
      for (let i = 0; i < 5; i++) {
        const end = new Date(now);
        end.setDate(now.getDate() - (i * 7));
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);

        p.unshift({
          label: `Week ${5 - i}`,
          start_date: start,
          end_date: end
        });
      }
    }
    return p;
  }, [interval]);

  // Helper to calculate closing stock value at a given Date
  const getClosingStockValue = (date: Date, categoryFilter?: string) => {
    let totalValue = 0;
    
    for (const item of items) {
      if (categoryFilter && item.category_id !== categoryFilter) continue;
      
      let stock = item.current_stock;
      
      // Rollback txns that happened AFTER the date
      const futureTxns = inventoryTxns.filter(t => t.item_id === item.id && new Date(t.date).getTime() > date.getTime());
      
      for (const txn of futureTxns) {
        if (txn.transaction_type === 'Purchase') stock -= txn.quantity;
        if (txn.transaction_type === 'Used') stock += txn.quantity;
        if (txn.transaction_type === 'Adjustment') stock -= txn.quantity;
      }
      
      totalValue += (stock * item.cost_price);
    }
    return totalValue;
  };

  // Calculate Data Table
  const reportData = useMemo(() => {
    return periods.map(period => {
      // 1. Categories Closing
      const categoryClosing: Record<string, number> = {};
      categories.forEach(cat => {
        categoryClosing[cat] = getClosingStockValue(period.end_date, cat);
      });

      // 2. Financials
      // The opening of this period is the closing of the previous period.
      // To get exact opening, we calculate closing at (start_date - 1ms)
      const openingDate = new Date(period.start_date.getTime() - 1);
      const openingInventory = getClosingStockValue(openingDate);
      const closingInventory = getClosingStockValue(period.end_date);

      const periodPurchases = purchases
        .filter(p => {
          const t = new Date(p.purchase_date).getTime();
          return t >= period.start_date.getTime() && t <= period.end_date.getTime();
        })
        .reduce((sum, p) => sum + p.total_cost, 0);

      const cogs = openingInventory + periodPurchases - closingInventory - staffMeal;

      const grossReceipts = posTxns
        .filter(t => {
          if (t.status === 'Voided') return false;
          const time = new Date(t.date).getTime();
          return time >= period.start_date.getTime() && time <= period.end_date.getTime();
        })
        .reduce((sum, t) => sum + t.total, 0);

      const netReceipts = grossReceipts / 1.12;
      const grossProfit = netReceipts - cogs;
      const grossProfitMargin = netReceipts > 0 ? (grossProfit / netReceipts) * 100 : 0;
      
      const variance = grossProfitMargin - targetMargin;
      
      const targetCogs = netReceipts * (1 - (targetMargin / 100));
      const costVariance = targetCogs - cogs;

      return {
        ...period,
        categoryClosing,
        openingInventory,
        purchases: periodPurchases,
        closingInventory,
        cogs,
        grossReceipts,
        netReceipts,
        grossProfit,
        grossProfitMargin,
        variance,
        costVariance
      };
    });
  }, [periods, items, purchases, inventoryTxns, posTxns, categories, targetMargin, staffMeal]);


  const formatNum = (num: number, isPercent = false) => {
    if (num === 0 && !isPercent) return '-';
    return (isPercent ? num.toFixed(2) + ' %' : num.toFixed(2));
  };

  const renderVariance = (num: number, isPercent = false) => {
    const formatted = Math.abs(num).toFixed(2) + (isPercent ? ' %' : '');
    if (num < -0.005) return <span className="text-red-500">{formatted} -</span>;
    if (num > 0.005) return <span className="text-green-600">{formatted} +</span>;
    return <span className="text-gray-600">{formatted}</span>;
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col mt-6">
      
      {/* Controls */}
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-4">
          <select 
            value={interval} 
            onChange={e => setInterval(e.target.value as 'Daily' | 'Weekly')}
            className="bg-white border-2 border-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue outline-none"
          >
            <option value="Daily">Daily Report (Last 7 Days)</option>
            <option value="Weekly">Weekly Report (Last 5 Weeks)</option>
          </select>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Target Margin %</label>
            <input 
              type="number" 
              value={targetMargin} 
              onChange={e => setTargetMargin(parseFloat(e.target.value) || 0)} 
              className="w-20 bg-white border border-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-sm text-center outline-none focus:border-hcdc-blue" 
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Staff Meal</label>
            <input 
              type="number" 
              value={staffMeal} 
              onChange={e => setStaffMeal(parseFloat(e.target.value) || 0)} 
              className="w-20 bg-white border border-gray-200 text-gray-800 px-3 py-1.5 rounded-lg font-bold text-sm text-center outline-none focus:border-hcdc-blue" 
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap min-w-max">
          <thead className="bg-gray-400 text-white">
            <tr>
              <th className="p-4 pl-6 text-xs font-bold uppercase tracking-widest border-r border-white/20">Food Categories</th>
              {reportData.map(col => (
                <th key={col.label} className="p-4 text-center text-xs font-bold uppercase tracking-widest w-32 border-r border-white/20">
                  <div className="flex flex-col">
                    <span>{col.label}</span>
                    <span className="text-[9px] text-white/70">CLOSING</span>
                  </div>
                </th>
              ))}
              <th className="p-4 bg-gray-300 w-16"></th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100 bg-[#F4F4F4]">
            {/* CATEGORIES */}
            {categories.map(cat => (
              <tr key={cat}>
                <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">{cat}</td>
                {reportData.map(col => (
                  <td key={col.label + cat} className="p-3 text-sm text-gray-800 text-right font-medium">
                    {formatNum(col.categoryClosing[cat])}
                  </td>
                ))}
                <td className="bg-[#D1D1D1]"></td>
              </tr>
            ))}
            
            <tr className="h-8"><td colSpan={reportData.length + 2}></td></tr>

            {/* FINANCIALS */}
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Cost of Inventory at Opening</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.openingInventory)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Purchases</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.purchases)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Cost of Inventory at Closing</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.closingInventory)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Staff Meal Allowance</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(staffMeal)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Cost of Goods Sold</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.cogs)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>

            <tr className="h-8"><td colSpan={reportData.length + 2}></td></tr>

            {/* RECEIPTS */}
            <tr className="bg-white">
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase border-y border-gray-200">Gross Receipts</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium border-y border-gray-200">{formatNum(col.grossReceipts)}</td>)}
              <td className="bg-[#D1D1D1] border-y border-gray-200"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Net Receipts (less VAT)</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.netReceipts)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>

            <tr className="h-8"><td colSpan={reportData.length + 2}></td></tr>

            {/* PROFIT */}
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Gross Profit</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.grossProfit)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                <span>Gross Profit Margin</span>
                <span className="text-gray-400">%</span>
              </td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(col.grossProfitMargin, true)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                <span>Targeted Profit Margin</span>
                <span className="text-gray-400">%</span>
              </td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-gray-800 text-right font-medium">{formatNum(targetMargin, true)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase flex items-center justify-between">
                <span>Variance</span>
                <span className="text-gray-400">%</span>
              </td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-right font-bold">{renderVariance(col.variance, true)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr>
              <td className="p-3 pl-6 text-xs font-bold text-gray-700 uppercase">Cost Variance</td>
              {reportData.map(col => <td key={col.label} className="p-3 text-sm text-right font-bold">{renderVariance(col.costVariance)}</td>)}
              <td className="bg-[#D1D1D1]"></td>
            </tr>
            <tr className="h-4"><td colSpan={reportData.length + 2}></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
