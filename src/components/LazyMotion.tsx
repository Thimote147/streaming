import React, { lazy, Suspense } from 'react';
import type { TargetAndTransition, Transition, VariantLabels } from 'framer-motion';

// Lazy load Framer Motion to reduce initial bundle size
const LazyMotionDiv = lazy(() => 
  import('framer-motion').then(module => ({ 
    default: module.motion.div 
  }))
);

interface LazyMotionProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  initial?: boolean | TargetAndTransition | VariantLabels;
  animate?: boolean | TargetAndTransition | VariantLabels;
  transition?: Transition;
  whileHover?: TargetAndTransition | VariantLabels;
  whileTap?: TargetAndTransition | VariantLabels;
  onClick?: () => void;
}

export const LazyMotion: React.FC<LazyMotionProps> = ({ children, ...props }) => {
  return (
    <Suspense fallback={<div {...props}>{children}</div>}>
      <LazyMotionDiv {...props}>
        {children}
      </LazyMotionDiv>
    </Suspense>
  );
};

// Simplified version for non-animated content
export const StaticDiv: React.FC<LazyMotionProps> = ({ 
  children, 
  className, 
  style, 
  onClick 
}) => {
  return (
    <div className={className} style={style} onClick={onClick}>
      {children}
    </div>
  );
};