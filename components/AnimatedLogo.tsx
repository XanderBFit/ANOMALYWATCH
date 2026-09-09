import React from 'react';
import { motion } from 'motion/react';

export const AnimatedLogo: React.FC<{ className?: string }> = ({ className = "w-12 h-12" }) => {
  return (
    <motion.div
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      className={className}
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 20C60 20 20 60 20 100C20 140 60 180 100 180C140 180 180 140 180 100C180 60 140 20 100 20ZM100 40C128 40 150 62 150 90C150 118 128 140 100 140C72 140 50 118 50 90C50 62 72 40 100 40Z" fill="#ef4444" />
        <path d="M100 60L120 100L100 140L80 100L100 60Z" fill="white" />
      </svg>
    </motion.div>
  );
};
