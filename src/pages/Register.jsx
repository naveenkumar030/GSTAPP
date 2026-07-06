import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, RotateCcw, ArrowRight } from 'lucide-react';
import AuthBackground from '../components/AuthBackground';

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '', 
    terms: false
  });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Track focused field for animations
  const [focusedField, setFocusedField] = useState(null);

  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  const validatePassword = (pass, confirmPass) => {
    if (pass !== confirmPass) return "Passwords do not match.";
    if (pass.length < 8) return "Password must be at least 8 characters.";
    if (!formData.terms) return "You must agree to the Terms of Service and Privacy Policy.";
    return null;
  };

  const handleSendOTP = async () => {
    if (!formData.email || !formData.password) {
      setError("Please enter email and password before sending OTP.");
      return;
    }
    const passError = validatePassword(formData.password, formData.confirmPassword);
    if (passError) {
      setError(passError);
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fullName: formData.fullName,
          email: formData.email, 
          password: formData.password
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'Failed to send OTP');
      setOtpSent(true);
      setSuccessMsg("We've sent a 6-digit code to your email.");
      
      // Focus first OTP input
      setTimeout(() => otpRefs[0].current?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!otpSent) {
      handleSendOTP();
      return;
    }

    const otpString = otp.join('');
    if (otpString.length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: otpString })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || data.message || 'OTP Verification failed');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) value = value[value.length - 1]; // only take last char
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // move to next
    if (value && index < 5) {
      otpRefs[index + 1].current.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs[index - 1].current.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6).split('');
    if (pasteData.length > 0) {
      const newOtp = [...otp];
      pasteData.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pasteData.length, 5);
      otpRefs[nextIndex].current.focus();
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

  const otpVariants = {
    initial: { scale: 1, borderColor: '#e5e7eb' },
    focused: { scale: 1.1, borderColor: '#4335de', boxShadow: '0 0 0 2px rgba(67, 53, 222, 0.2)' },
    filled: { scale: [1, 1.1, 1], borderColor: '#4335de', transition: { duration: 0.3 } }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 py-12 z-0 overflow-hidden">
      <AuthBackground />
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[500px] bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative border border-gray-100 p-8 sm:p-10"
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
            Create your account
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-[13px] text-gray-500"
          >
            Join our community and start your journey today.
          </motion.p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
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
            <label className="block text-[13px] font-bold text-gray-800">Full Name</label>
            <motion.div 
              variants={inputVariants}
              animate={focusedField === 'fullName' ? 'focused' : 'initial'}
              className="relative"
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <motion.div variants={iconVariants} animate={focusedField === 'fullName' ? 'focused' : 'initial'}>
                  <User className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </motion.div>
              </div>
              <input 
                type="text" 
                required
                placeholder="Enter your full name"
                value={formData.fullName}
                onFocus={() => setFocusedField('fullName')}
                onBlur={() => setFocusedField(null)}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#4335de] focus:ring-1 focus:ring-[#4335de] transition-all placeholder:text-gray-400"
              />
            </motion.div>
          </div>

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
                className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#4335de] focus:ring-1 focus:ring-[#4335de] transition-all placeholder:text-gray-400"
              />
            </motion.div>
          </div>

          {/* Verification Code Section */}
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-[#f7f6fe] p-4 rounded-lg border border-[#efedfb] space-y-3 transition-colors duration-300"
          >
            <div className="flex justify-between items-center">
              <label className="block text-[13px] font-bold text-gray-800">Verification Code</label>
              <button 
                type="button" 
                onClick={handleSendOTP}
                disabled={loading}
                className="text-[12px] font-medium text-[#4335de] hover:underline disabled:opacity-50"
              >
                {otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>
            
            <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <motion.input
                  key={idx}
                  ref={otpRefs[idx]}
                  variants={otpVariants}
                  initial="initial"
                  animate={focusedField === `otp-${idx}` ? 'focused' : digit ? 'filled' : 'initial'}
                  onFocus={() => setFocusedField(`otp-${idx}`)}
                  onBlur={() => setFocusedField(null)}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={!otpSent}
                  className="w-full aspect-square max-w-[3rem] border border-gray-200 rounded-md text-center text-lg font-medium outline-none transition-all bg-white disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="0"
                />
              ))}
            </div>
            
            <p className="text-[11px] text-center text-gray-500 mt-2">
              {successMsg || "Click 'Send OTP' to receive a code on your email."}
            </p>
          </motion.div>

          <div className="space-y-1">
            <label className="block text-[13px] font-bold text-gray-800">Password</label>
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
                className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#4335de] focus:ring-1 focus:ring-[#4335de] transition-all placeholder:text-gray-400"
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

          <div className="space-y-1">
            <label className="block text-[13px] font-bold text-gray-800">Confirm Password</label>
            <motion.div 
              variants={inputVariants}
              animate={focusedField === 'confirmPassword' ? 'focused' : 'initial'}
              className="relative"
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <motion.div variants={iconVariants} animate={focusedField === 'confirmPassword' ? 'focused' : 'initial'}>
                  <RotateCcw className="h-[18px] w-[18px]" strokeWidth={1.5} />
                </motion.div>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="••••••••"
                value={formData.confirmPassword}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full border border-gray-200 rounded-md py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#4335de] focus:ring-1 focus:ring-[#4335de] transition-all placeholder:text-gray-400"
              />
            </motion.div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={formData.terms} 
                onChange={(e) => setFormData({...formData, terms: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300 text-[#4335de] focus:ring-[#4335de] cursor-pointer"
              />
              <span className="text-[12px] text-gray-600 group-hover:text-gray-800 transition-colors">
                I agree to the <a href="#" className="text-[#4335de] hover:underline">Terms of Service</a> and <a href="#" className="text-[#4335de] hover:underline">Privacy Policy</a>.
              </span>
            </label>
          </div>

          <div className="pt-2">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[#3c2ada] text-white text-[14px] font-medium py-3 rounded-md shadow-[0_4px_10px_rgb(60,42,218,0.3)] hover:bg-[#3223b8] hover:shadow-[0_6px_15px_rgb(60,42,218,0.4)] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? 'Processing...' : 'Sign Up'}
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
            Already have an account? <Link to="/login" className="font-bold text-[#3c2ada] hover:underline">Log in</Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
