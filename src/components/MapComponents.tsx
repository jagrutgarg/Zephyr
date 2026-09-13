"use client";

import { motion } from "framer-motion";
import { useParallax } from "@/hooks/useParallax";
import { TwinklingStars } from "./TwinklingStars";

export function MapParallax() {
  const mousePosition = useParallax();

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Background starfield */}
      <motion.div
        style={{ position: 'absolute', inset: -100 }}
        animate={{
          x: mousePosition.x * -15,
          y: mousePosition.y * -15,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      >
        <TwinklingStars count={70} />
      </motion.div>
      {/* Nebula layer — kept faint so the 3D ocean beneath stays readable */}
      <motion.div
        style={{
            position: 'absolute', inset: -100,
            background: 'radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.06) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(168, 85, 247, 0.05) 0%, transparent 40%)'
        }}
        animate={{
          x: mousePosition.x * -30,
          y: mousePosition.y * -30,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      />
    </div>
  );
}

export function VoidNode({ percentage }: { percentage: number }) {
    // Dynamic styles based on corruption %
    const size = 150 + (percentage / 100) * 100;
    
    return (
        <motion.div
            className="void-node-wrapper"
            style={{
                position: 'absolute', left: '50%', top: '50%',
                width: `${size}px`, height: `${size}px`,
                marginLeft: `-${size/2}px`, marginTop: `-${size/2}px`,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #000000 20%, #1e1b4b 80%)',
                boxShadow: `0 0 ${percentage}px rgba(0,0,0,0.8)`,
                display: 'flex', justifyContent: 'center', alignItems: 'center'
            }}
            animate={{
               rotate: [0, 360],
               scale: [1, 1.02, 1]
            }}
            transition={{
                rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                scale: { duration: 3, repeat: Infinity, ease: "easeInOut" }
            }}
        >
            <div style={{color: '#ef4444', fontWeight: 'bold', fontSize: '1.2rem'}}>
                VOID {percentage}%
            </div>
            {/* Tendrils logic would go here SVG paths based on % */}
        </motion.div>
    )
}
