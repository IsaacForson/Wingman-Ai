/**
 * Wingman AI - Dynamic Island Component
 * The main UI that morphs between different states
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store/appStore'
import NanoState from './NanoState'
import MiniState from './MiniState'
import NormalState from './NormalState'
import ExpandedState from './ExpandedState'
import { islandVariants, contentVariants } from './animations'

const DynamicIsland = () => {
  const { islandState, isPaused, isConnected } = useAppStore()

  const getIslandSize = () => {
    switch (islandState) {
      case 'nano':
        return { width: 60, height: 40 }
      case 'mini':
        return { width: 140, height: 44 }
      case 'normal':
        return { width: 420, height: 64 }
      case 'expanded':
        return { width: 600, height: 400 }
      case 'fullscreen':
        return { width: 900, height: 600 }
      default:
        return { width: 60, height: 40 }
    }
  }

  const size = getIslandSize()

  return (
    <motion.div
      className="relative"
      initial={false}
      animate={{
        width: size.width,
        height: size.height
      }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30
      }}
    >
      {/* Main Island Container - Draggable */}
      <motion.div
        className={`
          relative w-full h-full rounded-[22px]
          bg-black/85 backdrop-blur-xl
          border border-white/10
          shadow-island cursor-move
          ${isConnected ? 'shadow-island-glow' : ''}
          ${isPaused ? 'opacity-60' : ''}
        `}
        style={{ overflow: islandState === 'expanded' || islandState === 'fullscreen' ? 'hidden' : 'visible' }}
        variants={islandVariants}
        initial="initial"
        animate="animate"
        drag
        dragMomentum={false}
        dragElastic={0}
      >
        {/* Glow effect */}
        <motion.div
          className="absolute inset-0 rounded-[22px] pointer-events-none"
          animate={{
            boxShadow: isConnected
              ? [
                  '0 0 20px rgba(14, 165, 233, 0.2)',
                  '0 0 40px rgba(14, 165, 233, 0.3)',
                  '0 0 20px rgba(14, 165, 233, 0.2)'
                ]
              : 'none'
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Content based on state */}
        <AnimatePresence mode="wait">
          <motion.div
            key={islandState}
            className="w-full h-full"
            variants={contentVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {islandState === 'nano' && <NanoState />}
            {islandState === 'mini' && <MiniState />}
            {islandState === 'normal' && <NormalState />}
            {(islandState === 'expanded' || islandState === 'fullscreen') && (
              <ExpandedState />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Paused indicator */}
      {isPaused && (
        <motion.div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-white/50"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Paused
        </motion.div>
      )}
    </motion.div>
  )
}

export default DynamicIsland

