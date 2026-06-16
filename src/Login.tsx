import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ChevronDown } from 'lucide-react';
import { getCashiers, recordCashierLogin } from './cashierStorage';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Admin login state
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const cashiers = await getCashiers();
    const cashier = cashiers.find(c => c.username === username);

    if (cashier && cashier.isActive !== false && (cashier.password === password || (!cashier.password && password === '12345'))) {
      localStorage.setItem('cashier_auth', 'true');
      localStorage.setItem('cashier_name', cashier.name);
      localStorage.setItem('cashier_id', cashier.id.toString());
      localStorage.setItem('cashier_role', cashier.role);
      await recordCashierLogin(cashier.id);
      navigate('/');
    } else {
      setError('Invalid username or password, or account is deactivated');
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const cashiers = await getCashiers();
    const cashier = cashiers.find(c => c.username === adminUsername);

    if (cashier && cashier.isActive !== false && cashier.role === 'Admin' && cashier.password === adminPassword) {
      localStorage.setItem('cashier_auth', 'true');
      localStorage.setItem('cashier_name', cashier.name);
      localStorage.setItem('cashier_id', cashier.id.toString());
      localStorage.setItem('cashier_role', cashier.role);
      await recordCashierLogin(cashier.id);
      navigate('/admin');
    } else {
      setAdminError('Invalid admin credentials, or account is deactivated');
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] overflow-hidden relative">
      {/* Decorative HCDC themed shapes */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-hcdc-red/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-hcdc-blue/10 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 relative z-10 border border-gray-100"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-hcdc-blue to-hcdc-blue-dark text-white rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-hcdc-blue/20 mb-6 border-4 border-white">
            🦅
          </div>
          <h1 className="font-heading font-black text-3xl text-gray-800 tracking-tight">AlumniCafe</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-black text-hcdc-gold mt-2">Holy Cross of Davao College</p>
        </div>

        {/* Staff Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-hcdc-light-red text-hcdc-red text-xs font-bold px-4 py-3 rounded-xl text-center"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm"
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm"
              placeholder="Enter your password"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 mt-4 bg-hcdc-red hover:bg-[#A01E1F] text-white font-black rounded-2xl shadow-xl shadow-hcdc-red/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-wider text-sm"
          >
            Access Terminal
          </button>
        </form>

        {/* Admin Access Section */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => { setShowAdminLogin(v => !v); setAdminError(''); setAdminUsername(''); setAdminPassword(''); }}
            className="w-full flex items-center justify-between px-5 py-3 rounded-2xl border-2 border-hcdc-blue/20 bg-hcdc-blue/5 hover:bg-hcdc-blue/10 transition-all group"
          >
            <span className="flex items-center gap-2 text-[11px] font-black text-hcdc-blue uppercase tracking-widest">
              <Shield className="w-4 h-4" />
              Admin Access
            </span>
            <motion.div animate={{ rotate: showAdminLogin ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-4 h-4 text-hcdc-blue/60" />
            </motion.div>
          </button>

          <AnimatePresence>
            {showAdminLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAdminLogin} className="pt-4 space-y-4">
                  {adminError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-hcdc-light-red text-hcdc-red text-xs font-bold px-4 py-3 rounded-xl text-center"
                    >
                      {adminError}
                    </motion.div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-hcdc-blue/60 uppercase tracking-widest px-2">Admin Username</label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      className="w-full px-5 py-3.5 bg-hcdc-blue/5 border-2 border-hcdc-blue/20 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm"
                      placeholder="Enter admin username"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-hcdc-blue/60 uppercase tracking-widest px-2">Admin Password</label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full px-5 py-3.5 bg-hcdc-blue/5 border-2 border-hcdc-blue/20 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm"
                      placeholder="Enter admin password"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-hcdc-blue to-hcdc-blue-dark text-white font-black rounded-2xl shadow-xl shadow-hcdc-blue/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-wider text-sm flex items-center justify-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    Access Admin Dashboard
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Authorized Personnel Only</p>
          <p className="text-[9px] text-gray-400 mt-1 italic">"Blaze your Trail to Success"</p>
        </div>
      </motion.div>
    </div>
  );
}
