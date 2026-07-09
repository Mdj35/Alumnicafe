import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit3, Trash2, Tag, AlertCircle } from 'lucide-react';
import { 
  getInventoryItems, InventoryItem, 
  addInventoryItem, updateInventoryItem, deleteInventoryItem 
} from '../../inventoryManager';
import { getMenuCategories } from '../../menuStorage';

export default function InventoryMaster() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low'>('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({
    item_name: '', category_id: '', unit: 'pcs', 
    cost_price: 0, selling_price: 0, opening_stock: 0, minimum_stock: 0, supplier: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [_items, _cats] = await Promise.all([getInventoryItems(), getMenuCategories()]);
    setItems(_items);
    setCategories(_cats);
  };

  const filteredItems = useMemo(() => {
    return items.filter(i => {
      const matchSearch = i.item_name.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === 'All' || i.category_id === categoryFilter;
      const matchStock = stockFilter === 'All' || i.current_stock <= i.minimum_stock;
      return matchSearch && matchCat && matchStock;
    });
  }, [items, search, categoryFilter, stockFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      const updated = await updateInventoryItem(editingItem.id, form);
      setItems(updated);
    } else {
      const updated = await addInventoryItem({
        ...form,
        current_stock: form.opening_stock,
      });
      setItems(updated);
    }
    setShowModal(false);
    setEditingItem(null);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      item_name: item.item_name,
      category_id: item.category_id,
      unit: item.unit,
      cost_price: item.cost_price,
      selling_price: item.selling_price,
      opening_stock: item.opening_stock,
      minimum_stock: item.minimum_stock,
      supplier: item.supplier || ''
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingItem(null);
    setForm({
      item_name: '', category_id: categories[0] || '', unit: 'pcs', 
      cost_price: 0, selling_price: 0, opening_stock: 0, minimum_stock: 0, supplier: ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this inventory item?")) {
      setItems(await deleteInventoryItem(id));
    }
  };

  const getCatName = (id: string) => id || 'Unknown';

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px]">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
        <div className="flex gap-4 items-center flex-1">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm w-72">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" placeholder="Search items..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full"
            />
          </div>
          <select 
            value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={stockFilter} onChange={e => setStockFilter(e.target.value as 'All' | 'Low')}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue outline-none"
          >
            <option value="All">All Stock Levels</option>
            <option value="Low">Low Stock Only</option>
          </select>
        </div>
        <button onClick={openAdd} className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th className="p-4 pl-6">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Unit</th>
              <th className="p-4 text-right">Cost Price</th>
              <th className="p-4 text-right">Selling Price</th>
              <th className="p-4 text-right">Current Stock</th>
              <th className="p-4 text-right">Stock Value</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredItems.map(item => {
              const isLow = item.current_stock <= item.minimum_stock;
              return (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 font-bold text-gray-800 flex items-center gap-2">
                    {isLow && <AlertCircle className="w-4 h-4 text-red-500" title="Low Stock!" />}
                    {item.item_name}
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs">{getCatName(item.category_id)}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-500">{item.unit}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">₱ {(item.cost_price || 0).toFixed(2)}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">₱ {(item.selling_price || 0).toFixed(2)}</td>
                  <td className={`p-4 text-sm font-black text-right ${isLow ? 'text-red-600' : 'text-hcdc-blue'}`}>
                    {(item.current_stock || 0).toFixed(2)}
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-800 text-right">₱ {((item.current_stock || 0) * (item.cost_price || 0)).toFixed(2)}</td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-hcdc-blue hover:bg-hcdc-light-blue rounded-lg transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filteredItems.length === 0 && (
              <tr><td colSpan={8} className="p-10 text-center text-gray-400 font-medium">No items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-8 border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 mb-6">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Item Name</label>
                  <input required type="text" value={form.item_name} onChange={e => setForm({...form, item_name: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                  <select required value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none">
                    <option value="" disabled>Select Category...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Unit of Measurement</label>
                  <input required type="text" placeholder="e.g. pcs, kg, ml" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Supplier (Optional)</label>
                  <input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Cost Price</label>
                  <input required type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm({...form, cost_price: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Selling Price</label>
                  <input required type="number" step="0.01" min="0" value={form.selling_price} onChange={e => setForm({...form, selling_price: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                {!editingItem && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Opening Stock Qty</label>
                    <input required type="number" step="0.01" min="0" value={form.opening_stock} onChange={e => setForm({...form, opening_stock: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Minimum Stock Level</label>
                  <input required type="number" step="0.01" min="0" value={form.minimum_stock} onChange={e => setForm({...form, minimum_stock: parseFloat(e.target.value)})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl font-bold text-white bg-hcdc-blue hover:bg-hcdc-blue-dark transition-colors shadow-md">
                  {editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
