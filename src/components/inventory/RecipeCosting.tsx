import React, { useState, useEffect } from 'react';
import { getMenuItems, MenuItem, updateMenuItem } from '../../menuStorage';
import { getInventoryItems, getRecipes, saveRecipe, InventoryItem, Recipe, RecipeIngredient } from '../../inventoryManager';
import { UtensilsCrossed, Plus, X, Save, AlertCircle, Search } from 'lucide-react';

export default function RecipeCosting() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  
  const [search, setSearch] = useState('');
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [m, i, r] = await Promise.all([
      getMenuItems(),
      getInventoryItems(),
      getRecipes()
    ]);
    setMenuItems(m);
    setInventoryItems(i);
    setRecipes(r);
  };

  const handleSelectMenuItem = (item: MenuItem) => {
    setSelectedMenuId(item.id);
    const existing = recipes.find(r => r.menu_item_id === item.id);
    if (existing) {
      setEditingRecipe({ ...existing, menu_item_name: item.name, selling_price: item.price });
    } else {
      // Seed ingredients from the menu item's own ingredient list if available
      let seededIngredients: RecipeIngredient[] = [];
      let seededCost = 0;

      if (item.ingredients && item.ingredients.length > 0) {
        seededIngredients = item.ingredients.map(ing => {
          const invItem = inventoryItems.find(i => i.id === ing.inventoryId);
          if (!invItem) return null;
          const unitCost = invItem.unit_cost || 0;
          seededCost += unitCost * ing.quantity;
          return {
            item_id: invItem.id,
            item_name: invItem.item_name,
            quantity: ing.quantity,
            unit: invItem.unit,
            unit_cost: unitCost
          };
        }).filter(Boolean) as RecipeIngredient[];
      }

      const cogsPercent = item.price > 0 ? (seededCost / item.price) * 100 : 0;
      setEditingRecipe({
        id: `recipe_${item.id}`,
        menu_item_id: item.id,
        menu_item_name: item.name,
        selling_price: item.price,
        ingredients: seededIngredients,
        recipe_cost: seededCost,
        cost_per_serving: seededCost,
        food_cost_percentage: cogsPercent,
        gross_profit: item.price - seededCost
      });
    }
  };

  const addIngredient = (invId: string) => {
    if (!editingRecipe || !invId) return;
    const invItem = inventoryItems.find(i => i.id === invId);
    if (!invItem) return;
    
    // Check if already exists
    if (editingRecipe.ingredients.find(i => i.item_id === invId)) return;

    const newIng: RecipeIngredient = {
      item_id: invItem.id,
      item_name: invItem.item_name,
      quantity: 1,
      unit: invItem.unit,
      unit_cost: invItem.unit_cost || 0
    };

    updateRecipeStats({
      ...editingRecipe,
      ingredients: [...editingRecipe.ingredients, newIng]
    });
  };

  const updateIngredientQty = (invId: string, qty: number) => {
    if (!editingRecipe) return;
    const updatedIngs = editingRecipe.ingredients.map(i => 
      i.item_id === invId ? { ...i, quantity: qty } : i
    );
    updateRecipeStats({ ...editingRecipe, ingredients: updatedIngs });
  };

  const removeIngredient = (invId: string) => {
    if (!editingRecipe) return;
    const updatedIngs = editingRecipe.ingredients.filter(i => i.item_id !== invId);
    updateRecipeStats({ ...editingRecipe, ingredients: updatedIngs });
  };

  const updateRecipeStats = (recipe: Recipe) => {
    let cost = 0;
    recipe.ingredients.forEach(ing => {
      // Refresh unit cost from latest inventory just in case
      const currentInvItem = inventoryItems.find(i => i.id === ing.item_id);
      if (currentInvItem) {
        ing.unit_cost = currentInvItem.unit_cost;
      }
      cost += (ing.quantity * ing.unit_cost);
    });

    const cogsPercent = recipe.selling_price > 0 ? (cost / recipe.selling_price) * 100 : 0;
    const profit = recipe.selling_price - cost;

    setEditingRecipe({
      ...recipe,
      recipe_cost: cost,
      cost_per_serving: cost,
      food_cost_percentage: cogsPercent,
      gross_profit: profit
    });
  };

  const handleSaveRecipe = async () => {
    if (!editingRecipe) return;
    await saveRecipe(editingRecipe);
    
    // Sync back to MenuItem to keep both UI sections perfectly matched
    const mappedIngredients = editingRecipe.ingredients.map(ing => ({
      inventoryId: ing.item_id,
      quantity: ing.quantity
    }));
    await updateMenuItem(editingRecipe.menu_item_id, { ingredients: mappedIngredients });

    await loadData();
    alert('Recipe saved successfully!');
  };

  const filteredMenu = menuItems.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex h-[700px]">
      
      {/* LEFT: Menu Items List */}
      <div className="w-1/3 border-r border-gray-100 bg-gray-50/30 flex flex-col">
        <div className="p-6 border-b border-gray-100 bg-white">
          <h3 className="text-xl font-black text-gray-800">Menu Items</h3>
          <p className="text-xs text-gray-500 font-medium mt-1">Select an item to view or edit its recipe.</p>
          
          <div className="mt-4 flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 focus-within:border-hcdc-blue transition-colors">
            <Search className="w-4 h-4 text-gray-400" />
            <input 
              type="text" placeholder="Search menu..." 
              value={search} onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {filteredMenu.map(item => {
            const recipe = recipes.find(r => r.menu_item_id === item.id);
            const isSelected = selectedMenuId === item.id;
            
            return (
              <button 
                key={item.id}
                onClick={() => handleSelectMenuItem(item)}
                className={`w-full text-left p-4 rounded-2xl transition-all border ${
                  isSelected 
                    ? 'bg-hcdc-blue text-white shadow-md border-hcdc-blue' 
                    : 'bg-white border-gray-100 hover:border-hcdc-blue/30'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-sm">{item.name}</div>
                    <div className={`text-[10px] mt-1 uppercase tracking-widest font-black ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                      {item.category}
                    </div>
                  </div>
                  <div className={`text-xs font-black ${isSelected ? 'text-hcdc-gold' : recipe ? 'text-green-500' : 'text-gray-300'}`}>
                    {recipe ? 'Has Recipe' : 'No Recipe'}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* RIGHT: Recipe Editor */}
      <div className="w-2/3 bg-white flex flex-col">
        {!editingRecipe ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <UtensilsCrossed className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-medium text-sm">Select a menu item to build its recipe</p>
          </div>
        ) : (
          <>
            <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-white">
              <div>
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">{editingRecipe.menu_item_name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-sm font-bold text-gray-500">Selling Price: <span className="text-gray-800">₱{(editingRecipe.selling_price || 0).toFixed(2)}</span></span>
                  <div className="h-4 w-px bg-gray-200"></div>
                  <span className={`text-sm font-bold flex items-center gap-1 ${editingRecipe.food_cost_percentage > 40 ? 'text-red-500' : 'text-green-600'}`}>
                    Food Cost: {(editingRecipe.food_cost_percentage || 0).toFixed(1)}%
                    {editingRecipe.food_cost_percentage > 40 && <AlertCircle className="w-3 h-3" title="High Food Cost!" />}
                  </span>
                </div>
              </div>
              <button onClick={handleSaveRecipe} className="bg-hcdc-blue text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-hcdc-blue-dark transition-colors shadow-md">
                <Save className="w-4 h-4" /> Save Recipe
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 p-6 border-b border-gray-50 bg-gray-50/30">
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Recipe Cost</p>
                <h4 className="text-2xl font-black text-gray-800">₱ {(editingRecipe.recipe_cost || 0).toFixed(2)}</h4>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Gross Profit / Serving</p>
                <h4 className="text-2xl font-black text-green-600">₱ {(editingRecipe.gross_profit || 0).toFixed(2)}</h4>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Food Cost %</p>
                <h4 className={`text-2xl font-black ${editingRecipe.food_cost_percentage > 40 ? 'text-red-500' : 'text-hcdc-blue'}`}>
                  {(editingRecipe.food_cost_percentage || 0).toFixed(2)}%
                </h4>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Ingredients</h3>
                
                <div className="flex items-center gap-2">
                  <select 
                    className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-sm focus:border-hcdc-blue outline-none max-w-[200px]"
                    onChange={(e) => {
                      addIngredient(e.target.value);
                      e.target.value = ""; // reset
                    }}
                    value=""
                  >
                    <option value="" disabled>+ Add Ingredient...</option>
                    {inventoryItems.map(inv => (
                      <option key={inv.id} value={inv.id}>{inv.item_name} (Cost: ₱{(inv.unit_cost || 0).toFixed(2)}/{inv.unit})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto border border-gray-100 rounded-2xl">
                <table className="w-full text-left">
                  <thead className="sticky top-0 bg-gray-50 shadow-[0_1px_0_rgba(0,0,0,0.05)] z-10">
                    <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-black">
                      <th className="p-4">Item Name</th>
                      <th className="p-4 text-right">Quantity Required</th>
                      <th className="p-4 text-right">Unit Cost</th>
                      <th className="p-4 text-right">Total Cost</th>
                      <th className="p-4 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {editingRecipe.ingredients.map(ing => (
                      <tr key={ing.item_id} className="hover:bg-gray-50/50 transition-colors bg-white">
                        <td className="p-4 font-bold text-gray-800">{ing.item_name}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <input 
                              type="number" step="0.01" min="0" 
                              value={ing.quantity} 
                              onChange={e => updateIngredientQty(ing.item_id, parseFloat(e.target.value) || 0)} 
                              className="w-20 text-right px-2 py-1 bg-gray-50 border border-gray-200 rounded-md focus:border-hcdc-blue outline-none font-bold text-sm" 
                            />
                            <span className="text-xs text-gray-500 font-medium">{ing.unit}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-500 text-right">₱ {(ing.unit_cost || 0).toFixed(4)}</td>
                        <td className="p-4 text-sm font-black text-hcdc-blue text-right">₱ {((ing.quantity || 0) * (ing.unit_cost || 0)).toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <button onClick={() => removeIngredient(ing.item_id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {editingRecipe.ingredients.length === 0 && (
                      <tr><td colSpan={5} className="p-10 text-center text-gray-400 font-medium bg-white">No ingredients added yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
