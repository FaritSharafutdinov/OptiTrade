import type { ReactNode } from 'react';
import { motion, type MotionProps, useReducedMotion } from 'framer-motion';

interface PageTransitionProps extends MotionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Shared wrapper for page-level fade/slide transitions.
 */
export default function PageTransition({
  children,
  className = '',
  ...motionProps
}: PageTransitionProps) {
  const prefersReducedMotion = useReducedMotion();
  const initial = prefersReducedMotion ? undefined : { opacity: 0, y: 24 };
  const animate = prefersReducedMotion ? undefined : { opacity: 1, y: 0 };
  const exit = prefersReducedMotion ? undefined : { opacity: 0, y: -16 };
  const transition = prefersReducedMotion ? undefined : { duration: 0.4, ease: 'easeOut' as const };

  return (
    <motion.div
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
      className={className}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
