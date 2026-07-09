import React, { useState, useEffect } from 'react';
import { getPurchases, Purchase, logPurchase, getInventoryItems, InventoryItem } from '../../inventoryManager';
import { Plus, ShoppingBag } from 'lucide-react';

export default function PurchaseLog() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    supplier: '', purchase_date: new Date().toISOString().slice(0,10), item_id: '', quantity: 0, unit_cost: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_purchases, _items] = await Promise.all([getPurchases(), getInventoryItems()]);
    setPurchases(_purchases);
    setItems(_items);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.item_id || form.quantity <= 0) return;
    
    await logPurchase({
      ...form,
      total_cost: form.quantity * form.unit_cost
    });
    
    setShowModal(false);
    await loadData();
    setForm({ supplier: '', purchase_date: new Date().toISOString().slice(0,10), item_id: '', quantity: 0, unit_cost: 0 });
  };

  const getItemName = (id: string) => items.find(i => i.id === id)?.item_name || 'Unknown Item';

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-800">Purchase Log</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Record incoming stock and automatically update inventory quantities.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Purchases</p>
            <p className="text-xl font-black text-hcdc-blue">₱ {totalPurchaseValue.toFixed(2)}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
            <Plus className="w-4 h-4" /> Record Purchase
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th className="p-4 pl-6">Date</th>
              <th className="p-4">Supplier</th>
              <th className="p-4">Item Purchased</th>
              <th className="p-4 text-right">Quantity</th>
              <th className="p-4 text-right">Unit Cost</th>
              <th className="p-4 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {purchases.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="p-4 pl-6 text-sm font-bold text-gray-700">{p.purchase_date}</td>
                <td className="p-4 text-sm font-medium text-gray-500">{p.supplier || 'N/A'}</td>
                <td className="p-4 font-bold text-gray-800">{getItemName(p.item_id)}</td>
                <td className="p-4 text-sm font-black text-gray-700 text-right">{p.quantity}</td>
                <td className="p-4 text-sm font-bold text-gray-500 text-right">₱ {p.unit_cost.toFixed(2)}</td>
                <td className="p-4 text-sm font-black text-hcdc-blue text-right">₱ {p.total_cost.toFixed(2)}</td>
              </tr>
            ))}
            {purchases.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400 font-medium">No purchases recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-hcdc-light-blue text-hcdc-blue flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-gray-800">Record Purchase</h3>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Purchase Date</label>
                <input required type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Item</label>
                <select required value={form.item_id} onChange={e => {
                  const selItem = items.find(i => i.id === e.target.value);
                  setForm({...form, item_id: e.target.value, unit_cost: selItem ? selItem.cost_price : form.unit_cost});
                }} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none">
                  <option value="" disabled>Select Item...</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.item_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Supplier</label>
                <input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
                  <input required type="number" step="0.01" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Unit Cost</label>
                  <input required type="number" step="0.01" min="0" value={form.unit_cost} onChange={e => setForm({...form, unit_cost: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
              </div>
              <div className="pt-4 mt-2 border-t border-dashed border-gray-200 flex justify-between items-end">
                <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest pb-1">Total Cost</span>
                <span className="text-2xl font-black text-hcdc-red tracking-tighter">
                  ₱ {(form.quantity * form.unit_cost || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white bg-hcdc-blue hover:bg-hcdc-blue-dark transition-colors shadow-md">
                  Confirm Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
