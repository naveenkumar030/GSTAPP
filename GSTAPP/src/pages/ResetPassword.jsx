import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft,
  KeyRound, ShieldCheck, CheckCircle2, RotateCcw,
} from 'lucide-react';
import AuthBackground from '../components/AuthBackground';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = request email, 2 = verify OTP & set password
  const [formData, setFormData] = useState({ email: '', newPassword: '', confirmPassword: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!formData.email) return setError('Please enter your email address.');
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { detail: text || 'Server error. Please try again.' };
      }
      if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
      setOtp(['', '', '', '', '', '']);
      setSuccessMsg('Reset code sent! Check your email.');
      setStep(2);
      setTimeout(() => otpRefs[0].current?.focus(), 120);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetOTP = async () => {
    setOtp(['', '', '', '', '', '']);
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { detail: text || 'Server error. Please try again.' };
      }
      if (!res.ok) throw new Error(data.detail || data.message || 'Request failed');
      setSuccessMsg('OTP reset & resent successfully! Check your email.');
      setTimeout(() => otpRefs[0].current?.focus(), 120);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReset = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length < 6) return setError('Please enter the complete 6-digit OTP code.');
    if (!formData.newPassword) return setError('Please enter a new password.');
    if (formData.newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (formData.newPassword !== formData.confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          otp: otpCode,
          newPassword: formData.newPassword,
        }),
      });
      let data = {};
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { detail: text || 'Server error. Please try again.' };
      }
      if (!res.ok) throw new Error(data.detail || data.message || 'Reset failed');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (val.length > 1) val = val[val.length - 1];
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 5) otpRefs[idx + 1].current?.focus();
  };

  const handleOtpKey = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) otpRefs[idx - 1].current?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const chars = e.clipboardData.getData('text').slice(0, 6).split('');
    const next = [...otp];
    chars.forEach((c, i) => { if (i < 6) next[i] = c; });
    setOtp(next);
    otpRefs[Math.min(chars.length, 5)].current?.focus();
  };

  const F = (key) => ({ onFocus: () => setFocusedField(key), onBlur: () => setFocusedField(null) });

  return (
    <div className="relative min-h-screen flex z-0 overflow-hidden">
      <AuthBackground />

      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[400px] shrink-0 bg-[#0F172A] px-12 py-14 relative overflow-hidden"
      >
        <div className="absolute top-[-80px] left-[-80px] w-[320px] h-[320px] rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] right-[-60px] w-[260px] h-[260px] rounded-full bg-violet-600/20 blur-[100px] pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <KeyRound size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-white leading-tight">GST Reconciliation</h1>
            <p className="text-[11px] text-slate-400 font-medium">Reset Credentials</p>
          </div>
        </div>

        <div className="relative z-10 space-y-4">
          <h2 className="text-[28px] font-bold text-white leading-[1.2] tracking-tight">
            Secure Account Recovery
          </h2>
          <p className="text-[13px] text-slate-400 leading-relaxed">
            Follow the automated verification steps to safely recover and update your dashboard access password.
          </p>
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-white/5 border border-white/8 backdrop-blur-sm mt-4">
            <ShieldCheck size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-400">
              Passcodes are encrypted and expire after 15 minutes. Ensure you have access to your registered workspace email.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-[11px] text-slate-500">
            For critical lockouts, contact security@gstrecon.in
          </p>
        </div>
      </motion.div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.08)] border border-gray-100 px-8 py-10 relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '40%' }}
              transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-[3px] bg-gradient-to-r from-blue-600 to-violet-500"
            />

            <div className="mb-6">
              <h2 className="text-[24px] font-bold text-gray-900 tracking-tight">Reset Password</h2>
              <p className="text-[13px] text-gray-500 mt-1">
                {step === 1 ? 'Enter your workspace email address.' : 'Enter the code and set your new password.'}
              </p>
            </div>

            {/* Error / Success messages */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div key="err" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="p-3 bg-red-50 text-red-700 text-[12px] font-medium rounded-lg border border-red-200 flex items-start gap-2">
                    <span>⚠</span> {error}
                  </div>
                </motion.div>
              )}
              {successMsg && !error && (
                <motion.div key="ok" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-4">
                  <div className="p-3 bg-green-50 text-green-700 text-[12px] font-medium rounded-lg border border-green-200 flex items-start gap-2">
                    <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> {successMsg}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleRequestReset} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-gray-700" htmlFor="reset-email">Email Address</label>
                    <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${focusedField === 'email' ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Mail size={16} className={`absolute left-3.5 ${focusedField === 'email' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                      <input
                        id="reset-email"
                        type="email"
                        required
                        placeholder="name@company.com"
                        value={formData.email}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full py-3 pl-10 pr-4 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (
                      <>Send Code <ArrowRight size={15} strokeWidth={2.5} /></>
                    )}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="w-full text-center flex items-center justify-center gap-2 text-[13px] text-gray-500 hover:text-gray-900 font-semibold mt-4 transition-colors"
                  >
                    <ArrowLeft size={14} /> Back to Login
                  </button>
                </motion.form>
              ) : (
                <motion.form key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleVerifyReset} className="space-y-4">
                  
                  {/* OTP Code Input Boxes (HTML inputs) */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-gray-700">6-Digit Code</label>
                    <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={otpRefs[idx]}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKey(idx, e)}
                          className={`w-12 h-12 border-2 rounded-xl text-center text-[18px] font-bold text-gray-900 outline-none transition-all bg-white focus:scale-105 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${
                            digit ? 'border-blue-600 shadow-sm' : 'border-gray-200'
                          }`}
                          placeholder="·"
                        />
                      ))}
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-gray-700" htmlFor="reset-pw">New Password</label>
                    <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${focusedField === 'password' ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                      <Lock size={15} className={`absolute left-3.5 ${focusedField === 'password' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                      <input
                        id="reset-pw"
                        type={showPw ? 'text' : 'password'}
                        required
                        placeholder="Min 8 characters"
                        value={formData.newPassword}
                        {...F('password')}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full py-3 pl-10 pr-11 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600" aria-label="Toggle password">
                        {showPw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-semibold text-gray-700" htmlFor="reset-cpw">Confirm Password</label>
                    <div className={`relative flex items-center rounded-lg border transition-all duration-200 bg-white ${focusedField === 'confirmPassword' ? 'border-blue-500 ring-2 ring-blue-500/15 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                      <RotateCcw size={15} className={`absolute left-3.5 ${focusedField === 'confirmPassword' ? 'text-blue-500' : 'text-gray-400'}`} strokeWidth={1.8} />
                      <input
                        id="reset-cpw"
                        type={showCpw ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        {...F('confirmPassword')}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full py-3 pl-10 pr-11 text-[14px] text-gray-900 bg-transparent outline-none rounded-lg placeholder:text-gray-400"
                      />
                      <button type="button" onClick={() => setShowCpw(!showCpw)} className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-600" aria-label="Toggle confirm password">
                        {showCpw ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    type="submit" disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-[14px] font-semibold rounded-xl shadow-[0_4px_14px_rgba(37,99,235,0.3)] transition-all"
                  >
                    {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : (
                      <>Reset Password <ArrowRight size={15} strokeWidth={2.5} /></>
                    )}
                  </motion.button>

                  <div className="text-center space-y-2 mt-4">
                    <button type="button" onClick={handleResetOTP}
                      className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 hover:underline block mx-auto"
                    >
                      Didn't receive it? Reset & Resend OTP
                    </button>
                    <button type="button" onClick={() => setStep(1)}
                      className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      Change email address
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
