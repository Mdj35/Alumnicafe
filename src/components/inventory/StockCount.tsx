import React, { useState, useEffect } from 'react';
import { getStockCounts, StockCount as StockCountType, recordStockCount, getInventoryItems, InventoryItem } from '../../inventoryManager';
import { ClipboardList, AlertCircle, Search } from 'lucide-react';

export default function StockCount() {
  const [counts, setCounts] = useState<StockCountType[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [actualQuantity, setActualQuantity] = useState<number>(0);
  const [countDate, setCountDate] = useState(new Date().toISOString().slice(0,10));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_counts, _items] = await Promise.all([getStockCounts(), getInventoryItems()]);
    setCounts(_counts);
    setItems(_items);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    
    const variance = actualQuantity - selectedItem.current_stock;
    await recordStockCount({
      item_id: selectedItem.id,
      expected_quantity: selectedItem.current_stock,
      actual_quantity: actualQuantity,
      variance,
      count_date: countDate
    });
    
    setShowModal(false);
    await loadData();
    setSelectedItem(null);
    setActualQuantity(0);
  };

  const getItemName = (id: string) => items.find(i => i.id === id)?.item_name || 'Unknown Item';
  
  const filteredItems = items.filter(i => i.item_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-800">Physical Stock Count</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Record physical counts and automatically calculate/adjust variance.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
          <ClipboardList className="w-4 h-4" /> New Count
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th className="p-4 pl-6">Date</th>
              <th className="p-4">Item</th>
              <th className="p-4 text-right">Expected Qty (System)</th>
              <th className="p-4 text-right">Actual Qty (Physical)</th>
              <th className="p-4 text-right">Variance</th>
              <th className="p-4 text-right">Variance Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {counts.map(c => {
              const item = items.find(i => i.id === c.item_id);
              const cost = item ? item.cost_price : 0;
              const vValue = c.variance * cost;
              return (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 text-sm font-bold text-gray-700">{c.count_date}</td>
                  <td className="p-4 font-bold text-gray-800">{getItemName(c.item_id)}</td>
                  <td className="p-4 text-sm font-bold text-gray-500 text-right">{c.expected_quantity}</td>
                  <td className="p-4 text-sm font-black text-hcdc-blue text-right">{c.actual_quantity}</td>
                  <td className={`p-4 text-sm font-black text-right ${c.variance > 0 ? 'text-green-500' : c.variance < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                    {c.variance > 0 ? '+' : ''}{c.variance}
                  </td>
                  <td className={`p-4 text-sm font-bold text-right ${vValue >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {vValue >= 0 ? '+' : '-'} ₱ {Math.abs(vValue).toFixed(2)}
                  </td>
                </tr>
              )
            })}
            {counts.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-medium">No stock counts recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex border border-gray-100 h-[600px]">
            {/* Left side: Item picker */}
            <div className="w-1/2 border-r border-gray-100 bg-gray-50 flex flex-col">
              <div className="p-6 border-b border-gray-100 bg-white shrink-0">
                <h4 className="font-bold text-gray-800 mb-4">Select Item to Count</h4>
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 focus-within:border-hcdc-blue transition-colors">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search item..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full outline-none" />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {filteredItems.map(item => (
                  <button 
                    key={item.id} onClick={() => { setSelectedItem(item); setActualQuantity(item.current_stock); }}
                    className={`w-full text-left p-4 rounded-2xl transition-all ${selectedItem?.id === item.id ? 'bg-hcdc-blue text-white shadow-md' : 'bg-white border border-gray-100 hover:border-hcdc-blue/30'}`}
                  >
                    <div className="font-bold text-sm">{item.item_name}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${selectedItem?.id === item.id ? 'text-white/70' : 'text-gray-400'}`}>
                      Expected: {item.current_stock} {item.unit}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right side: Count form */}
            <div className="w-1/2 bg-white flex flex-col">
              <div className="p-8 flex-1 flex flex-col justify-center">
                {!selectedItem ? (
                  <div className="text-center text-gray-400 flex flex-col items-center gap-4">
                    <ClipboardList className="w-12 h-12 opacity-20" />
                    <p className="font-medium text-sm">Select an item from the left panel to record a physical count.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="text-center mb-8">
                      <h3 className="text-2xl font-black text-gray-800">{selectedItem.item_name}</h3>
                      <p className="text-sm font-medium text-gray-500 mt-1">Expected System Stock: <span className="font-black text-hcdc-blue">{selectedItem.current_stock} {selectedItem.unit}</span></p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Count Date</label>
                      <input required type="date" value={countDate} onChange={e => setCountDate(e.target.value)} className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase">Actual Physical Quantity</label>
                      <input required type="number" step="0.01" min="0" value={actualQuantity} onChange={e => setActualQuantity(parseFloat(e.target.value) || 0)} className="w-full mt-1 px-4 py-3 text-2xl font-black text-center bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                    </div>

                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${actualQuantity === selectedItem.current_stock ? 'bg-gray-50 border-gray-100' : actualQuantity > selectedItem.current_stock ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div className="flex items-center gap-2">
                        {actualQuantity !== selectedItem.current_stock && <AlertCircle className={`w-5 h-5 ${actualQuantity > selectedItem.current_stock ? 'text-green-500' : 'text-red-500'}`} />}
                        <span className="text-sm font-bold text-gray-700">Variance:</span>
                      </div>
                      <span className={`text-xl font-black ${actualQuantity === selectedItem.current_stock ? 'text-gray-400' : actualQuantity > selectedItem.current_stock ? 'text-green-600' : 'text-red-600'}`}>
                        {actualQuantity > selectedItem.current_stock ? '+' : ''}{(actualQuantity - selectedItem.current_stock).toFixed(2)}
                      </span>
                    </div>

                    <p className="text-[10px] text-gray-400 text-center font-medium italic">
                      Saving this count will adjust the system's current stock to match the actual physical quantity and log a variance transaction.
                    </p>

                    <div className="flex justify-end gap-3 pt-6">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Cancel</button>
                      <button type="submit" className="flex-1 py-3 rounded-xl font-bold text-white bg-hcdc-blue hover:bg-hcdc-blue-dark transition-colors shadow-md">
                        Save Count
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
