import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function GetStarted() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#398b67] flex flex-col items-center justify-between py-12 px-6 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1 }}
        className="absolute top-0 left-0 w-full h-[60vh] bg-gradient-to-b from-[#2e7454] to-transparent rounded-b-[100px] z-0"
      />
      
      {/* Logo Section */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 flex flex-col items-center mt-16"
      >
        <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-6">
          <span className="material-symbols-outlined text-[64px] text-[#398b67]">
            monitoring
          </span>
        </div>
        <h1 className="text-white text-[42px] font-bold leading-tight text-center font-display-lg">
          GST<br/>Reconciliation
        </h1>
        <p className="text-[#a4d4bc] mt-4 text-center max-w-xs font-body-lg">
          Enterprise-grade automated reconciliation and audit intelligence.
        </p>
      </motion.div>

      {/* Button Section */}
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        className="z-10 w-full max-w-md flex flex-col gap-4 mb-8"
      >
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/register')}
          className="w-full bg-[#fbd472] text-[#3c2a00] font-bold text-lg py-4 rounded-full shadow-lg"
        >
          Get Started
        </motion.button>
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-2 h-2 rounded-full bg-white opacity-100"></div>
          <div className="w-2 h-2 rounded-full border border-white opacity-50"></div>
          <div className="w-2 h-2 rounded-full border border-white opacity-50"></div>
        </div>
      </motion.div>
    </div>
  );
}
