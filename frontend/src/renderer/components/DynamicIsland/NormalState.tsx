/**
 * Wingman AI - Normal State
 * Shows question preview and processing status
 */

import { motion } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { Loader2, ChevronDown, Sparkles, Mic, MicOff, Settings } from "lucide-react";
import socketService from "../../services/socket";
import { ModeSelector } from "../ModeSelector";

const NormalState = () => {
  const { 
    isProcessing, 
    isListening, 
    currentQuestion, 
    currentAnswer, 
    setIslandState,
    setSettingsOpen
  } = useAppStore();

  const hasContent = currentQuestion || currentAnswer;

  const handleMicClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[NormalState] Mic clicked, isListening:', isListening);
    if (isListening) {
      socketService.stopAudio();
    } else {
      socketService.startAudio();
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSettingsOpen(true);
  };

  return (
    <motion.div
      className="w-full h-full flex items-center px-4 cursor-pointer"
      onClick={() => setIslandState("expanded")}
    >
      {/* Left: Mic Button - No scale animations for reliable clicking */}
      <button
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isListening ? "bg-red-500/30" : isProcessing ? "bg-wingman-500/30" : "bg-white/10"}
          hover:bg-white/20 active:bg-white/30 transition-colors
        `}
        onClick={handleMicClick}
      >
        {isProcessing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-4 h-4 text-wingman-400" />
          </motion.div>
        ) : isListening ? (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Mic className="w-4 h-4 text-red-400" />
          </motion.div>
        ) : hasContent ? (
          <Sparkles className="w-4 h-4 text-wingman-400" />
        ) : (
          <MicOff className="w-4 h-4 text-white/60" />
        )}
      </button>

      {/* Center: Content */}
      <div className="flex-1 mx-3 overflow-hidden">
        {isProcessing && !currentAnswer?.answer ? (
          <div className="flex flex-col gap-0.5">
            <motion.p
              className="text-xs text-white/40 truncate"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Processing question...
            </motion.p>
            <ShimmerBar />
          </div>
        ) : currentAnswer?.answer ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-white/40 truncate">
              {currentQuestion?.slice(0, 50)}...
            </p>
            <p className="text-sm text-white font-medium truncate">
              {currentAnswer.answer.slice(0, 60)}
              {currentAnswer.answer.length > 60 && "..."}
            </p>
          </div>
        ) : currentQuestion ? (
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-white/40">Question detected</p>
            <p className="text-sm text-white font-medium truncate">
              {currentQuestion.slice(0, 60)}
              {currentQuestion.length > 60 && "..."}
            </p>
          </div>
        ) : isListening ? (
          <p className="text-sm text-white/60">Listening... speak now</p>
        ) : (
          <p className="text-sm text-white/60">Click mic to start listening</p>
        )}
      </div>

      {/* Right: Mode, Settings + Expand */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Mode selector */}
        <div onClick={(e) => e.stopPropagation()}>
          <ModeSelector compact />
        </div>
        
        {/* Settings button */}
        <button
          className="w-7 h-7 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/15 transition-colors"
          onClick={handleSettingsClick}
          title="Settings (⌘+,)"
        >
          <Settings className="w-3.5 h-3.5 text-white/50 hover:text-white/80" />
        </button>
        
        {/* Expand indicator */}
        {hasContent && (
          <motion.div
            animate={{ y: [0, 2, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="w-4 h-4 text-white/40" />
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Shimmer loading bar
const ShimmerBar = () => (
  <div className="h-4 w-full rounded overflow-hidden bg-white/5">
    <motion.div
      className="h-full w-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent"
      animate={{
        x: ["-100%", "200%"],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  </div>
);

export default NormalState;
