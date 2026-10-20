import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const Fireworks: React.FC<{ color: string, intensity?: 'low' | 'high', onComplete: () => void }> = ({ color, intensity = 'low', onComplete }) => {
  const [particles, setParticles] = useState<number[]>([]);

  useEffect(() => {
    const count = intensity === 'high' ? 200 : 50;
    setParticles([...Array(count)].map(() => Math.random()));
    const duration = intensity === 'high' ? 6000 : 3000;
    const timer = setTimeout(onComplete, duration);
    return () => clearTimeout(timer);
  }, [intensity]);

  return (
    <div className="fixed inset-0 pointer-events-none z-[1000]">
      {particles.map((p, i) => (
        <motion.div
          key={`firework-particle-${i}`}
          className="absolute w-2 h-2 rounded-full"
          style={{ backgroundColor: color, left: '50%', top: '50%' }}
          initial={{ x: 0, y: 0, opacity: 1 }}
          animate={{
            x: (Math.random() - 0.5) * (intensity === 'high' ? 1000 : 500),
            y: (Math.random() - 0.5) * (intensity === 'high' ? 1000 : 500),
            opacity: 0,
          }}
          transition={{ duration: intensity === 'high' ? 3 : 1.5, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

export default Fireworks;
