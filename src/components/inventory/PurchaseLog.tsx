import React, { useState, useEffect } from 'react';
import { getPurchases, Purchase, logPurchase, getInventoryItems, InventoryItem } from '../../inventoryManager';
import { Plus, ShoppingBag, Package } from 'lucide-react';

export default function PurchaseLog() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    supplier: '', purchase_date: new Date().toISOString().slice(0,10), 
    item_id: '', purchase_qty: 0, package_quantity: 1, purchase_price: 0, note: ''
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
    if (!form.item_id || form.purchase_qty <= 0) return;
    
    await logPurchase({
      item_id: form.item_id,
      supplier: form.supplier,
      purchase_date: form.purchase_date,
      purchase_qty: form.purchase_qty,
      package_quantity: form.package_quantity,
      purchase_price: form.purchase_price,
      note: form.note
    });
    
    setShowModal(false);
    await loadData();
    setForm({ 
      supplier: '', purchase_date: new Date().toISOString().slice(0,10), 
      item_id: '', purchase_qty: 0, package_quantity: 1, purchase_price: 0, note: '' 
    });
  };

  const getItemName = (id: string) => items.find(i => i.id === id)?.item_name || 'Unknown Item';
  const getUnit = (id: string) => items.find(i => i.id === id)?.unit || '';

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.total_cost, 0);

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-xl font-black text-gray-800">Purchase Log</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Record purchases. Auto-calculates weighted average unit cost.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Purchases</p>
            <p className="text-xl font-black text-hcdc-blue">₱ {totalPurchaseValue.toLocaleString('en-PH', {minimumFractionDigits:2})}</p>
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
              <th className="p-4">Item Purchased</th>
              <th className="p-4">Supplier</th>
              <th className="p-4 text-right">Pack Qty / Yield</th>
              <th className="p-4 text-right">Packs Bought</th>
              <th className="p-4 text-right">Total Base Qty</th>
              <th className="p-4 text-right">Pack Price</th>
              <th className="p-4 text-right">Base Unit Cost</th>
              <th className="p-4 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {purchases.map(p => {
              const unit = getUnit(p.item_id);
              return (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 text-sm font-bold text-gray-700">{p.purchase_date}</td>
                  <td className="p-4 font-bold text-gray-800">{getItemName(p.item_id)}</td>
                  <td className="p-4 text-sm font-medium text-gray-500">{p.supplier || '-'}</td>
                  
                  <td className="p-4 text-sm font-medium text-gray-500 text-right">{p.package_quantity || 1} {unit}</td>
                  <td className="p-4 text-sm font-black text-gray-700 text-right">{p.purchase_qty || p.quantity}</td>
                  <td className="p-4 text-sm font-bold text-hcdc-blue text-right">{p.quantity} {unit}</td>
                  
                  <td className="p-4 text-sm font-bold text-gray-500 text-right">₱{(p.purchase_price || 0).toFixed(2)}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right border-l border-gray-100 bg-gray-50/50">₱{(p.unit_cost || (p.total_cost / p.quantity) || 0).toFixed(4)}</td>
                  <td className="p-4 text-sm font-black text-hcdc-blue text-right">₱{(p.total_cost || 0).toFixed(2)}</td>
                </tr>
              )
            })}
            {purchases.length === 0 && (
              <tr><td colSpan={9} className="p-10 text-center text-gray-400 font-medium">No purchases recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-hcdc-light-blue text-hcdc-blue flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-gray-800">Record Purchase</h3>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Purchase Date</label>
                  <input required type="date" value={form.purchase_date} onChange={e => setForm({...form, purchase_date: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Item</label>
                  <select required value={form.item_id} onChange={e => {
                    const selItem = items.find(i => i.id === e.target.value);
                    if (selItem) {
                      setForm({
                        ...form, 
                        item_id: e.target.value, 
                        purchase_price: selItem.purchase_price || 0,
                        package_quantity: selItem.package_quantity || 1,
                        supplier: selItem.supplier || ''
                      });
                    }
                  }} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none">
                    <option value="" disabled>Select Item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.item_code ? `${i.item_code} - ` : ''}{i.item_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Supplier</label>
                  <input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Notes (Ref / OR #)</label>
                  <input type="text" value={form.note} onChange={e => setForm({...form, note: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>

                <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-[10px] font-black uppercase text-hcdc-blue tracking-widest mb-3">Quantities & Costs</h4>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Number of Packs Bought</label>
                  <input required type="number" step="0.01" min="0" value={form.purchase_qty} onChange={e => setForm({...form, purchase_qty: parseFloat(e.target.value) || 0})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Purchase Price (Per Pack)</label>
                  <input required type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: parseFloat(e.target.value) || 0})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
                    <Package className="w-3 h-3"/> Yield / Quantity per Pack {form.item_id ? `(in ${getUnit(form.item_id)})` : ''}
                  </label>
                  <input required type="number" step="0.01" min="0.01" value={form.package_quantity} onChange={e => setForm({...form, package_quantity: parseFloat(e.target.value) || 1})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                  <p className="text-[10px] text-gray-400 mt-1">Updates the item's default package quantity</p>
                </div>
              </div>

              <div className="col-span-2 bg-hcdc-light-blue/30 p-4 rounded-xl flex items-center justify-between border border-hcdc-blue/10 mt-4">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">New Base Unit Cost</p>
                  <p className="text-sm font-bold text-gray-800">
                    ₱{((form.purchase_price || 0) / (form.package_quantity || 1)).toFixed(4)} 
                    {form.item_id ? <span className="text-xs text-gray-500 font-normal ml-1">per {getUnit(form.item_id)}</span> : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Total Invoice Amount</p>
                  <p className="text-2xl font-black text-hcdc-red">
                    ₱{((form.purchase_qty || 0) * (form.purchase_price || 0)).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4">
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
