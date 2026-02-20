/**
 * Wingman AI - Command Palette
 * Quick actions accessible via Cmd+Space
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "../../store/appStore";
import { useWebSocket } from "../../hooks/useWebSocket";
import {
  Search,
  Mic,
  MicOff,
  Monitor,
  Settings,
  Pause,
  Play,
  Brain,
  BookOpen,
  Briefcase,
  Users,
  FlaskConical,
  Dumbbell,
  Zap,
  Sparkles,
  Cpu,
  History,
  Trash2,
  HelpCircle,
  Command,
} from "lucide-react";
import toast from "react-hot-toast";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: "actions" | "modes" | "ai" | "navigation" | "system";
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const {
    mode,
    setMode,
    isPaused,
    togglePause,
    aiProvider,
    setAIProvider,
    isListening,
    setSettingsOpen,
  } = useAppStore();

  const {
    startAudio,
    stopAudio,
    captureScreen,
    setAIProvider: setAIProviderBackend,
  } = useWebSocket();

  // Define all commands
  const commands: CommandItem[] = useMemo(
    () => [
      // Actions
      {
        id: "toggle-listening",
        label: isListening ? "Stop Listening" : "Start Listening",
        description: isListening
          ? "Stop audio capture"
          : "Begin capturing audio",
        icon: isListening ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        ),
        shortcut: "⌘L",
        action: () => {
          if (isListening) {
            stopAudio();
            toast.success("Stopped listening");
          } else {
            startAudio();
            toast.success("Started listening");
          }
        },
        category: "actions",
      },
      {
        id: "capture-screen",
        label: "Capture Screen",
        description: "Analyze current screen content",
        icon: <Monitor className="w-4 h-4" />,
        shortcut: "⌘⇧S",
        action: () => {
          captureScreen();
          toast.success("Screen captured");
        },
        category: "actions",
      },
      {
        id: "toggle-pause",
        label: isPaused ? "Resume" : "Pause",
        description: isPaused ? "Resume processing" : "Pause all processing",
        icon: isPaused ? (
          <Play className="w-4 h-4" />
        ) : (
          <Pause className="w-4 h-4" />
        ),
        shortcut: "⌘⇧P",
        action: () => {
          togglePause();
          toast.success(isPaused ? "Resumed" : "Paused");
        },
        category: "actions",
      },

      // Modes
      {
        id: "mode-interview",
        label: "Interview Mode",
        description: "Technical & behavioral interview assistance",
        icon: <Brain className="w-4 h-4 text-blue-400" />,
        action: () => {
          setMode("interview");
          toast.success("Switched to Interview Mode");
        },
        category: "modes",
      },
      {
        id: "mode-study",
        label: "Study Mode",
        description: "Learning and exam preparation",
        icon: <BookOpen className="w-4 h-4 text-green-400" />,
        action: () => {
          setMode("study");
          toast.success("Switched to Study Mode");
        },
        category: "modes",
      },
      {
        id: "mode-work",
        label: "Work Mode",
        description: "Productivity and coding assistance",
        icon: <Briefcase className="w-4 h-4 text-purple-400" />,
        action: () => {
          setMode("work");
          toast.success("Switched to Work Mode");
        },
        category: "modes",
      },
      {
        id: "mode-meeting",
        label: "Meeting Mode",
        description: "Real-time meeting intelligence",
        icon: <Users className="w-4 h-4 text-yellow-400" />,
        action: () => {
          setMode("meeting");
          toast.success("Switched to Meeting Mode");
        },
        category: "modes",
      },
      {
        id: "mode-research",
        label: "Research Mode",
        description: "Deep research and analysis",
        icon: <FlaskConical className="w-4 h-4 text-orange-400" />,
        action: () => {
          setMode("research");
          toast.success("Switched to Research Mode");
        },
        category: "modes",
      },
      {
        id: "mode-practice",
        label: "Practice Mode",
        description: "Mock interview practice",
        icon: <Dumbbell className="w-4 h-4 text-red-400" />,
        action: () => {
          setMode("practice");
          toast.success("Switched to Practice Mode");
        },
        category: "modes",
      },

      // AI Providers
      {
        id: "ai-groq",
        label: "Use Groq",
        description: "Ultra-fast Llama models (FREE)",
        icon: <Zap className="w-4 h-4 text-orange-400" />,
        action: () => {
          setAIProvider("groq");
          setAIProviderBackend("groq");
          toast.success("Switched to Groq");
        },
        category: "ai",
      },
      {
        id: "ai-gemini",
        label: "Use Google Gemini",
        description: "Gemini 1.5 Flash (FREE)",
        icon: <Sparkles className="w-4 h-4 text-blue-400" />,
        action: () => {
          setAIProvider("gemini");
          setAIProviderBackend("gemini");
          toast.success("Switched to Gemini");
        },
        category: "ai",
      },
      {
        id: "ai-mistral",
        label: "Use Mistral",
        description: "Mistral Large & Small models",
        icon: <Cpu className="w-4 h-4 text-purple-400" />,
        action: () => {
          setAIProvider("mistral");
          setAIProviderBackend("mistral");
          toast.success("Switched to Mistral");
        },
        category: "ai",
      },

      // Navigation
      {
        id: "open-settings",
        label: "Open Settings",
        description: "Configure Wingman AI",
        icon: <Settings className="w-4 h-4" />,
        shortcut: "⌘,",
        action: () => {
          setSettingsOpen(true);
        },
        category: "navigation",
      },
      {
        id: "view-history",
        label: "View History",
        description: "See past questions and answers",
        icon: <History className="w-4 h-4" />,
        action: () => {
          toast("History view coming soon!");
        },
        category: "navigation",
      },

      // System
      {
        id: "clear-context",
        label: "Clear Context",
        description: "Reset current conversation",
        icon: <Trash2 className="w-4 h-4" />,
        action: () => {
          toast.success("Context cleared");
        },
        category: "system",
      },
      {
        id: "help",
        label: "Help & Shortcuts",
        description: "View keyboard shortcuts and help",
        icon: <HelpCircle className="w-4 h-4" />,
        shortcut: "⌘?",
        action: () => {
          toast("Help coming soon!");
        },
        category: "system",
      },
    ],
    [
      isListening,
      isPaused,
      mode,
      aiProvider,
      setMode,
      togglePause,
      setAIProvider,
      startAudio,
      stopAudio,
      captureScreen,
      setAIProviderBackend,
      setSettingsOpen,
    ]
  );

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery) ||
        cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [query, commands]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const categoryLabels: Record<string, string> = {
    actions: "Actions",
    modes: "Modes",
    ai: "AI Providers",
    navigation: "Navigation",
    system: "System",
  };

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filteredCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            onClose();
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            className="relative w-[560px] max-h-[400px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: -20 }}
            transition={{ type: "spring", damping: 25 }}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <Search className="w-5 h-5 text-white/40" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-white placeholder:text-white/40 outline-none text-sm"
              />
              <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs text-white/40">
                esc
              </kbd>
            </div>

            {/* Commands List */}
            <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
              {Object.entries(groupedCommands).map(([category, items]) => (
                <div key={category} className="mb-2">
                  <p className="px-3 py-1 text-xs text-white/40 uppercase tracking-wide">
                    {categoryLabels[category]}
                  </p>
                  {items.map((cmd) => {
                    const globalIndex = filteredCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <motion.button
                        key={cmd.id}
                        data-index={globalIndex}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-wingman-500/20 text-white"
                            : "text-white/70 hover:bg-white/5"
                        }`}
                        whileHover={{ x: 2 }}
                      >
                        <div
                          className={`p-1.5 rounded-lg ${
                            isSelected ? "bg-wingman-500/30" : "bg-white/10"
                          }`}
                        >
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {cmd.label}
                          </p>
                          {cmd.description && (
                            <p className="text-xs text-white/40 truncate">
                              {cmd.description}
                            </p>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="px-2 py-0.5 rounded bg-white/10 text-xs text-white/40 font-mono">
                            {cmd.shortcut}
                          </kbd>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ))}

              {filteredCommands.length === 0 && (
                <div className="py-8 text-center text-white/40">
                  <Command className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No commands found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-white/10 text-xs text-white/40">
              <div className="flex items-center gap-4">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10">↑↓</kbd>{" "}
                  Navigate
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10">↵</kbd>{" "}
                  Select
                </span>
              </div>
              <span>Wingman AI</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
