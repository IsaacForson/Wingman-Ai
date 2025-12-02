/**
 * Wingman AI - Settings Panel
 * Full settings UI with all configuration options
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Settings,
  Mic,
  Monitor,
  Brain,
  Palette,
  Keyboard,
  Shield,
} from "lucide-react";
import { AIProviderSelector } from "../AIProviderSelector";
import toast from "react-hot-toast";

type SettingsTab =
  | "general"
  | "audio"
  | "screen"
  | "ai"
  | "appearance"
  | "hotkeys"
  | "privacy";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
    { id: "audio", label: "Audio", icon: <Mic className="w-4 h-4" /> },
    { id: "screen", label: "Screen", icon: <Monitor className="w-4 h-4" /> },
    { id: "ai", label: "AI Models", icon: <Brain className="w-4 h-4" /> },
    {
      id: "appearance",
      label: "Appearance",
      icon: <Palette className="w-4 h-4" />,
    },
    { id: "hotkeys", label: "Hotkeys", icon: <Keyboard className="w-4 h-4" /> },
    { id: "privacy", label: "Privacy", icon: <Shield className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="relative w-[800px] max-h-[600px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Settings</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex h-[520px]">
              {/* Sidebar */}
              <div className="w-48 border-r border-white/10 p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? "bg-wingman-500/20 text-wingman-300"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {tab.icon}
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 p-6 overflow-y-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {activeTab === "general" && <GeneralSettings />}
                    {activeTab === "audio" && <AudioSettings />}
                    {activeTab === "screen" && <ScreenSettings />}
                    {activeTab === "ai" && <AISettings />}
                    {activeTab === "appearance" && <AppearanceSettings />}
                    {activeTab === "hotkeys" && <HotkeysSettings />}
                    {activeTab === "privacy" && <PrivacySettings />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// General Settings
const GeneralSettings: React.FC = () => {
  const [launchAtStartup, setLaunchAtStartup] = useState(false);
  const [alwaysOnTop, setAlwaysOnTop] = useState(true);
  const [showInDock, setShowInDock] = useState(false);

  return (
    <div className="space-y-6">
      <SettingsSection title="Startup">
        <ToggleSetting
          label="Launch at startup"
          description="Start Wingman AI when you log in"
          value={launchAtStartup}
          onChange={setLaunchAtStartup}
        />
        <ToggleSetting
          label="Always on top"
          description="Keep Wingman visible above other windows"
          value={alwaysOnTop}
          onChange={setAlwaysOnTop}
        />
        <ToggleSetting
          label="Show in dock"
          description="Display app icon in the dock/taskbar"
          value={showInDock}
          onChange={setShowInDock}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <ToggleSetting
          label="Sound effects"
          description="Play sounds for events"
          value={true}
          onChange={() => {}}
        />
        <ToggleSetting
          label="Desktop notifications"
          description="Show system notifications"
          value={true}
          onChange={() => {}}
        />
      </SettingsSection>
    </div>
  );
};

// Audio Settings
const AudioSettings: React.FC = () => {
  const [inputDevice, setInputDevice] = useState("default");
  const [vadSensitivity, setVadSensitivity] = useState(2);
  const [autoStart, setAutoStart] = useState(true);

  return (
    <div className="space-y-6">
      <SettingsSection title="Input Device">
        <SelectSetting
          label="Microphone"
          value={inputDevice}
          options={[
            { value: "default", label: "System Default" },
            { value: "builtin", label: "Built-in Microphone" },
          ]}
          onChange={setInputDevice}
        />
      </SettingsSection>

      <SettingsSection title="Voice Detection">
        <SliderSetting
          label="VAD Sensitivity"
          description="Higher = more sensitive to speech"
          value={vadSensitivity}
          min={0}
          max={3}
          onChange={setVadSensitivity}
        />
        <ToggleSetting
          label="Auto-start listening"
          description="Begin listening when app starts"
          value={autoStart}
          onChange={setAutoStart}
        />
      </SettingsSection>

      <SettingsSection title="Transcription">
        <SelectSetting
          label="Whisper Model"
          value="base"
          options={[
            { value: "tiny", label: "Tiny (fastest)" },
            { value: "base", label: "Base (balanced)" },
            { value: "small", label: "Small (better)" },
            { value: "medium", label: "Medium (best)" },
          ]}
          onChange={() => {}}
        />
        <ToggleSetting
          label="Use local Whisper"
          description="Run transcription locally (requires more resources)"
          value={false}
          onChange={() => {}}
        />
      </SettingsSection>
    </div>
  );
};

// Screen Settings
const ScreenSettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <SettingsSection title="Screen Capture">
        <ToggleSetting
          label="Enable screen capture"
          description="Analyze screen content for questions"
          value={true}
          onChange={() => {}}
        />
        <SliderSetting
          label="Capture interval"
          description="Seconds between captures"
          value={2}
          min={1}
          max={10}
          onChange={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="OCR Engine">
        <SelectSetting
          label="Text recognition"
          value="tesseract"
          options={[
            { value: "tesseract", label: "Tesseract (faster)" },
            { value: "easyocr", label: "EasyOCR (more accurate)" },
          ]}
          onChange={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="Detection">
        <ToggleSetting
          label="Detect code blocks"
          description="Identify programming code on screen"
          value={true}
          onChange={() => {}}
        />
        <ToggleSetting
          label="Detect MCQs"
          description="Identify multiple choice questions"
          value={true}
          onChange={() => {}}
        />
      </SettingsSection>
    </div>
  );
};

// AI Settings
const AISettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <SettingsSection title="AI Provider">
        <AIProviderSelector />
      </SettingsSection>

      <SettingsSection title="Generation">
        <SliderSetting
          label="Temperature"
          description="Higher = more creative, Lower = more focused"
          value={0.7}
          min={0}
          max={1}
          step={0.1}
          onChange={() => {}}
        />
        <SliderSetting
          label="Max tokens"
          description="Maximum response length"
          value={2048}
          min={256}
          max={4096}
          step={256}
          onChange={() => {}}
        />
      </SettingsSection>
    </div>
  );
};

// Appearance Settings
const AppearanceSettings: React.FC = () => {
  const [theme, setTheme] = useState("dark");
  const [position, setPosition] = useState("top");

  return (
    <div className="space-y-6">
      <SettingsSection title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {["dark", "light", "system"].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={`p-4 rounded-xl border transition-colors ${
                theme === t
                  ? "bg-wingman-500/20 border-wingman-500/40"
                  : "bg-white/5 border-transparent hover:bg-white/10"
              }`}
            >
              <div
                className={`w-full h-8 rounded-lg mb-2 ${
                  t === "dark"
                    ? "bg-gray-900"
                    : t === "light"
                    ? "bg-gray-100"
                    : "bg-gradient-to-r from-gray-900 to-gray-100"
                }`}
              />
              <span className="text-xs text-white capitalize">{t}</span>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Position">
        <SelectSetting
          label="Island position"
          value={position}
          options={[
            { value: "top", label: "Top Center" },
            { value: "top-left", label: "Top Left" },
            { value: "top-right", label: "Top Right" },
          ]}
          onChange={setPosition}
        />
      </SettingsSection>

      <SettingsSection title="Opacity">
        <SliderSetting
          label="Window opacity"
          value={85}
          min={50}
          max={100}
          onChange={() => {}}
        />
      </SettingsSection>
    </div>
  );
};

// Hotkeys Settings
const HotkeysSettings: React.FC = () => {
  const hotkeys = [
    { action: "Toggle visibility", keys: "⌘ + Shift + W" },
    { action: "Command palette", keys: "⌘ + Space" },
    { action: "Pause/Resume", keys: "⌘ + Shift + P" },
    { action: "Capture screen", keys: "⌘ + Shift + S" },
    { action: "Emergency hide", keys: "⌘ + Shift + Esc" },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection title="Global Shortcuts">
        <div className="space-y-2">
          {hotkeys.map((hotkey) => (
            <div
              key={hotkey.action}
              className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5"
            >
              <span className="text-sm text-white/80">{hotkey.action}</span>
              <kbd className="px-3 py-1 rounded bg-white/10 text-xs text-white/60 font-mono">
                {hotkey.keys}
              </kbd>
            </div>
          ))}
        </div>
      </SettingsSection>

      <p className="text-xs text-white/40 mt-4">
        Hotkey customization coming soon. Currently using system defaults.
      </p>
    </div>
  );
};

// Privacy Settings
const PrivacySettings: React.FC = () => {
  return (
    <div className="space-y-6">
      <SettingsSection title="Screen Share Protection">
        <ToggleSetting
          label="Hide from screen capture"
          description="Make Wingman invisible to screen recording"
          value={true}
          onChange={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="Data">
        <ToggleSetting
          label="Save session history"
          description="Store questions and answers locally"
          value={true}
          onChange={() => {}}
        />
        <ToggleSetting
          label="Anonymous analytics"
          description="Help improve Wingman (no personal data)"
          value={false}
          onChange={() => {}}
        />
      </SettingsSection>

      <SettingsSection title="Storage">
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-white">Clear all data</p>
            <p className="text-xs text-white/40">
              Delete history, settings, and cache
            </p>
          </div>
          <button
            onClick={() => toast.success("Data cleared")}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors"
          >
            Clear Data
          </button>
        </div>
      </SettingsSection>
    </div>
  );
};

// Reusable Components
const SettingsSection: React.FC<{
  title: string;
  children: React.ReactNode;
}> = ({ title, children }) => (
  <div>
    <h3 className="text-sm font-medium text-white/40 uppercase tracking-wide mb-3">
      {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const ToggleSetting: React.FC<{
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, description, value, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <div>
      <p className="text-sm text-white">{label}</p>
      {description && <p className="text-xs text-white/40">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors ${
        value ? "bg-wingman-500" : "bg-white/20"
      }`}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  </div>
);

const SelectSetting: React.FC<{
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <div className="flex items-center justify-between py-2">
    <p className="text-sm text-white">{label}</p>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white border border-white/10 focus:outline-none focus:border-wingman-500"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-gray-900">
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

const SliderSetting: React.FC<{
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}> = ({ label, description, value, min, max, step = 1, onChange }) => (
  <div className="py-2">
    <div className="flex items-center justify-between mb-2">
      <div>
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-white/40">{description}</p>}
      </div>
      <span className="text-sm text-wingman-300 font-mono">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full bg-white/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-wingman-500"
    />
  </div>
);

export default SettingsPanel;
