"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import Link from 'next/link';

export function MapParallax() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Calculate normalized mouse position from -1 to 1
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0, position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* Background starfield */}
      <motion.div
        className="absolute inset-0 bg-[url('/stars.png')]"
        style={{
            position: 'absolute', inset: -100,
            backgroundImage: 'radial-gradient(1px 1px at 20px 30px, #ffffff, rgba(0,0,0,0)), radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), rgba(0,0,0,0)), radial-gradient(1.5px 1.5px at 90px 40px, #ffffff, rgba(0,0,0,0))',
            backgroundSize: '150px 150px', opacity: 0.3
        }}
        animate={{
          x: mousePosition.x * -15,
          y: mousePosition.y * -15,
        }}
        transition={{ type: "spring", stiffness: 50, damping: 20 }}
      />
      {/* Nebula layer */}
      <motion.div
        style={{
            position: 'absolute', inset: -100,
            background: 'radial-gradient(circle at 30% 70%, rgba(99, 102, 241, 0.15) 0%, transparent 40%), radial-gradient(circle at 70% 30%, rgba(168, 85, 247, 0.1) 0%, transparent 40%)'
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

export function RealmNode({ id, name, themeColor, x, y, guardian, level = 1 }: { id: string, name: string, themeColor: string, x: number, y: number, guardian: string, level?: number }) {
    return (
      <motion.div
        className="realm-node-wrapper"
        style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: '120px', height: '120px', marginLeft: '-60px', marginTop: '-60px'
        }}
        animate={{
            y: [0, -10, 0]
        }}
        transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2
        }}
      >
        <Link href={`/realms/${id}`}>
          <motion.div
            className="realm-card-inner"
            style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)',
                border: `2px solid ${themeColor}`,
                display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center',
                boxShadow: `0 0 20px ${themeColor}40`,
                textDecoration: 'none', cursor: 'pointer'
            }}
            whileHover={{ scale: 1.05, boxShadow: `0 0 40px ${themeColor}80` }}
            whileTap={{ scale: 0.95 }}
          >
             <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', textAlign: 'center', padding: '0 10px' }}>{name}</div>
             <div style={{ fontSize: '0.6rem', color: '#cbd5e1', textAlign: 'center', marginTop: '4px' }}>{guardian}</div>
             <div style={{ position: 'absolute', bottom: '-15px', background: themeColor, color: 'black', borderRadius: '12px', padding: '2px 8px', fontSize: '0.7rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>Lvl {level}</div>
          </motion.div>
        </Link>
      </motion.div>
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
