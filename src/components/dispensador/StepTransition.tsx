import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Direction, Step } from './types';

const slideVariants = {
  enter:  (dir: Direction) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit:   (dir: Direction) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

const transition = { type: 'tween', duration: 0.22, ease: 'easeOut' } as const;

/** Desliza entre pasos: hacia un lado al avanzar y hacia el otro al retroceder. */
export const StepTransition: React.FC<{ step: Step; direction: Direction; children: React.ReactNode }> = ({ step, direction, children }) => (
  <AnimatePresence mode="wait" custom={direction}>
    <motion.div
      key={step}
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      className="w-full flex flex-col items-center"
    >
      {children}
    </motion.div>
  </AnimatePresence>
);
