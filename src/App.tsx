import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTransaction, updateCashierNames } from './transactions';
import { getMenuItems, MenuItem, addMenuItem, deleteMenuItem, getMenuCategories } from './menuStorage';
import { getCashiers, addCashier, deleteCashier, CashierAccount } from './cashierStorage';
import { getInventory, saveInventory, Inventory } from './inventoryStorage';
import {
  Coffee,
  ChevronRight,
  Clock,
  User,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  X,
  CreditCard,
  Search,
  ShoppingCart,
  Tag,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  LayoutDashboard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  icon: string;
  image?: string;
  ingredients?: { inventoryId: string; quantity: number }[];
}

interface CartItem extends Product {
  quantity: number;
}

type DiscountType = 'REGULAR' | 'PWD' | 'SENIOR' | 'ALUMNI';

const VAT_RATE = 0.12;

export default function App() {
  const navigate = useNavigate();

  // Authentication check
  useEffect(() => {
    const isAuth = localStorage.getItem('cashier_auth') === 'true';
    if (!isAuth) {
      navigate('/login');
    } else {
      // Migrate legacy staff name to current cashier name
      const name = localStorage.getItem('cashier_name');
      if (name) {
        (async () => {
          await updateCashierNames('Staff 01', name);
        })();
      }
    }
  }, [navigate]);

  const cashierName = localStorage.getItem('cashier_name') || 'Staff 01';

  const handleLogout = () => {
    localStorage.removeItem('cashier_auth');
    localStorage.removeItem('cashier_name');
    navigate('/login');
  };

  // --- States ---
  const [currentCategory, setCurrentCategory] = useState('All Items');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<DiscountType>('REGULAR');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [time, setTime] = useState(new Date());
  const [txnNumber, setTxnNumber] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCartExpanded, setIsCartExpanded] = useState(true);
  const [animations, setAnimations] = useState<{ id: number; key: number }[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [inventory, setInventory] = useState<Inventory>([]);
  
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: 'Coffee', icon: '☕' });

  // --- Effects ---
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const [p, c, i] = await Promise.all([
        getMenuItems(),
        getMenuCategories(),
        getInventory()
      ]);
      if (isMounted) {
        setProducts(p);
        setCategories(c);
        setInventory(i);
      }
    };
    loadData();

    const timer = setInterval(() => setTime(new Date()), 1000);
    // Refresh menu items periodically in case admin changes them
    const refresh = setInterval(loadData, 2000);
    return () => { 
      isMounted = false;
      clearInterval(timer); 
      clearInterval(refresh); 
    };
  }, []);

  useEffect(() => {
    const savedTxn = sessionStorage.getItem('lastTxn') || '0';
    const nextTxn = (parseInt(savedTxn) + 1).toString().padStart(4, '0');
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    setTxnNumber(`TXN-${dateStr}-${nextTxn}`);
  }, [showReceipt]);

  // --- Calculations ---
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesCategory = currentCategory === 'All Items' || p.category === currentCategory;
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [currentCategory, searchQuery, products]);

  const discountRate = useMemo(() => {
    switch (discountType) {
      case 'PWD': return 0.20;
      case 'SENIOR': return 0.20;
      case 'ALUMNI': return 0.15;
      default: return 0;
    }
  }, [discountType]);

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * discountRate;
  const taxableAmount = (subtotal - discountAmount) / (1 + VAT_RATE);
  const vatAmount = subtotal - discountAmount - taxableAmount;
  const total = subtotal - discountAmount;

  const cash = parseFloat(cashTendered) || 0;
  const change = Math.max(0, cash - total);

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // --- Handlers ---
  const usedInventory = useMemo(() => {
    const usage: Record<string, number> = {};
    cart.forEach(item => {
      if (item.ingredients) {
        item.ingredients.forEach(ing => {
          usage[ing.inventoryId] = (usage[ing.inventoryId] || 0) + (ing.quantity * item.quantity);
        });
      }
    });
    return usage;
  }, [cart]);

  const canAddProduct = (product: Product, deltaQty: number) => {
    if (!product.ingredients) return true;
    for (const ing of product.ingredients) {
      const required = ing.quantity * deltaQty;
      const alreadyUsed = usedInventory[ing.inventoryId] || 0;
      const stockItem = inventory.find(i => i.id === ing.inventoryId);
      const stockQty = stockItem ? stockItem.quantity : 0;
      if (alreadyUsed + required > stockQty) return false;
    }
    return true;
  };

  const addToCart = (product: Product) => {
    if (!canAddProduct(product, 1)) {
      alert(`Cannot add ${product.name}, insufficient inventory!`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    // Quick +1 animation
    setAnimations(prev => [...prev, { id: product.id, key: Date.now() }]);
    setTimeout(() => {
      setAnimations(prev => prev.slice(1));
    }, 1000);
  };

  const updateQuantity = (id: number, delta: number) => {
    if (delta > 0) {
      const product = products.find(p => p.id === id) || cart.find(p => p.id === id);
      if (product && !canAddProduct(product, delta)) {
        alert(`Cannot add more, insufficient inventory!`);
        return;
      }
    }
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const clearOrder = () => {
    if (confirm('Are you sure you want to clear the current order?')) {
      setCart([]);
      setDiscountType('REGULAR');
      setCashTendered('');
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      alert('Your cart is empty!');
      return;
    }
    const cash = parseFloat(cashTendered) || 0;
    if (cash < total) {
      alert('Insufficient cash tendered!');
      return;
    }

    // Save transaction to local database
    const now = new Date();
    await saveTransaction({
      id: txnNumber,
      date: now.toISOString(),
      time: now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', hour12: true }),
      cashier: cashierName,
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.category,
      })),
      subtotal,
      discountType,
      discountRate,
      discountAmount,
      vatAmount,
      total,
      cashTendered: cash,
      change: Math.max(0, cash - total),
    });

    // Deduct inventory
    const newInventory = inventory.map(stock => {
      const used = usedInventory[stock.id] || 0;
      return { ...stock, quantity: Math.max(0, stock.quantity - used) };
    });
    await saveInventory(newInventory);
    setInventory(newInventory);

    setShowReceipt(true);
    setShowPaymentModal(false);
  };

  const startNewTransaction = () => {
    const lastNum = txnNumber.split('-').pop() || '0';
    sessionStorage.setItem('lastTxn', parseInt(lastNum).toString());
    setCart([]);
    setDiscountType('REGULAR');
    setCashTendered('');
    setShowReceipt(false);
    setShowPaymentModal(false);
  };

  const formatCurrency = (num: number) => {
    return '₱' + num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };



  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  // --- UI Components ---
  return (
    <div className="flex flex-col h-screen select-none no-print">
      {/* Header Bar */}
      <header className="h-20 bg-gradient-to-r from-hcdc-blue to-hcdc-blue-dark flex items-center justify-between px-10 text-white shadow-xl shrink-0 z-20">
        <div className="flex items-center gap-5">
          <div className="bg-white p-2 rounded-xl shadow-lg">
            <span className="text-2xl leading-none">🦅</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-xl leading-tight tracking-tight">AlumniCafe</h1>
            <p className="text-[11px] uppercase tracking-[0.2em] text-hcdc-gold font-semibold">Holy Cross of Davao College</p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          <div className="flex items-center gap-4 bg-white/5 px-6 py-2 rounded-full border border-white/10 backdrop-blur-sm">
            <Clock className="w-4 h-4 text-hcdc-gold" />
            <span className="text-sm font-semibold tabular-nums tracking-wide">
              {formatDate(time)} <span className="mx-2 opacity-30">|</span> {formatTime(time)}
            </span>
          </div>



          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold">{cashierName}</p>
              <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">Terminal #01</p>
            </div>
            <div className="flex items-center gap-4">
              {localStorage.getItem('cashier_role') === 'Admin' && (
                <Link
                  to="/admin"
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/10 text-hcdc-gold mr-2"
                >
                  <LayoutDashboard className="w-3 h-3" /> Admin Dashboard
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-hcdc-gold flex items-center justify-center text-hcdc-blue font-black text-sm shadow-lg">
                {cashierName.charAt(0).toUpperCase()}
              </div>
              <button 
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-hcdc-red flex items-center justify-center text-white transition-colors"
                title="Logout"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden relative">
        {/* PANEL 1: Categories sidebar */}
        <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0 shadow-sm z-10">
          <div className="p-6">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-6 flex items-center gap-3">
              <Tag className="w-3 h-3 text-hcdc-gold" /> Menu Categories
            </h2>
            <nav className="flex flex-col gap-3">
              <button
                onClick={() => setCurrentCategory('All Items')}
                className={`flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden ${currentCategory === 'All Items'
                    ? 'bg-hcdc-blue text-white shadow-xl shadow-hcdc-blue/20 translate-x-1'
                    : 'hover:bg-hcdc-light-blue text-gray-500 hover:text-hcdc-blue'
                  }`}
              >
                {currentCategory === 'All Items' && (
                  <motion.div layoutId="activeCat" className="absolute left-0 top-0 bottom-0 w-1.5 bg-hcdc-red" />
                )}
                <span className="text-sm font-bold tracking-tight">All Items</span>
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCurrentCategory(cat)}
                  className={`flex items-center gap-5 px-6 py-4 rounded-2xl transition-all duration-300 group text-left relative overflow-hidden ${currentCategory === cat
                      ? 'bg-hcdc-blue text-white shadow-xl shadow-hcdc-blue/20 translate-x-1'
                      : 'hover:bg-hcdc-light-blue text-gray-500 hover:text-hcdc-blue'
                    }`}
                >
                  {currentCategory === cat && (
                    <motion.div layoutId="activeCat" className="absolute left-0 top-0 bottom-0 w-1.5 bg-hcdc-red" />
                  )}
                  <span className="text-sm font-bold tracking-tight">{cat}</span>
                </button>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-6 bg-gradient-to-b from-transparent to-hcdc-light-blue/20">
            <div className="p-4 rounded-2xl bg-white border border-hcdc-blue/5 shadow-sm text-center">
              <p className="text-[10px] text-hcdc-blue font-black uppercase tracking-widest mb-1 italic">
                Our Mission
              </p>
              <p className="text-[11px] text-gray-500 font-medium italic leading-relaxed">
                "Blaze your Trail to Success"
              </p>
            </div>
          </div>
        </aside>

        {/* PANEL 2: Product Grid */}
        <section className="flex-1 bg-[#F9FAFB] p-10 flex flex-col min-w-0 overflow-hidden">
          <div className="mb-10 flex justify-between items-center bg-white py-3 px-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4 w-full">
              <Search className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                className="w-full bg-transparent border-none focus:ring-0 text-sm py-2 font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50 px-4 py-2 rounded-xl">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> System Online
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 -mr-4 custom-scrollbar">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-12">
              {filteredProducts.map((product) => {
                let minServings = Infinity;
                let hasInventoryTracking = false;

                if (product.ingredients && product.ingredients.length > 0) {
                  hasInventoryTracking = true;
                  product.ingredients.forEach(ing => {
                    const stockItem = inventory.find(i => i.id === ing.inventoryId);
                    const stockQty = stockItem ? stockItem.quantity : 0;
                    const used = usedInventory[ing.inventoryId] || 0;
                    const avail = Math.max(0, stockQty - used);
                    const servings = Math.floor(avail / ing.quantity);
                    if (servings < minServings) minServings = servings;
                  });
                }
                
                const isOut = hasInventoryTracking && minServings <= 0;

                return (
                <motion.div
                  key={product.id}
                  whileHover={{ y: isOut ? 0 : -5, shadow: isOut ? "none" : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" }}
                  whileTap={{ scale: isOut ? 1 : 0.98 }}
                  onClick={() => !isOut && addToCart(product)}
                  className={`bg-white rounded-3xl p-5 border border-gray-50 shadow-sm transition-all group relative overflow-hidden ${isOut ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:border-hcdc-blue/20 cursor-pointer'}`}
                >
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-hcdc-light-blue flex items-center justify-center group-hover:bg-white group-hover:scale-105 transition-all duration-300 shadow-inner group-hover:shadow-md overflow-hidden relative">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">{product.icon}</span>
                      )}
                      {hasInventoryTracking && (
                        <div className={`absolute bottom-0 inset-x-0 text-[9px] font-black uppercase tracking-widest py-0.5 z-10 ${isOut ? 'bg-red-500 text-white' : 'bg-hcdc-blue/90 text-white backdrop-blur-sm'}`}>
                          {isOut ? 'Sold Out' : isFinite(minServings) ? `${minServings} left` : ''}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-xs leading-snug h-10 flex items-center justify-center px-1">{product.name}</h3>
                      <p className="text-hcdc-red font-black text-lg mt-1 tracking-tight">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="px-4 py-1.5 bg-gray-50 group-hover:bg-hcdc-blue group-hover:text-white text-gray-400 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-colors">
                      {product.category}
                    </div>
                  </div>

                  {/* Floating +1 animation */}
                  <AnimatePresence>
                    {animations.map(anim => anim.id === product.id && (
                      <motion.div
                        key={anim.key}
                        initial={{ opacity: 1, y: 0 }}
                        animate={{ opacity: 0, y: -120 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      >
                        <span className="text-3xl font-black text-hcdc-red drop-shadow-md">+1</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {!isOut && (
                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-8 h-8 rounded-full bg-hcdc-red text-white flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                    </div>
                  )}
                </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* PANEL 3: Order Sidebar (Replaced Footer) */}
        <aside className={`w-[400px] bg-white border-l border-gray-100 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.02)] z-30 transition-all duration-300 shrink-0`}>
          {/* Cart Header */}
          <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-hcdc-blue/5 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-hcdc-blue" />
                </div>
                <AnimatePresence>
                  {totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-1.5 bg-hcdc-red text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm border-2 border-white"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div>
                <h2 className="font-heading font-black text-sm uppercase tracking-widest text-hcdc-blue">
                  Current Order
                </h2>
                <p className="text-gray-400 font-mono text-[10px] mt-0.5">{txnNumber}</p>
              </div>
            </div>
            <button
              onClick={clearOrder}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-hcdc-red hover:bg-hcdc-light-red transition-all"
              title="Clear Order"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar bg-gray-50/10">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                <div className="w-24 h-24 mb-4 rounded-full bg-gray-50 flex items-center justify-center">
                  <ShoppingCart className="w-10 h-10 text-gray-200" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] italic opacity-50">Tray is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-[1.5rem] p-4 flex gap-4 shrink-0 shadow-sm relative group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-hcdc-light-blue flex items-center justify-center shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">{item.icon}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="text-[13px] font-black text-gray-800 truncate leading-tight">{item.name}</h4>
                    <p className="text-[12px] font-black text-hcdc-red mt-1 tracking-tight">{formatCurrency(item.price * item.quantity * (1 - discountRate))}</p>
                  </div>

                  <div className="flex flex-col items-center justify-between">
                    <button
                      onClick={() => updateQuantity(item.id, -item.quantity)}
                      className="w-6 h-6 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-hcdc-red hover:text-white transition-all shadow-sm self-end opacity-0 group-hover:opacity-100 absolute -top-2 -right-2"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-1.5 py-1 border border-gray-100 mt-auto">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-hcdc-red transition-all active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-black w-6 text-center tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-white shadow-sm hover:text-hcdc-blue transition-all active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Checkout Area */}
          <div className="bg-white border-t border-gray-100 p-8 shrink-0">
            {/* Discounts */}
            <div className="mb-6">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 block mb-3">
                Apply Discount
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['REGULAR', 'PWD', 'SENIOR', 'ALUMNI'] as DiscountType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDiscountType(type)}
                    className={`py-2 rounded-xl text-[9px] font-black border-2 transition-all flex flex-col items-center justify-center gap-0.5 ${discountType === type
                        ? type === 'PWD' ? 'bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-600/30' :
                          type === 'SENIOR' ? 'bg-hcdc-gold border-hcdc-gold text-white shadow-lg shadow-hcdc-gold/30' :
                            type === 'ALUMNI' ? 'bg-hcdc-blue border-hcdc-blue text-white shadow-lg shadow-hcdc-blue/30' :
                              'bg-gray-800 border-gray-800 text-white shadow-lg'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                  >
                    <span>{type === 'REGULAR' ? 'NONE' : type}</span>
                    {type !== 'REGULAR' && (
                      <span className="opacity-70 text-[7px]">{type === 'ALUMNI' ? '15%' : '20%'}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals Summary */}
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>SUBTOTAL</span>
                <span className="text-gray-600 font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {discountRate > 0 && (
                <div className="flex justify-between text-xs font-bold text-hcdc-red italic">
                  <span>DISC ({discountType})</span>
                  <span className="font-mono">-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-bold text-gray-400">
                <span>VAT (12%)</span>
                <span className="text-gray-600 font-mono">{formatCurrency(vatAmount)}</span>
              </div>
              <div className="pt-4 mt-2 border-t border-dashed border-gray-200 flex justify-between items-end">
                <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest pb-1">Total Due</span>
                <span className="text-4xl font-black text-hcdc-red tracking-tighter leading-none">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <button
              onClick={() => cart.length > 0 && setShowPaymentModal(true)}
              disabled={cart.length === 0}
              className="w-full h-16 bg-hcdc-red hover:bg-[#A01E1F] text-white font-black rounded-2xl shadow-xl shadow-hcdc-red/30 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:shadow-none text-base tracking-wide group"
            >
              <CreditCard className="w-5 h-5 group-hover:rotate-12 transition-transform" /> PROCEED TO CHECKOUT
            </button>
          </div>
        </aside>
      </main>

      {/* PAYMENT MODAL */}
      <AnimatePresence>
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 no-print">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-hcdc-blue p-8 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest opacity-60 mb-2">Checkout Summary</h3>
                  <p className="text-4xl font-black tracking-tighter">{formatCurrency(total)}</p>
                </div>
                <div className="bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-md text-right">
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1">Items in Cart</p>
                  <p className="text-xl font-black">{totalItems}</p>
                </div>
              </div>

              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-hcdc-blue" /> Cash Tendered
                  </label>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl font-black text-hcdc-blue group-focus-within:text-hcdc-red transition-colors">₱</div>
                    <input
                      autoFocus
                      type="number"
                      placeholder="Enter amount"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full h-20 pl-14 pr-8 bg-hcdc-light-blue/30 border-3 border-transparent focus:border-hcdc-blue focus:bg-white focus:ring-0 rounded-[1.5rem] font-black text-4xl transition-all shadow-inner placeholder:text-hcdc-blue/10"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 rounded-3xl p-6 flex justify-between items-center border border-gray-100">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Change to return</p>
                    <p className={`text-3xl font-black tracking-tighter tabular-nums ${change > 0 ? 'text-green-600' : 'text-gray-200'}`}>
                      {formatCurrency(change)}
                    </p>
                  </div>
                  {cash >= total && total > 0 && (
                    <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Paid
                    </div>
                  )}
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => { setShowPaymentModal(false); setCashTendered(''); }}
                    className="flex-1 h-16 bg-white border-2 border-gray-100 text-gray-400 font-black rounded-2xl hover:bg-gray-50 hover:text-gray-600 transition-all uppercase tracking-widest text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={processPayment}
                    disabled={cash < total || total <= 0}
                    className="flex-[2] h-16 bg-hcdc-red hover:bg-[#A01E1F] text-white font-black rounded-2xl shadow-xl shadow-hcdc-red/30 flex items-center justify-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100 disabled:shadow-none text-lg uppercase tracking-wide"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RECEIPT MODAL */}
      <AnimatePresence>
        {showReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-transparent">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              <div className="p-4 flex justify-between items-center border-b border-gray-100 shrink-0">
                <h3 className="font-bold flex items-center gap-2"><CheckCircle2 className="text-green-500" /> Transaction Complete</h3>
                <button onClick={() => setShowReceipt(false)} className="p-2 hover:bg-gray-100 rounded-full"><X /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-gray-100 scroll-smooth">
                {/* Simulated Thermal Receipt */}
                <div id="receipt-content" className="bg-white p-6 shadow-md mx-auto max-w-[320px] font-mono text-[11px] text-gray-800 border-t-8 border-hcdc-blue">
                  <div className="text-center space-y-0.5 mb-6">
                    <p className="text-base font-black uppercase tracking-tight">AlumniCafe</p>
                    <p>Holy Cross of Davao College</p>
                    <p>Sta. Ana Ave., Davao City</p>
                    <p>VAT Reg TIN: 000-000-0000</p>
                    <p>Tel: (082) 000-0000</p>
                  </div>

                  <div className="border-t border-dashed border-gray-400 py-3 space-y-0.5">
                    <div className="flex justify-between"><span>Date:</span> <span>{formatDate(time)}</span></div>
                    <div className="flex justify-between"><span>Time:</span> <span>{formatTime(time)}</span></div>
                    <div className="flex justify-between"><span>TXN#:</span> <span>{txnNumber}</span></div>
                    <div className="flex justify-between"><span>Cashier:</span> <span>{cashierName}</span></div>
                  </div>

                  <div className="border-t border-gray-400 pt-3 mb-1 font-bold text-[10px]">
                    <div className="flex justify-between gap-4">
                      <span className="flex-1">ITEM</span>
                      <span className="w-8 text-center">QTY</span>
                      <span className="w-20 text-right">AMOUNT</span>
                    </div>
                  </div>
                  <div className="border-b border-gray-400 pb-2 mb-3">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between gap-4 py-1 leading-tight">
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <span className="w-20 text-right">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(subtotal)}</span></div>
                    {discountType !== 'REGULAR' && (
                      <div className="flex justify-between italic">
                        <span>{discountType} Disc ({discountRate * 100}%):</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between"><span>VATable Amt:</span> <span>{formatCurrency(taxableAmount)}</span></div>
                    <div className="flex justify-between"><span>VAT (12%):</span> <span>{formatCurrency(vatAmount)}</span></div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-double border-gray-800">
                      <span>TOTAL:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between pt-1"><span>Cash:</span> <span>{formatCurrency(cash)}</span></div>
                    <div className="flex justify-between"><span>Change:</span> <span>{formatCurrency(change)}</span></div>
                  </div>

                  <div className="border-t border-dashed border-gray-400 py-3 text-center space-y-1">
                    {discountType !== 'REGULAR' && (
                      <div className="mb-2">
                        <p className="font-bold">Discount: {discountType} ({discountRate * 100}%)</p>
                        <p className="text-[9px] leading-tight opacity-70">
                          {discountType === 'ALUMNI' ?
                            'Privilege under HCDC\nAlumni Privilege Program' :
                            `Privilege under ${discountType === 'PWD' ? 'RA 7277' : 'RA 9994'}`
                          }
                        </p>
                      </div>
                    )}
                    <p className="font-bold text-[12px] leading-tight mt-4 italic">Salamat sa inyong pagbisita!</p>
                    <p className="text-[10px]">Blaze your Trail to Success!</p>
                    <p className="text-[9px] mt-2 opacity-60">This is your Official Receipt.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white border-t border-gray-100 flex flex-col gap-3 shrink-0">
                <button
                  onClick={() => window.print()}
                  className="w-full h-12 bg-gray-800 hover:bg-black text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                >
                  <Printer className="w-5 h-5" /> PRINT RECEIPT
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={startNewTransaction}
                    className="flex-1 h-12 bg-hcdc-blue hover:bg-hcdc-blue-dark text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" /> NEW TRANSACTION
                  </button>
                  <button
                    onClick={() => setShowReceipt(false)}
                    className="px-6 h-12 bg-white border-2 border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 flex items-center justify-center"
                  >
                    CLOSE
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Off-screen Receipt for Printing (always present in DOM for print media query) */}
      

    </div>
  );
}
