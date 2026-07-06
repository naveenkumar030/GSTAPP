import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import AuthBackground from '../components/AuthBackground';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Track focused field for animations
  const [focusedField, setFocusedField] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Login failed');
      localStorage.setItem('token', data.token);
      navigate('/dashboard'); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputVariants = {
    initial: { scale: 1 },
    focused: { scale: 1.02, transition: { type: 'spring', stiffness: 300, damping: 20 } }
  };

  const iconVariants = {
    initial: { scale: 1, color: "#9ca3af" },
    focused: { scale: 1.15, color: "#4335de", transition: { type: 'spring', stiffness: 300 } }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-12 z-0 overflow-hidden">
      <AuthBackground />
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[450px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative border border-gray-100 p-8 sm:p-10"
      >
        {/* Top border accent */}
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: 128 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="absolute top-0 left-0 h-1 bg-[#4335de]" 
        />

        <div className="text-center mb-8 mt-2">
          <motion.h2 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[28px] font-bold text-gray-900 mb-2"
          >
            Welcome Back
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[13px] text-gray-500"
          >
            Log in to your enterprise audit dashboard.
          </motion.p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="p-3 bg-red-50/80 text-red-600 rounded-lg text-xs text-center border border-red-100 overflow-hidden"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-1">
            <label className="block text-[13px] font-bold text-gray-800">Email Address</label>
            <motion.div 
              variants={inputVariants}
              animate={focusedField === 'email' ? 'focused' : 'initial'}
              className="relative"
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <motion.div variants={iconVariants} animate={focusedField === 'email' ? 'focused' : 'initial'}>
                  <Mail className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </motion.div>
              </div>
              <input 
                type="email" 
                required
                placeholder="name@example.com"
                value={formData.email}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full border border-gray-200 rounded-md py-3 pl-10 pr-4 text-sm outline-none focus:border-[#4335de] focus:ring-1 focus:ring-[#4335de] transition-all placeholder:text-gray-400"
              />
            </motion.div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="block text-[13px] font-bold text-gray-800">Password</label>
              <Link to="/reset-password" className="text-[12px] font-medium text-[#4335de] hover:underline">
                Forgot password?
              </Link>
            </div>
            <motion.div 
              variants={inputVariants}
              animate={focusedField === 'password' ? 'focused' : 'initial'}
              className="relative"
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <motion.div variants={iconVariants} animate={focusedField === 'password' ? 'focused' : 'initial'}>
                  <Lock className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </motion.div>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="••••••••"
                value={formData.password}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full border border-gray-200 rounded-md py-3 pl-10 pr-10 text-sm outline-none focus:border-[#4335de] focus:ring-1 focus:ring-[#4335de] transition-all placeholder:text-gray-400"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.5} /> : <Eye className="h-[18px] w-[18px]" strokeWidth={1.5} />}
              </button>
            </motion.div>
          </div>

          <div className="pt-4">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[#3c2ada] text-white text-[14px] font-medium py-3.5 rounded-md shadow-[0_4px_10px_rgb(60,42,218,0.3)] hover:bg-[#3223b8] hover:shadow-[0_6px_15px_rgb(60,42,218,0.4)] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? 'Logging in...' : 'Log In'}
              {!loading && (
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                >
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </motion.div>
              )}
            </motion.button>
          </div>
        </form>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 text-center"
        >
          <p className="text-[13px] text-gray-600">
            Don't have an account? <Link to="/register" className="font-bold text-[#3c2ada] hover:underline">Register here</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
