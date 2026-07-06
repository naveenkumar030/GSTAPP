import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ email: '', otp: '', newPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    if (formData.newPassword.length < 8) return setError("Password must be at least 8 characters.");
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: formData.otp, newPassword: formData.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Reset failed');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-container flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden p-8"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-2xl">lock_reset</span>
          </div>
          <h2 className="text-display-lg-mobile font-display-lg-mobile text-primary">Reset Password</h2>
          <p className="text-body-sm text-on-surface-variant mt-2">Enter your email to receive a reset code.</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="request-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleRequestReset} 
              className="space-y-5"
            >
              {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-label-md">{error}</div>}
              
              <div className="relative group">
                <label className="block text-label-md text-on-surface-variant mb-1">Email Address</label>
                <motion.input 
                  whileFocus={{ scale: 1.02 }}
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-body-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="name@company.com"
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full bg-secondary text-on-secondary font-label-md py-3 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-70"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </motion.button>
              
              <button type="button" onClick={() => navigate('/login')} className="w-full text-center text-label-md text-on-surface-variant hover:text-primary mt-4">
                Back to Login
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="verify-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleVerifyReset} 
              className="space-y-5"
            >
              {error && <div className="p-3 bg-error-container text-on-error-container rounded-lg text-label-md">{error}</div>}
              
              <div className="relative group">
                <label className="block text-label-md text-on-surface-variant mb-1">6-Digit Code</label>
                <motion.input 
                  whileFocus={{ scale: 1.02 }}
                  type="text" 
                  required
                  maxLength="6"
                  value={formData.otp}
                  onChange={e => setFormData({ ...formData, otp: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-center tracking-widest text-headline-md outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="------"
                />
              </div>

              <div className="relative group">
                <label className="block text-label-md text-on-surface-variant mb-1">New Password</label>
                <motion.input 
                  whileFocus={{ scale: 1.02 }}
                  type="password" 
                  required
                  value={formData.newPassword}
                  onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                  className="w-full bg-surface border border-outline-variant rounded-lg py-3 px-4 text-body-sm outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all"
                  placeholder="Enter new password"
                />
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full bg-secondary text-on-secondary font-label-md py-3 rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-70"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
