/**
 * Wingman AI - Normal State
 * Shows question preview and processing status
 */

import { motion } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { Loader2, ChevronDown, MessageSquare, Sparkles } from "lucide-react";

const NormalState = () => {
  const { isProcessing, currentQuestion, currentAnswer, setIslandState } =
    useAppStore();

  const hasContent = currentQuestion || currentAnswer;

  return (
    <motion.div
      className="w-full h-full flex items-center px-4 cursor-pointer"
      onClick={() => setIslandState("expanded")}
    >
      {/* Left: Icon/Status */}
      <motion.div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
          ${isProcessing ? "bg-wingman-500/30" : "bg-white/10"}
        `}
      >
        {isProcessing ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 className="w-4 h-4 text-wingman-400" />
          </motion.div>
        ) : hasContent ? (
          <Sparkles className="w-4 h-4 text-wingman-400" />
        ) : (
          <MessageSquare className="w-4 h-4 text-white/60" />
        )}
      </motion.div>

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
        ) : (
          <p className="text-sm text-white/60">Listening for questions...</p>
        )}
      </div>

      {/* Right: Expand indicator */}
      {hasContent && (
        <motion.div
          className="flex-shrink-0"
          animate={{ y: [0, 2, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ChevronDown className="w-4 h-4 text-white/40" />
        </motion.div>
      )}
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
