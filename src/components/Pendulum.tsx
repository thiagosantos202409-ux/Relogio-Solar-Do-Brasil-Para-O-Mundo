import React from 'react';
import { motion } from 'motion/react';

export const Pendulum: React.FC<{ animated?: boolean }> = ({ animated = true }) => {
  return (
    <div className="absolute -bottom-20 left-1/2 -ml-0.5 flex justify-center items-start h-24 pointer-events-none">
      <motion.div
        className="w-1.5 h-20 bg-amber-900 origin-top shadow-md"
        animate={animated ? { rotate: [30, -30, 30] } : { rotate: 0 }}
        transition={animated ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <div className="w-8 h-8 rounded-full bg-amber-700 -ml-3.5 mt-20 shadow-lg border-2 border-amber-950" />
      </motion.div>
    </div>
  );
};
