import React from 'react';
import { motion } from 'motion/react';
import { AudioOrchestrator } from '../services/audioOrchestrator';

export const AwEmblem: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = "" }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block flex-shrink-0 ${className}`}
    >
      {/* Outer Tactical Circle */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" className="opacity-60" />
      
      {/* Combined Interlocking 'A' and 'W' Anomaly Watch Crest */}
      {/* 'A' Apex */}
      <path 
        d="M12 4L6 14H18L12 4Z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinejoin="round" 
      />
      {/* 'A' Crossbar & 'W' Wings */}
      <path 
        d="M8.5 10H15.5" 
        stroke="currentColor" 
        strokeWidth="1.2" 
      />
      {/* 'W' Bottom Peaks */}
      <path 
        d="M6 14L9 20L12 16L15 20L18 14" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Center Radar Reticle Dot */}
      <circle cx="12" cy="11" r="1" fill="currentColor" />
    </svg>
  );
};

export interface AwButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'amber' | 'danger' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  badgeText?: string;
  glow?: boolean;
  children: React.ReactNode;
}

export const AwButton: React.FC<AwButtonProps> = ({
  variant = 'primary',
  size = 'md',
  showBadge = true,
  badgeText = 'AW',
  glow = true,
  onClick,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    AudioOrchestrator.playTacticalClick();
    if (onClick) onClick(e);
  };

  const baseStyles = "relative inline-flex items-center justify-center font-mono font-bold uppercase tracking-wider transition-all duration-200 select-none group focus:outline-none cursor-pointer rounded-xl border";

  const sizeStyles = {
    sm: "px-3 py-1.5 text-[10px] gap-1.5",
    md: "px-4 py-2.5 text-xs gap-2",
    lg: "px-6 py-3 text-sm gap-2.5"
  };

  const variantStyles = {
    primary: `bg-ufo-green/10 border-ufo-green/40 text-ufo-green hover:bg-ufo-green hover:text-black ${glow ? 'hover:shadow-[0_0_20px_rgba(0,255,157,0.4)]' : ''}`,
    secondary: `bg-cyan-950/40 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black ${glow ? 'hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]' : ''}`,
    amber: `bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500 hover:text-black ${glow ? 'hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]' : ''}`,
    danger: `bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white ${glow ? 'hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]' : ''}`,
    ghost: "bg-transparent border-white/10 text-slate-300 hover:border-ufo-green/50 hover:text-ufo-green hover:bg-ufo-green/5",
    glass: "glass-panel border-white/10 text-white hover:border-ufo-green/50 hover:text-ufo-green hover:bg-white/10"
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={handleClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''} ${className}`}
      {...(props as any)}
    >
      {/* Decorative Corner Accents */}
      <span className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-current opacity-60 rounded-tl-sm group-hover:opacity-100" />
      <span className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-current opacity-60 rounded-br-sm group-hover:opacity-100" />

      {/* Embedded Anomaly Watch Insignia / Emblem */}
      {showBadge && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40 border border-current/20 text-[9px] font-black tracking-widest text-current group-hover:border-black/30">
          <AwEmblem size={12} className="text-current" />
          <span>{badgeText}</span>
        </span>
      )}

      {/* Button Content */}
      <span className="flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
};
