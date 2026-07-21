import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit3, Trash2, Tag, AlertCircle, Package } from 'lucide-react';
import { 
  getInventoryItems, InventoryItem, 
  addInventoryItem, updateInventoryItem, deleteInventoryItem 
} from '../../inventoryManager';
import { getMenuCategories } from '../../menuStorage';

export default function InventoryItems() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [stockFilter, setStockFilter] = useState<'All' | 'Low'>('All');
  
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [form, setForm] = useState({
    item_code: '', item_name: '', category_id: '', unit: 'pcs', purchase_unit: '', usage_unit: '', description: '', supplier: '',
    purchase_price: 0, package_quantity: 1, selling_price: 0, 
    opening_stock: 0, minimum_stock: 0
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
      const matchSearch = i.item_name.toLowerCase().includes(search.toLowerCase()) || (i.item_code && i.item_code.toLowerCase().includes(search.toLowerCase()));
      const matchCat = categoryFilter === 'All' || i.category_id === categoryFilter;
      const matchStock = stockFilter === 'All' || i.current_stock <= i.minimum_stock;
      return matchSearch && matchCat && matchStock;
    });
  }, [items, search, categoryFilter, stockFilter]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto calculate unit_cost for save
    const unit_cost = form.purchase_price / form.package_quantity;

    if (editingItem) {
      const updated = await updateInventoryItem(editingItem.id, {
        ...form,
        unit_cost,
        cost_price: unit_cost
      });
      setItems(updated);
    } else {
      const updated = await addInventoryItem({
        ...form,
        unit_cost,
        cost_price: unit_cost,
        current_stock: form.opening_stock,
        weighted_avg_cost: unit_cost
      });
      setItems(updated);
    }
    setShowModal(false);
    setEditingItem(null);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setForm({
      item_code: item.item_code || '',
      item_name: item.item_name,
      category_id: item.category_id,
      unit: item.usage_unit || item.unit,
      purchase_unit: item.purchase_unit || '',
      usage_unit: item.usage_unit || item.unit,
      description: item.description || '',
      supplier: item.supplier || '',
      purchase_price: item.purchase_price || item.unit_cost, // fallback
      package_quantity: item.package_quantity || 1,
      selling_price: item.selling_price || 0,
      opening_stock: item.opening_stock || 0,
      minimum_stock: item.minimum_stock || 0
    });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditingItem(null);
    // Generate sequential code
    const count = items.length + 1;
    const newCode = `INV-${count.toString().padStart(4, '0')}`;
    
    setForm({
      item_code: newCode,
      item_name: '', category_id: categories[0] || '', unit: 'pcs', purchase_unit: '', usage_unit: 'pcs', description: '', supplier: '',
      purchase_price: 0, package_quantity: 1, selling_price: 0, 
      opening_stock: 0, minimum_stock: 0
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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[700px] max-h-[80vh]">
      <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-gray-50/50">
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4 items-center w-full xl:w-auto flex-1">
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm w-full sm:w-64 md:w-72 focus-within:border-hcdc-blue transition-colors">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input 
              type="text" placeholder="Search code or name..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full outline-none"
            />
          </div>
          <select 
            value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto flex-1 md:flex-none bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue outline-none"
          >
            <option value="All">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select 
            value={stockFilter} onChange={e => setStockFilter(e.target.value as 'All' | 'Low')}
            className="w-full sm:w-auto flex-1 md:flex-none bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl font-bold text-sm focus:border-hcdc-blue outline-none"
          >
            <option value="All">All Stock Levels</option>
            <option value="Low">Low Stock Only</option>
          </select>
        </div>
        <button onClick={openAdd} className="w-full xl:w-auto justify-center bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      <div className="flex-1 overflow-x-auto w-full custom-scrollbar">
        <table className="w-full text-left min-w-[1000px]">
          <thead className="sticky top-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] z-10">
            <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th className="p-4 pl-6">Code</th>
              <th className="p-4">Item Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Purchase Unit</th>
              <th className="p-4">Usage Unit</th>
              <th className="p-4 text-right">Unit Cost</th>
              <th className="p-4 text-right">Selling Price</th>
              <th className="p-4 text-right">Current Stock</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredItems.map(item => {
              const isLow = item.current_stock <= item.minimum_stock;
              return (
                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 pl-6 text-sm font-mono text-gray-500">{item.item_code}</td>
                  <td className="p-4 font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertCircle className="w-4 h-4 text-red-500" title="Low Stock!" />}
                      <div>
                        {item.item_name}
                        {item.description && <div className="text-xs font-normal text-gray-400 mt-0.5">{item.description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-lg text-xs">{getCatName(item.category_id)}</span>
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-500">{item.purchase_unit || '-'}</td>
                  <td className="p-4 text-sm font-medium text-gray-500">{item.usage_unit || item.unit}</td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">
                    ₱{(item.unit_cost || 0).toFixed(2)}
                    <span className="block text-[9px] text-gray-400 font-normal">per {item.unit}</span>
                  </td>
                  <td className="p-4 text-sm font-bold text-gray-700 text-right">
                    {item.selling_price ? `₱${item.selling_price.toFixed(2)}` : '-'}
                  </td>
                  <td className={`p-4 text-sm font-black text-right ${isLow ? 'text-red-600' : 'text-hcdc-blue'}`}>
                    {(item.current_stock || 0).toFixed(2)} <span className="text-xs font-medium">{item.unit}</span>
                  </td>
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
              <tr><td colSpan={7} className="p-10 text-center text-gray-400 font-medium">No items found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl p-6 md:p-8 border border-gray-100 my-auto">
            <h3 className="text-xl font-black text-gray-800 mb-6">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Item Code</label>
                  <input required type="text" value={form.item_code} onChange={e => setForm({...form, item_code: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none font-mono" />
                </div>
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
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                  <input type="text" placeholder="e.g. Arabica beans for espresso" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Purchase Unit</label>
                  <input required type="text" placeholder="e.g. Bag, Box, Kilogram" value={form.purchase_unit} onChange={e => setForm({...form, purchase_unit: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Usage Unit (Internal/Recipe)</label>
                  <input required type="text" placeholder="e.g. Grams, Pcs, ml" value={form.usage_unit} onChange={e => setForm({...form, usage_unit: e.target.value, unit: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Supplier (Optional)</label>
                  <input type="text" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Selling Price (if sold directly)</label>
                  <input type="number" step="0.01" min="0" value={form.selling_price} onChange={e => setForm({...form, selling_price: parseFloat(e.target.value) || 0})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue focus:ring-1 focus:ring-hcdc-blue outline-none" />
                </div>

                <div className="col-span-2 border-t border-gray-100 pt-4 mt-2">
                  <h4 className="text-[10px] font-black uppercase text-hcdc-blue tracking-widest mb-3">Purchasing & Costing</h4>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Purchase Price (Per {form.purchase_unit || 'Unit'})</label>
                  <input required type="number" step="0.01" min="0" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: parseFloat(e.target.value) || 0})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Conversion Factor (Usage Units per Purchase Unit)</label>
                  <input required type="number" step="0.001" min="0.001" value={form.package_quantity} onChange={e => setForm({...form, package_quantity: parseFloat(e.target.value) || 1})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                  <p className="text-[10px] text-gray-400 mt-1">1 {form.purchase_unit || 'Purchase Unit'} = {form.package_quantity} {form.usage_unit || 'Usage Units'}</p>
                </div>
                
                <div className="col-span-2 bg-hcdc-light-blue/30 p-4 rounded-xl flex items-center justify-between border border-hcdc-blue/10">
                  <span className="text-sm font-bold text-gray-600">Calculated Base Unit Cost:</span>
                  <span className="text-xl font-black text-hcdc-blue">
                    ₱{((form.purchase_price || 0) / (form.package_quantity || 1)).toFixed(4)} <span className="text-xs">per {form.unit}</span>
                  </span>
                </div>

                {!editingItem && (
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Opening Stock Qty (in {form.unit})</label>
                    <input required type="number" step="0.01" min="0" value={form.opening_stock} onChange={e => setForm({...form, opening_stock: parseFloat(e.target.value) || 0})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Low Stock Alert Level</label>
                  <input required type="number" step="0.01" min="0" value={form.minimum_stock} onChange={e => setForm({...form, minimum_stock: parseFloat(e.target.value) || 0})} className="w-full mt-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:border-hcdc-blue outline-none" />
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
