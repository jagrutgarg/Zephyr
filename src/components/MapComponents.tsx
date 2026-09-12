"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from 'next/link';
import { useParallax } from "@/hooks/useParallax";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { TwinklingStars } from "./TwinklingStars";
import { RealmModelPreviewWithFallback } from "@/components/three/RealmModelPreview";

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

export function RealmNode({ id, name, themeColor, x, y, guardian, attribute, level = 1, awakened = false }: { id: string, name: string, themeColor: string, x: number, y: number, guardian: string, attribute?: string, level?: number, awakened?: boolean }) {
    // Fake ground-plane depth: nodes further "back" (lower y%) sit smaller & duller
    const depthScale = 0.85 + (y / 100) * 0.3;
    const reducedMotion = usePrefersReducedMotion();

    return (
      <motion.div
        className="realm-node-wrapper"
        style={{
            position: 'absolute', left: `${x}%`, top: `${y}%`,
            width: '140px', height: '140px', marginLeft: '-70px', marginTop: '-70px',
            transform: `scale(${depthScale})`,
        }}
        animate={reducedMotion ? undefined : {
            y: [0, -10, 0]
        }}
        transition={{
            duration: 4 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 2
        }}
      >
        <Link
          href={`/realms/${id}`}
          title={awakened ? undefined : "Awakened by your first Quest"}
          style={{ display: 'block', width: '100%', height: '100%', textDecoration: 'none', cursor: 'pointer' }}
        >
          <motion.div
            className="realm-card-inner"
            style={{
                width: '100%', height: '100%',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', alignItems: 'center',
                position: 'relative',
                opacity: awakened ? 1 : 0.55,
            }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
          >
             {/* The Realm's 3D tower model — /models/realms/<id>.glb — only once awakened by a first completed Quest */}
             <AnimatePresence>
                {awakened && (
                    <motion.div
                        key="tower"
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.9, ease: "backOut" }}
                        style={{ position: 'absolute', inset: 0 }}
                    >
                        <RealmModelPreviewWithFallback realmSlug={id} fallback={null} />
                    </motion.div>
                )}
             </AnimatePresence>
             {!awakened && (
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', border: '1px dashed rgba(255,255,255,0.15)' }} />
             )}
             <div style={{ position: 'relative', fontSize: '0.68rem', fontWeight: 'bold', color: 'white', textAlign: 'center', padding: '0 10px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{name}</div>
             <div style={{ position: 'relative', fontSize: '0.52rem', color: '#cbd5e1', textAlign: 'center', marginTop: '1px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{guardian}{attribute ? ` · ${attribute}` : ''}</div>
             {awakened && (
                <div style={{ position: 'relative', marginTop: '3px', background: themeColor, color: 'black', borderRadius: '10px', padding: '1px 7px', fontSize: '0.58rem', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>Lvl {level}</div>
             )}
             {!awakened && (
                <div style={{ position: 'relative', marginTop: '3px', fontSize: '0.5rem', color: '#64748b', fontStyle: 'italic' }}>Dormant</div>
             )}
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
