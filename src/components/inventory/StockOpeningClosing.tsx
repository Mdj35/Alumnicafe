import React, { useState, useEffect } from 'react';
import { getInventoryItems, getOpeningStocks, saveOpeningStock, updateOpeningStock, deleteOpeningStock, InventoryItem, OpeningStockEntry, OpeningStockItem } from '../../inventoryManager';
import { Play, Search, Save, AlertTriangle } from 'lucide-react';

export default function StockOpeningClosing() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<OpeningStockEntry[]>([]);
  
  const [search, setSearch] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0,10));
  const [notes, setNotes] = useState('');
  
  const [entryItems, setEntryItems] = useState<Record<string, number>>({});
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_items, _hist] = await Promise.all([getInventoryItems(), getOpeningStocks()]);
    setItems(_items);
    setHistory(_hist);
  };

  const handleStartRecording = () => {
    const initial: Record<string, number> = {};
    items.forEach(i => initial[i.id] = i.current_stock);
    setEntryItems(initial);
    setEditingEntryId(null);
    setDate(new Date().toISOString().slice(0,10));
    setNotes('');
    setIsRecording(true);
  };

  const handleEdit = (entry: OpeningStockEntry) => {
    const initial: Record<string, number> = {};
    entry.items.forEach(i => initial[i.item_id] = i.qty);
    setEntryItems(initial);
    setEditingEntryId(entry.id);
    setDate(entry.date);
    setNotes(entry.notes || '');
    setIsRecording(true);
  };

  const handleDelete = async (entry: OpeningStockEntry) => {
    if (!confirm("Are you sure you want to delete this opening stock entry?")) return;
    await deleteOpeningStock(entry.id);
    await loadData();
    alert('Opening Stock deleted successfully!');
  };

  const handleSave = async () => {
    if (editingEntryId) {
      if (!confirm("Are you sure you want to update this opening stock record? This will adjust current stock levels based on the difference.")) return;
      
      const openingItems: OpeningStockItem[] = [];
      let totalVal = 0;

      for (const item of items) {
        const qty = entryItems[item.id] ?? 0; // If editing, default to 0 if not set
        if (qty > 0) { // Only save items with stock > 0 to keep history clean, or maybe keep all?
           // Actually, let's keep it consistent.
        }
      }
      
      // A better approach for editing: just use the items that have qty, or all items.
      for (const item of items) {
        const qty = entryItems[item.id] ?? (items.find(i => i.id === item.id)?.current_stock || 0); // fallback
        const val = qty * item.unit_cost;
        totalVal += val;
        
        openingItems.push({
          item_id: item.id,
          qty,
          unit_cost: item.unit_cost,
          value: val
        });
      }

      await updateOpeningStock(editingEntryId, {
        date,
        items: openingItems,
        total_value: totalVal,
        notes
      });
      alert('Opening Stock updated successfully!');

    } else {
      if (!confirm("Are you sure you want to save this opening stock? This will reset the current stock for all included items.")) return;

      const openingItems: OpeningStockItem[] = [];
      let totalVal = 0;

      for (const item of items) {
        const qty = entryItems[item.id] ?? item.current_stock;
        const val = qty * item.unit_cost;
        totalVal += val;
        
        openingItems.push({
          item_id: item.id,
          qty,
          unit_cost: item.unit_cost,
          value: val
        });
      }

      await saveOpeningStock({
        date,
        items: openingItems,
        total_value: totalVal,
        notes
      });
      alert('Opening Stock saved successfully!');
    }

    setIsRecording(false);
    setEditingEntryId(null);
    await loadData();
  };

  const filteredItems = items.filter(i => 
    i.item_name.toLowerCase().includes(search.toLowerCase()) || 
    (i.item_code && i.item_code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-[700px]">
      
      {/* LEFT: History */}
      <div className="w-1/3 border-r border-gray-100 bg-gray-50/30 flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-white">
          <h3 className="text-xl font-black text-gray-800">Opening Stock History</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Previous period starting points.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {history.map(entry => (
            <div key={entry.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-gray-800 text-sm">{new Date(entry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                <span className="text-xs font-black text-hcdc-blue bg-hcdc-light-blue px-2 py-1 rounded-lg">
                  ₱{entry.total_value.toLocaleString('en-PH', {minimumFractionDigits: 2})}
                </span>
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{entry.notes || 'No notes provided'}</p>
              <div className="mt-3 flex justify-between items-center">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  {entry.items.length} Items Recorded
                </div>
                <div className="flex gap-2 flex">
                  <button onClick={() => handleEdit(entry)} className="text-xs text-hcdc-blue font-bold hover:underline">Edit</button>
                  <button onClick={() => handleDelete(entry)} className="text-xs text-red-500 font-bold hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center p-8 text-gray-400 text-sm font-medium">No history found.</div>
          )}
        </div>
      </div>

      {/* RIGHT: Active Entry */}
      <div className="w-2/3 bg-white flex flex-col">
        {!isRecording ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-hcdc-light-blue flex items-center justify-center mb-6">
              <Play className="w-8 h-8 text-hcdc-blue ml-1" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Record Opening Stock</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">
              Set the starting inventory balance for a new period. This will snapshot current costs and reset stock levels to your physical count.
            </p>
            <button 
              onClick={handleStartRecording}
              className="bg-hcdc-blue text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 duration-200"
            >
              <Play className="w-4 h-4" /> Start Entry
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-white shrink-0">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <h2 className="text-2xl font-black text-gray-800 tracking-tight">{editingEntryId ? 'Edit Entry' : 'Active Entry'}</h2>
                  <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {editingEntryId ? 'Editing Past Record' : 'Unsaved'}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 max-w-lg">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:border-hcdc-blue outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Notes / Period Name</label>
                    <input type="text" placeholder="e.g. Oct 2026 Opening" value={notes} onChange={e => setNotes(e.target.value)} className="w-full mt-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-bold focus:border-hcdc-blue outline-none" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 ml-4">
                <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-700 transition-colors shadow-md whitespace-nowrap">
                  <Save className="w-4 h-4" /> {editingEntryId ? 'Update Record' : 'Save & Finalize'}
                </button>
                <button onClick={() => { setIsRecording(false); setEditingEntryId(null); }} className="text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 focus-within:border-hcdc-blue transition-colors max-w-sm">
                <Search className="w-4 h-4 text-gray-400" />
                <input 
                  type="text" placeholder="Search item..." 
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 bg-white">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white shadow-[0_1px_0_rgba(0,0,0,0.05)] z-10">
                  <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                    <th className="p-4 pl-6">Code</th>
                    <th className="p-4">Item Name</th>
                    <th className="p-4 text-right">Unit Cost</th>
                    <th className="p-4 text-right">System Stock</th>
                    <th className="p-4 text-right">Actual Opening Qty</th>
                    <th className="p-4 pr-6 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredItems.map(item => {
                    const qty = entryItems[item.id] ?? (editingEntryId ? 0 : 0);
                    const val = qty * (item.unit_cost || 0);
                    const isDiff = !editingEntryId && qty !== (item.current_stock || 0);
                    
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50/50 transition-colors ${isDiff ? 'bg-yellow-50/20' : 'bg-white'}`}>
                        <td className="p-4 pl-6 text-sm font-mono text-gray-500">{item.item_code}</td>
                        <td className="p-4 font-bold text-gray-800">{item.item_name}</td>
                        <td className="p-4 text-sm font-bold text-gray-500 text-right">₱{(item.unit_cost || 0).toFixed(4)}</td>
                        <td className="p-4 text-sm font-bold text-gray-400 text-right">{(item.current_stock || 0).toFixed(2)} {item.usage_unit || item.unit}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <input 
                              type="number" step="0.01" min="0" 
                              value={qty} 
                              onChange={e => setEntryItems({...entryItems, [item.id]: parseFloat(e.target.value) || 0})}
                              className={`w-24 text-right px-3 py-1.5 border rounded-lg outline-none font-bold text-sm focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue
                                ${isDiff ? 'border-yellow-300 bg-yellow-50 text-yellow-900' : 'border-gray-200 bg-gray-50 text-gray-800'}`}
                            />
                            <span className="text-xs text-gray-500 font-medium w-6 text-left">{item.usage_unit || item.unit}</span>
                          </div>
                        </td>
                        <td className="p-4 pr-6 text-sm font-black text-hcdc-blue text-right">₱{val.toFixed(2)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
