import React, { useState } from 'react';
import { Home, Database, LogIn, ShoppingBag, Calculator, UtensilsCrossed, BarChart3 } from 'lucide-react';
import InvDashboardHome from './InvDashboardHome';
import InventoryItems from './InventoryItems';
import PurchaseLog from './PurchaseLog';
import StockOpeningClosing from './StockOpeningClosing';
import RecipeCosting from './RecipeCosting';
import InventoryCostCalculator from './InventoryCostCalculator';
import InventoryReportsNew from './InventoryReportsNew';

type TabType = 'home' | 'items' | 'purchases' | 'opening' | 'recipes' | 'valuation' | 'reports';

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const navItems = [
    { id: 'home', icon: <Home className="w-4 h-4" />, label: 'Dashboard' },
    { id: 'items', icon: <Database className="w-4 h-4" />, label: 'Items' },
    { id: 'purchases', icon: <ShoppingBag className="w-4 h-4" />, label: 'Purchases' },
    { id: 'opening', icon: <LogIn className="w-4 h-4" />, label: 'Opening Stock' },
    { id: 'recipes', icon: <UtensilsCrossed className="w-4 h-4" />, label: 'Recipe Costing' },
    { id: 'valuation', icon: <Calculator className="w-4 h-4" />, label: 'Valuation' },
    { id: 'reports', icon: <BarChart3 className="w-4 h-4" />, label: 'Reports' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <div className="mb-6 flex space-x-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit overflow-x-auto custom-scrollbar">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === item.id 
                ? 'bg-hcdc-blue text-white shadow-md' 
                : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
            }`}
          >
            {item.icon} {item.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'home' && <InvDashboardHome setActiveTab={(tab) => setActiveTab(tab as TabType)} />}
        {activeTab === 'items' && <InventoryItems />}
        {activeTab === 'purchases' && <PurchaseLog />}
        {activeTab === 'opening' && <StockOpeningClosing />}
        {activeTab === 'recipes' && <RecipeCosting />}
        {activeTab === 'valuation' && <InventoryCostCalculator />}
        {activeTab === 'reports' && <InventoryReportsNew />}
      </div>
    </div>
  );
}
