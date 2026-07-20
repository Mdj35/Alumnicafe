import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getCashiers, recordCashierLogin, updateCashier, CashierAccount } from './cashierStorage';
import { useLoading } from './context/LoadingContext';
import ButtonLoader from './components/ui/ButtonLoader';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cashierToUpdate, setCashierToUpdate] = useState<CashierAccount | null>(null);
  const [changePasswordError, setChangePasswordError] = useState('');

  // Loading states
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();

  const handleLoginSuccess = async (cashier: CashierAccount) => {
    localStorage.setItem('cashier_auth', 'true');
    localStorage.setItem('cashier_name', cashier.name);
    localStorage.setItem('cashier_id', cashier.id.toString());
    localStorage.setItem('cashier_role', cashier.role);
    await recordCashierLogin(cashier.id);
    
    if (cashier.role === 'Admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoginLoading(true);
    startLoading('auth');
    try {
      const cashiers = await getCashiers();
      const cashier = cashiers.find(c => c.username === username);

      // Default password check logic
      const isPasswordValid = cashier && (
        (cashier.password === password) || 
        (!cashier.password && password === '12345')
      );

      if (cashier && cashier.isActive !== false && isPasswordValid) {
        if (password === '12345' || cashier.password === '12345') {
          setCashierToUpdate(cashier);
          setShowChangePassword(true);
          return;
        }
        await handleLoginSuccess(cashier);
      } else {
        setError('Invalid username or password, or account is deactivated');
      }
    } finally {
      setIsLoginLoading(false);
      stopLoading('auth');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError('');

    if (newPassword !== confirmPassword) {
      setChangePasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 5) {
      setChangePasswordError('Password must be at least 5 characters long');
      return;
    }

    if (newPassword === '12345') {
      setChangePasswordError('Please choose a password different from the default');
      return;
    }

    if (cashierToUpdate) {
      setIsPasswordLoading(true);
      startLoading('auth');
      try {
        await updateCashier(cashierToUpdate.id, { password: newPassword });
        const updatedCashier = { ...cashierToUpdate, password: newPassword };
        setShowChangePassword(false);
        await handleLoginSuccess(updatedCashier);
      } catch (err) {
        setChangePasswordError('Failed to update password. Please try again.');
      } finally {
        setIsPasswordLoading(false);
        stopLoading('auth');
      }
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
        className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-6 sm:p-10 relative z-10 border border-gray-100 mx-4 sm:mx-0"
      >
        <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-hcdc-blue to-hcdc-blue-dark text-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl shadow-xl shadow-hcdc-blue/20 mb-4 sm:mb-6 border-4 border-white">
            🦅
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-gray-800 tracking-tight">AlumniCafe</h1>
          <p className="text-xs uppercase tracking-[0.2em] font-black text-hcdc-gold mt-2">Holy Cross of Davao College</p>
        </div>

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
              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm disabled:opacity-60"
              placeholder="Enter your username"
              required
              disabled={isLoginLoading}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm disabled:opacity-60"
              placeholder="Enter your password"
              required
              disabled={isLoginLoading}
            />
          </div>

          <ButtonLoader
            type="submit"
            loading={isLoginLoading}
            loadingLabel="Signing in…"
            className="w-full py-4 mt-4 bg-hcdc-red hover:bg-[#A01E1F] text-white font-black rounded-2xl shadow-xl shadow-hcdc-red/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-wider text-sm"
          >
            Access Terminal
          </ButtonLoader>
        </form>

        <div className="mt-6 text-center border-t border-gray-100 pt-6">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Authorized Personnel Only</p>
          <p className="text-[9px] text-gray-400 mt-1 italic">"Blaze your Trail to Success"</p>
        </div>
      </motion.div>
      <AnimatePresence>
        {showChangePassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
              onClick={() => {
                // Prevent closing on backdrop click to enforce password change
                // Provide a Cancel button to abort login
              }}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 relative z-10 w-full max-w-md border border-gray-100 mx-4 sm:mx-0"
            >
              <div className="text-center mb-6 sm:mb-8">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-hcdc-red/10 text-hcdc-red rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mx-auto mb-4">
                  🔒
                </div>
                <h2 className="font-heading font-black text-xl sm:text-2xl text-gray-800">Change Password</h2>
                <p className="text-xs font-bold text-gray-400 mt-2">
                  You are using the default password. Please secure your account.
                </p>
              </div>

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                {changePasswordError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-hcdc-light-red text-hcdc-red text-xs font-bold px-4 py-3 rounded-xl text-center"
                  >
                    {changePasswordError}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm"
                    placeholder="Enter new password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Confirm Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-hcdc-blue focus:bg-white outline-none transition-all font-medium text-sm"
                    placeholder="Confirm new password"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCashierToUpdate(null);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black rounded-2xl transition-all active:scale-95 uppercase tracking-wider text-sm"
                  >
                    Cancel
                  </button>
                  <ButtonLoader
                    type="submit"
                    loading={isPasswordLoading}
                    loadingLabel="Updating…"
                    className="flex-1 py-4 bg-hcdc-blue hover:bg-hcdc-blue-dark text-white font-black rounded-2xl shadow-xl shadow-hcdc-blue/20 transition-all hover:-translate-y-1 active:scale-95 uppercase tracking-wider text-sm"
                  >
                    Update
                  </ButtonLoader>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
