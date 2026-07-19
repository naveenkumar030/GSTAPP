import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight,
  Network, ShieldCheck, BarChart3, Users,
} from 'lucide-react';
import AuthBackground from '../components/AuthBackground';
import { authApi } from '../services/api';

const FEATURES = [
  { icon: ShieldCheck, label: 'Fraud Detection',     desc: 'Graph-based fraud pattern analysis' },
  { icon: BarChart3,   label: 'Smart Reconciliation', desc: 'AI-assisted invoice matching at scale' },
  { icon: Users,       label: 'Team Workspace',      desc: 'Collaborative audit management' },
];

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData]     = useState({ email: '', password: '' });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);



  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await authApi.login(formData.email, formData.password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('userName', data.name || '');
      localStorage.setItem('userEmail', data.email || formData.email);
      // Clear any upload activity from a previous session so pages start clean
      localStorage.removeItem('gst_upload_activity');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex z-0 overflow-hidden">
      <AuthBackground />

      {/* ── Left panel: branding (hidden on mobile) ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-[#0F172A] px-12 py-14 relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute top-[-80px] left-[-80px] w-[340px] h-[340px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[280px] h-[280px] rounded-full bg-violet-600/20 blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl shadow-lg object-cover" />
          <div>
            <h1 className="text-[17px] font-bold text-white leading-tight">GST Reconciliation</h1>
            <p className="text-[11px] text-slate-400 font-medium">Reconciliation Intelligence</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div>
            <h2 className="text-[36px] font-bold text-white leading-[1.15] tracking-tight">
              Enterprise GST<br />Intelligence Platform
            </h2>
            <p className="text-[15px] text-slate-400 mt-4 leading-relaxed max-w-sm">
              Reconcile invoices, detect fraud patterns, and manage GST compliance with graph-powered analytics.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <f.icon size={15} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{f.label}</p>
                  <p className="text-[11px] text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <img src="/logo.png" alt="Logo" className="w-8 h-8 rounded-lg shadow-sm object-cover" />
            <span className="text-[15px] font-bold text-gray-900">GST Reconciliation</span>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.08)] border border-gray-100 px-8 py-10 relative overflow-hidden">
            {/* Top accent line */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '40%' }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-blue-600 to-violet-500"
            />

            <div className="mb-8">
              <h2 className="text-[26px] font-bold text-gray-900 tracking-tight">Welcome back</h2>
              <p className="text-[13px] text-gray-500 mt-1.5">
                Sign in to your audit workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-red-50 text-red-700 text-[12px] font-medium rounded-lg border border-red-200 flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">⚠</span>
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-gray-700" htmlFor="login-email">
                  Email Address
                </label>
                <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${
                  focusedField === 'email'
                    ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <Mail
                    size={16}
                    className={`absolute left-3.5 transition-colors ${focusedField === 'email' ? 'text-blue-500' : 'text-gray-400'}`}
                    strokeWidth={1.8}
                  />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={formData.email}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full py-3 pl-10 pr-4 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[13px] font-semibold text-gray-700" htmlFor="login-password">
                    Password
                  </label>
                  <Link
                    to="/reset-password"
                    className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${
                  focusedField === 'password'
                    ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <Lock
                    size={16}
                    className={`absolute left-3.5 transition-colors ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'}`}
                    strokeWidth={1.8}
                  />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={formData.password}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full py-3 pl-10 pr-11 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className="text-[12px] text-gray-600">Remember me for 30 days</span>
              </label>

              {/* Submit */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] transition-all"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                    >
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </form>



            <p className="text-center text-[13px] text-gray-600 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
                Create one free
              </Link>
            </p>
          </div>

          <p className="text-center text-[11px] text-gray-400 mt-5">
            By signing in, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-gray-600">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/terms" className="underline hover:text-gray-600">Privacy Policy</Link>.
          </p>
        </motion.div>
      </div>


    </div>
  );
}
