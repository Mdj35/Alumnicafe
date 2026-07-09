import React, { useState, useEffect, useMemo } from 'react';
import { getInventoryItems, InventoryItem, resetOpeningStock, getInventoryPeriods, InventoryPeriod, InventoryPeriodItem, updateInventoryPeriod } from '../../inventoryManager';
import { getMenuCategories } from '../../menuStorage';
import { RefreshCw, Calculator, History, Edit3, Save, X } from 'lucide-react';

export default function StockOpeningClosing() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [periods, setPeriods] = useState<InventoryPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | 'current'>('current');
  const [isResetting, setIsResetting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<Record<string, { opening_stock: number, closing_stock: number }>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_items, _cats, _periods] = await Promise.all([getInventoryItems(), getMenuCategories(), getInventoryPeriods()]);
    setItems(_items);
    setCategories(_cats);
    setPeriods(_periods);
  };

  const handleResetOpeningStock = async () => {
    if (confirm("WARNING: This will set the Opening Stock of all items to their Current Stock and mark the beginning of a new inventory period. Do you want to proceed?")) {
      setIsResetting(true);
      await resetOpeningStock();
      await loadData();
      setIsResetting(false);
      alert("Opening stock reset successfully!");
    }
  };

  const getCatName = (id: string) => id || 'Unknown';

  const selectedPeriod = useMemo(() => periods.find(p => p.id === selectedPeriodId), [periods, selectedPeriodId]);

  const displayItems = useMemo(() => {
    if (selectedPeriodId === 'current') {
      return items.map(item => ({
        id: item.id,
        item_name: item.item_name,
        category_id: item.category_id,
        unit: item.unit,
        cost_price: item.cost_price,
        opening_stock: item.opening_stock,
        closing_stock: item.current_stock
      }));
    }
    return selectedPeriod?.items.map(item => ({
      id: item.item_id,
      item_name: item.item_name,
      category_id: item.category_id,
      unit: item.unit,
      cost_price: item.cost_price,
      opening_stock: item.opening_stock,
      closing_stock: item.closing_stock
    })) || [];
  }, [items, selectedPeriod, selectedPeriodId]);

  const totalOpeningValue = displayItems.reduce((sum, item) => sum + (item.opening_stock * item.cost_price), 0);
  const totalCurrentValue = displayItems.reduce((sum, item) => sum + (item.closing_stock * item.cost_price), 0);
  const totalDifference = totalCurrentValue - totalOpeningValue;

  const handleEditStart = () => {
    const initialEdits: Record<string, { opening_stock: number, closing_stock: number }> = {};
    displayItems.forEach(item => {
      initialEdits[item.id] = { opening_stock: item.opening_stock, closing_stock: item.closing_stock };
    });
    setEditedItems(initialEdits);
    setIsEditing(true);
  };

  const handleEditSave = async () => {
    if (!selectedPeriod) return;
    
    const updatedItems: InventoryPeriodItem[] = selectedPeriod.items.map(item => ({
      ...item,
      opening_stock: editedItems[item.item_id]?.opening_stock ?? item.opening_stock,
      closing_stock: editedItems[item.item_id]?.closing_stock ?? item.closing_stock
    }));

    await updateInventoryPeriod(selectedPeriod.id, updatedItems);
    await loadData(); // refresh periods
    setIsEditing(false);
    alert('Period updated successfully!');
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div className="flex items-center gap-6">
          <div>
            <h3 className="text-xl font-black text-gray-800">Period Management</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Manage stock opening balances and view historical periods.</p>
          </div>
          <div className="h-10 w-px bg-gray-200"></div>
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-400" />
            <select
              value={selectedPeriodId}
              onChange={e => {
                setSelectedPeriodId(e.target.value);
                setIsEditing(false);
              }}
              className="bg-white border-2 border-gray-100 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue outline-none"
            >
              <option value="current">Current Period (Live)</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {formatDate(p.start_date)} - {formatDate(p.end_date)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {selectedPeriodId !== 'current' && (
            isEditing ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-2">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleEditSave} className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            ) : (
              <button onClick={handleEditStart} className="bg-white border-2 border-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:border-gray-200 transition-colors">
                <Edit3 className="w-4 h-4" /> Edit Period
              </button>
            )
          )}
          {selectedPeriodId === 'current' && (
            <button 
              onClick={handleResetOpeningStock} disabled={isResetting}
              className="bg-hcdc-red text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
              {isResetting ? 'Processing...' : 'Start New Inventory Period'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 p-6 border-b border-gray-50 bg-white shrink-0">
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Opening Value</p>
          <h4 className="text-2xl font-black text-gray-800 mt-1">₱ {totalOpeningValue.toFixed(2)}</h4>
        </div>
        <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total Current (Closing) Value</p>
          <h4 className="text-2xl font-black text-hcdc-blue mt-1">₱ {totalCurrentValue.toFixed(2)}</h4>
        </div>
        <div className={`p-5 rounded-2xl border ${totalDifference >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs font-bold uppercase tracking-widest ${totalDifference >= 0 ? 'text-green-600' : 'text-red-600'}`}>Net Difference</p>
          <h4 className={`text-2xl font-black mt-1 ${totalDifference >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {totalDifference >= 0 ? '+' : '-'} ₱ {Math.abs(totalDifference).toFixed(2)}
          </h4>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th className="p-4 pl-6">Item</th>
              <th className="p-4">Category</th>
              <th className="p-4 text-right">Unit Cost</th>
              <th className="p-4 text-right">Opening Qty</th>
              <th className="p-4 text-right">Current Qty</th>
              <th className="p-4 text-right">Qty Diff</th>
              <th className="p-4 text-right">Current Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {displayItems.map(item => {
              const currentItemState = isEditing ? editedItems[item.id] || { opening_stock: item.opening_stock, closing_stock: item.closing_stock } : { opening_stock: item.opening_stock, closing_stock: item.closing_stock };
              const qtyDiff = currentItemState.closing_stock - currentItemState.opening_stock;
              return (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-800">{item.item_name}</td>
                  <td className="p-4 text-sm font-medium text-gray-500">{getCatName(item.category_id)}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">₱ {item.cost_price.toFixed(2)}</td>
                  <td className="p-4 text-sm font-bold text-gray-500 text-right">
                    {isEditing ? (
                      <div className="flex justify-end items-center gap-2">
                        <input type="number" value={currentItemState.opening_stock} onChange={e => setEditedItems({...editedItems, [item.id]: {...currentItemState, opening_stock: parseFloat(e.target.value) || 0}})} className="w-20 text-right px-2 py-1 border border-gray-200 rounded-md focus:border-hcdc-blue outline-none" />
                        <span className="text-xs">{item.unit}</span>
                      </div>
                    ) : (
                      <>{item.opening_stock} {item.unit}</>
                    )}
                  </td>
                  <td className="p-4 text-sm font-black text-hcdc-blue text-right">
                    {isEditing ? (
                      <div className="flex justify-end items-center gap-2">
                        <input type="number" value={currentItemState.closing_stock} onChange={e => setEditedItems({...editedItems, [item.id]: {...currentItemState, closing_stock: parseFloat(e.target.value) || 0}})} className="w-20 text-right px-2 py-1 border border-gray-200 rounded-md focus:border-hcdc-blue outline-none" />
                        <span className="text-xs text-gray-500 font-normal">{item.unit}</span>
                      </div>
                    ) : (
                      <>{item.closing_stock} {item.unit}</>
                    )}
                  </td>
                  <td className={`p-4 text-sm font-bold text-right ${qtyDiff > 0 ? 'text-green-500' : qtyDiff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {qtyDiff > 0 ? '+' : ''}{qtyDiff}
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-800 text-right">₱ {(currentItemState.closing_stock * item.cost_price).toFixed(2)}</td>
                </tr>
              )
            })}
            {displayItems.length === 0 && (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-medium">No items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
