import React, { useState } from 'react';
import { Database, LogIn, ShoppingBag, ClipboardList, BarChart3, Settings } from 'lucide-react';
import InventoryMaster from './InventoryMaster';
import PurchaseLog from './PurchaseLog';
import StockCount from './StockCount';
import StockOpeningClosing from './StockOpeningClosing';
import InventoryReports from './InventoryReports';

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'master' | 'opening' | 'purchases' | 'count' | 'reports'>('master');

  return (
    <div className="flex flex-col h-full bg-[#F9FAFB]">
      <div className="mb-6 flex space-x-2 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100 w-fit">
        <button
          onClick={() => setActiveTab('master')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'master' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
          }`}
        >
          <Database className="w-4 h-4" /> Master Inventory
        </button>
        <button
          onClick={() => setActiveTab('opening')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'opening' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
          }`}
        >
          <LogIn className="w-4 h-4" /> Period Management
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'purchases' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Purchase Log
        </button>
        <button
          onClick={() => setActiveTab('count')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'count' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
          }`}
        >
          <ClipboardList className="w-4 h-4" /> Stock Count
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'reports' ? 'bg-hcdc-blue text-white shadow-md' : 'text-gray-500 hover:text-hcdc-blue hover:bg-hcdc-light-blue'
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Reports
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'master' && <InventoryMaster />}
        {activeTab === 'opening' && <StockOpeningClosing />}
        {activeTab === 'purchases' && <PurchaseLog />}
        {activeTab === 'count' && <StockCount />}
        {activeTab === 'reports' && <InventoryReports />}
      </div>
    </div>
  );
}
