import React from 'react';
import { motion } from 'framer-motion';

export default function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-[-1] bg-[#fafafd]">
      {/* Animated blob 1 */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-[#4335de]/10 blur-[100px] mix-blend-multiply"
      />
      {/* Animated blob 2 */}
      <motion.div
        animate={{
          x: [0, -150, 50, 0],
          y: [0, 100, -100, 0],
          scale: [1, 1.3, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-[#9581f6]/10 blur-[100px] mix-blend-multiply"
      />
      {/* Animated blob 3 */}
      <motion.div
        animate={{
          x: [0, 50, -100, 0],
          y: [0, 150, -50, 0],
          scale: [1, 0.8, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute top-[20%] left-[40%] w-[30vw] h-[30vw] rounded-full bg-blue-400/10 blur-[100px] mix-blend-multiply"
      />
      
      {/* Subtle grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
}
