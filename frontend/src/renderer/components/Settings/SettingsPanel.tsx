/**
 * Wingman AI - Settings Panel
 * Comprehensive settings UI with persistence and backend sync
 */

import React, { useState, useEffect } from "react";
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
  Key,
  RefreshCw,
  Check,
  AlertCircle,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { useSettingsStore } from "../../store/settingsStore";
import toast from "react-hot-toast";

type SettingsTab =
  | "general"
  | "audio"
  | "screen"
  | "ai"
  | "apikeys"
  | "appearance"
  | "hotkeys"
  | "privacy";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const { syncWithBackend } = useSettingsStore();

  // Sync settings with backend on open
  useEffect(() => {
    if (isOpen) {
      syncWithBackend();
    }
  }, [isOpen, syncWithBackend]);

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="w-4 h-4" /> },
    { id: "audio", label: "Audio", icon: <Mic className="w-4 h-4" /> },
    { id: "screen", label: "Screen", icon: <Monitor className="w-4 h-4" /> },
    { id: "ai", label: "AI Models", icon: <Brain className="w-4 h-4" /> },
    { id: "apikeys", label: "API Keys", icon: <Key className="w-4 h-4" /> },
    { id: "appearance", label: "Appearance", icon: <Palette className="w-4 h-4" /> },
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
            className="relative w-[850px] max-h-[650px] rounded-2xl bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
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

            <div className="flex h-[570px]">
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
                    {activeTab === "apikeys" && <APIKeysSettings />}
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
  const {
    launchAtStartup, setLaunchAtStartup,
    alwaysOnTop, setAlwaysOnTop,
    showInDock, setShowInDock,
    minimizeToTray, setMinimizeToTray,
    soundEffects, setSoundEffects,
    desktopNotifications, setDesktopNotifications,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <SettingsSection title="Startup & Window">
        <ToggleSetting
          label="Launch at startup"
          description="Automatically start Wingman AI when you log in"
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
        <ToggleSetting
          label="Minimize to tray"
          description="Keep running in system tray when closed"
          value={minimizeToTray}
          onChange={setMinimizeToTray}
        />
      </SettingsSection>

      <SettingsSection title="Notifications">
        <ToggleSetting
          label="Sound effects"
          description="Play sounds for events and actions"
          value={soundEffects}
          onChange={setSoundEffects}
        />
        <ToggleSetting
          label="Desktop notifications"
          description="Show system notifications for important events"
          value={desktopNotifications}
          onChange={setDesktopNotifications}
        />
      </SettingsSection>

      <SettingsSection title="Reset">
        <ResetButton />
      </SettingsSection>
    </div>
  );
};

// Audio Settings
const AudioSettings: React.FC = () => {
  const {
    inputDevice, setInputDevice,
    vadSensitivity, setVadSensitivity,
    autoStartListening, setAutoStartListening,
    whisperModel, setWhisperModel,
    useLocalWhisper, setUseLocalWhisper,
    silenceThreshold, setSilenceThreshold,
  } = useSettingsStore();

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((deviceList) => {
      setDevices(deviceList.filter((d) => d.kind === "audioinput"));
    });
  }, []);

  return (
    <div className="space-y-6">
      <SettingsSection title="Input Device">
        <SelectSetting
          label="Microphone"
          description="Select which microphone to use for listening"
          value={inputDevice}
          options={[
            { value: "default", label: "System Default" },
            ...devices.map((d) => ({
              value: d.deviceId,
              label: d.label || `Microphone ${d.deviceId.slice(0, 8)}`,
            })),
          ]}
          onChange={setInputDevice}
        />
      </SettingsSection>

      <SettingsSection title="Voice Detection">
        <SliderSetting
          label="VAD Sensitivity"
          description="Higher values detect quieter speech (0 = least sensitive, 3 = most)"
          value={vadSensitivity}
          min={0}
          max={3}
          onChange={setVadSensitivity}
        />
        <SliderSetting
          label="Silence threshold"
          description="Milliseconds of silence before ending speech"
          value={silenceThreshold}
          min={200}
          max={2000}
          step={100}
          onChange={setSilenceThreshold}
        />
        <ToggleSetting
          label="Auto-start listening"
          description="Begin listening automatically when app starts"
          value={autoStartListening}
          onChange={setAutoStartListening}
        />
      </SettingsSection>

      <SettingsSection title="Transcription">
        <SelectSetting
          label="Whisper Model"
          description="Larger models are more accurate but slower"
          value={whisperModel}
          options={[
            { value: "tiny", label: "Tiny (fastest, less accurate)" },
            { value: "base", label: "Base (balanced)" },
            { value: "small", label: "Small (better accuracy)" },
            { value: "medium", label: "Medium (high accuracy)" },
            { value: "large", label: "Large (best accuracy, slowest)" },
          ]}
          onChange={(v) => setWhisperModel(v as any)}
        />
        <ToggleSetting
          label="Use local Whisper"
          description="Run transcription locally instead of cloud API (requires more resources)"
          value={useLocalWhisper}
          onChange={setUseLocalWhisper}
        />
      </SettingsSection>
    </div>
  );
};

// Screen Settings
const ScreenSettings: React.FC = () => {
  const {
    enableScreenCapture, setEnableScreenCapture,
    captureInterval, setCaptureInterval,
    ocrEngine, setOcrEngine,
    detectCodeBlocks, setDetectCodeBlocks,
    detectMCQs, setDetectMCQs,
  } = useSettingsStore();

  return (
    <div className="space-y-6">
      <SettingsSection title="Screen Capture">
        <ToggleSetting
          label="Enable screen capture"
          description="Allow analyzing screen content for questions"
          value={enableScreenCapture}
          onChange={setEnableScreenCapture}
        />
        <SliderSetting
          label="Capture interval"
          description="Seconds between automatic screen captures"
          value={captureInterval}
          min={1}
          max={10}
          onChange={setCaptureInterval}
          disabled={!enableScreenCapture}
        />
      </SettingsSection>

      <SettingsSection title="OCR Engine">
        <SelectSetting
          label="Text recognition engine"
          description="Choose the OCR engine for extracting text from screen"
          value={ocrEngine}
          options={[
            { value: "tesseract", label: "Tesseract (faster, requires install)" },
            { value: "easyocr", label: "EasyOCR (more accurate, slower)" },
          ]}
          onChange={(v) => setOcrEngine(v as any)}
        />
        <InfoBox>
          Tesseract requires separate installation. Run: <code className="bg-white/10 px-1 rounded">brew install tesseract</code>
        </InfoBox>
      </SettingsSection>

      <SettingsSection title="Detection">
        <ToggleSetting
          label="Detect code blocks"
          description="Identify programming code on screen"
          value={detectCodeBlocks}
          onChange={setDetectCodeBlocks}
        />
        <ToggleSetting
          label="Detect MCQs"
          description="Identify multiple choice questions"
          value={detectMCQs}
          onChange={setDetectMCQs}
        />
      </SettingsSection>
    </div>
  );
};

// AI Settings
const AISettings: React.FC = () => {
  const {
    aiProvider, setAIProvider,
    aiModel, setAIModel,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    streamResponses, setStreamResponses,
  } = useSettingsStore();

  const providerModels: Record<string, { value: string; label: string }[]> = {
    groq: [
      { value: "llama-3.3-70b-versatile", label: "LLaMA 3.3 70B (recommended)" },
      { value: "llama-3.1-70b-versatile", label: "LLaMA 3.1 70B" },
      { value: "llama-3.1-8b-instant", label: "LLaMA 3.1 8B (faster)" },
      { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
      { value: "gemma2-9b-it", label: "Gemma 2 9B" },
    ],
    gemini: [
      { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
      { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
      { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    ],
    mistral: [
      { value: "mistral-large-latest", label: "Mistral Large (recommended)" },
      { value: "mistral-medium-latest", label: "Mistral Medium" },
      { value: "mistral-small-latest", label: "Mistral Small (faster)" },
      { value: "open-mistral-7b", label: "Open Mistral 7B" },
    ],
    claude: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (recommended)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (faster)" },
      { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    ],
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="AI Provider">
        <SelectSetting
          label="Provider"
          description="Choose which AI service to use"
          value={aiProvider}
          options={[
            { value: "groq", label: "🚀 Groq (FREE & Fast)" },
            { value: "gemini", label: "🔮 Google Gemini (FREE tier)" },
            { value: "mistral", label: "🌟 Mistral AI" },
            { value: "claude", label: "🧠 Claude (Paid)" },
          ]}
          onChange={(v) => {
            setAIProvider(v as any);
            // Set default model for provider
            const models = providerModels[v];
            if (models?.length) {
              setAIModel(models[0].value);
            }
          }}
        />
      </SettingsSection>

      <SettingsSection title="Model">
        <SelectSetting
          label="Model"
          description="Choose the AI model to use"
          value={aiModel}
          options={providerModels[aiProvider] || []}
          onChange={setAIModel}
        />
      </SettingsSection>

      <SettingsSection title="Generation">
        <SliderSetting
          label="Temperature"
          description="Higher = more creative, Lower = more focused and deterministic"
          value={temperature}
          min={0}
          max={1}
          step={0.1}
          onChange={setTemperature}
        />
        <SliderSetting
          label="Max tokens"
          description="Maximum length of generated responses"
          value={maxTokens}
          min={256}
          max={8192}
          step={256}
          onChange={setMaxTokens}
        />
        <ToggleSetting
          label="Stream responses"
          description="Show responses as they're generated (smoother)"
          value={streamResponses}
          onChange={setStreamResponses}
        />
      </SettingsSection>
    </div>
  );
};

// API Keys Settings
const APIKeysSettings: React.FC = () => {
  const { apiKeys, setAPIKey } = useSettingsStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const providers = [
    { key: "groq", name: "Groq", url: "https://console.groq.com/keys", free: true },
    { key: "google", name: "Google AI (Gemini)", url: "https://aistudio.google.com/app/apikey", free: true },
    { key: "mistral", name: "Mistral AI", url: "https://console.mistral.ai/api-keys/", free: true },
    { key: "anthropic", name: "Anthropic Claude", url: "https://console.anthropic.com/", free: false },
  ];

  return (
    <div className="space-y-6">
      <InfoBox>
        API keys are stored locally and never sent to any server except the respective AI provider.
      </InfoBox>

      <SettingsSection title="Free Providers">
        {providers.filter(p => p.free).map((provider) => (
          <APIKeyInput
            key={provider.key}
            provider={provider.key}
            name={provider.name}
            url={provider.url}
            value={apiKeys[provider.key as keyof typeof apiKeys] || ""}
            showKey={showKeys[provider.key]}
            onToggleShow={() => setShowKeys(s => ({ ...s, [provider.key]: !s[provider.key] }))}
            onChange={(value) => setAPIKey(provider.key, value)}
          />
        ))}
      </SettingsSection>

      <SettingsSection title="Paid Providers">
        {providers.filter(p => !p.free).map((provider) => (
          <APIKeyInput
            key={provider.key}
            provider={provider.key}
            name={provider.name}
            url={provider.url}
            value={apiKeys[provider.key as keyof typeof apiKeys] || ""}
            showKey={showKeys[provider.key]}
            onToggleShow={() => setShowKeys(s => ({ ...s, [provider.key]: !s[provider.key] }))}
            onChange={(value) => setAPIKey(provider.key, value)}
          />
        ))}
      </SettingsSection>
    </div>
  );
};

// Appearance Settings
const AppearanceSettings: React.FC = () => {
  const {
    theme, setTheme,
    islandPosition, setIslandPosition,
    windowOpacity, setWindowOpacity,
    accentColor, setAccentColor,
    compactMode, setCompactMode,
  } = useSettingsStore();

  const accentColors = [
    { value: "#0ea5e9", name: "Sky Blue" },
    { value: "#8b5cf6", name: "Purple" },
    { value: "#10b981", name: "Emerald" },
    { value: "#f59e0b", name: "Amber" },
    { value: "#ef4444", name: "Red" },
    { value: "#ec4899", name: "Pink" },
    { value: "#06b6d4", name: "Cyan" },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {(["dark", "light", "system"] as const).map((t) => (
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

      <SettingsSection title="Accent Color">
        <div className="flex gap-2 flex-wrap">
          {accentColors.map((color) => (
            <button
              key={color.value}
              onClick={() => setAccentColor(color.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                accentColor === color.value
                  ? "border-white scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Position">
        <SelectSetting
          label="Island position"
          description="Where the floating island appears"
          value={islandPosition}
          options={[
            { value: "top", label: "Top Center" },
            { value: "top-left", label: "Top Left" },
            { value: "top-right", label: "Top Right" },
            { value: "bottom", label: "Bottom Center" },
            { value: "bottom-left", label: "Bottom Left" },
            { value: "bottom-right", label: "Bottom Right" },
          ]}
          onChange={(v) => setIslandPosition(v as any)}
        />
      </SettingsSection>

      <SettingsSection title="Display">
        <SliderSetting
          label="Window opacity"
          description="Background transparency level"
          value={windowOpacity}
          min={50}
          max={100}
          onChange={setWindowOpacity}
        />
        <ToggleSetting
          label="Compact mode"
          description="Reduce padding and spacing for smaller UI"
          value={compactMode}
          onChange={setCompactMode}
        />
      </SettingsSection>
    </div>
  );
};

// Hotkeys Settings
const HotkeysSettings: React.FC = () => {
  // hotkeys will be used when customization is implemented
  const _hotkeys = useSettingsStore((state) => state.hotkeys);

  const hotkeyList = [
    { key: "toggleVisibility", action: "Toggle visibility", keys: "⌘ + Shift + W" },
    { key: "commandPalette", action: "Command palette", keys: "⌘ + Space" },
    { key: "pauseResume", action: "Pause/Resume", keys: "⌘ + Shift + P" },
    { key: "captureScreen", action: "Capture screen", keys: "⌘ + Shift + S" },
    { key: "emergencyHide", action: "Emergency hide", keys: "⌘ + Shift + Esc" },
    { key: "startListening", action: "Start listening", keys: "⌘ + Shift + L" },
    { key: "stopListening", action: "Stop listening", keys: "⌘ + Shift + K" },
  ];

  return (
    <div className="space-y-6">
      <SettingsSection title="Global Shortcuts">
        <div className="space-y-2">
          {hotkeyList.map((hotkey) => (
            <div
              key={hotkey.key}
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

      <InfoBox>
        Hotkey customization coming soon. Currently using system defaults.
      </InfoBox>
    </div>
  );
};

// Privacy Settings
const PrivacySettings: React.FC = () => {
  const {
    hideFromScreenCapture, setHideFromScreenCapture,
    saveSessionHistory, setSaveSessionHistory,
    anonymousAnalytics, setAnonymousAnalytics,
    clearAllData,
  } = useSettingsStore();

  const handleClearData = () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      clearAllData();
      toast.success("All data cleared");
    }
  };

  return (
    <div className="space-y-6">
      <SettingsSection title="Screen Share Protection">
        <ToggleSetting
          label="Hide from screen capture"
          description="Make Wingman invisible to screen recording and screenshots"
          value={hideFromScreenCapture}
          onChange={setHideFromScreenCapture}
        />
        <InfoBox type="info">
          When enabled, Wingman won't appear in Zoom/Teams screen shares, recordings, or screenshots.
        </InfoBox>
      </SettingsSection>

      <SettingsSection title="Data Storage">
        <ToggleSetting
          label="Save session history"
          description="Store questions and answers locally for future reference"
          value={saveSessionHistory}
          onChange={setSaveSessionHistory}
        />
        <ToggleSetting
          label="Anonymous analytics"
          description="Help improve Wingman by sharing anonymous usage data (no personal data)"
          value={anonymousAnalytics}
          onChange={setAnonymousAnalytics}
        />
      </SettingsSection>

      <SettingsSection title="Danger Zone">
        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div>
            <p className="text-sm text-white">Clear all data</p>
            <p className="text-xs text-white/40">
              Delete history, settings, and cache permanently
            </p>
          </div>
          <button
            onClick={handleClearData}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Data
          </button>
        </div>
      </SettingsSection>

      <SettingsSection title="Application">
        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-white/10">
          <div>
            <p className="text-sm text-white">Quit Wingman AI</p>
            <p className="text-xs text-white/40">
              Close the application completely
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm("Are you sure you want to quit Wingman AI?")) {
                window.wingman?.quitApp?.()
              }
            }}
            className="px-4 py-2 rounded-lg bg-white/10 text-white/60 text-sm hover:bg-white/20 hover:text-white transition-colors"
          >
            Quit App
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
  disabled?: boolean;
}> = ({ label, description, value, onChange, disabled }) => (
  <div className={`flex items-center justify-between py-2 ${disabled ? "opacity-50" : ""}`}>
    <div>
      <p className="text-sm text-white">{label}</p>
      {description && <p className="text-xs text-white/40">{description}</p>}
    </div>
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`w-11 h-6 rounded-full transition-colors ${
        value ? "bg-wingman-500" : "bg-white/20"
      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
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
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}> = ({ label, description, value, options, onChange }) => (
  <div className="py-2">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-white/40">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white border border-white/10 focus:outline-none focus:border-wingman-500 max-w-[200px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-gray-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
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
  disabled?: boolean;
}> = ({ label, description, value, min, max, step = 1, onChange, disabled }) => (
  <div className={`py-2 ${disabled ? "opacity-50" : ""}`}>
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
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 rounded-full bg-white/20 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-wingman-500"
    />
  </div>
);

const TextSetting: React.FC<{
  label: string;
  description?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}> = ({ label, description, value, placeholder, onChange }) => (
  <div className="py-2">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-white/40">{description}</p>}
      </div>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white border border-white/10 focus:outline-none focus:border-wingman-500 w-[200px]"
      />
    </div>
  </div>
);

const APIKeyInput: React.FC<{
  provider: string;
  name: string;
  url: string;
  value: string;
  showKey: boolean;
  onToggleShow: () => void;
  onChange: (value: string) => void;
}> = ({ provider: _provider, name, url, value, showKey, onToggleShow, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onChange(localValue);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    toast.success(`${name} API key saved`);
  };

  return (
    <div className="py-3 px-4 rounded-lg bg-white/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white font-medium">{name}</span>
          {value && <Check className="w-4 h-4 text-green-400" />}
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-wingman-400 hover:text-wingman-300 flex items-center gap-1"
        >
          Get API Key <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <div className="flex gap-2">
        <input
          type={showKey ? "text" : "password"}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          placeholder={`Enter ${name} API key...`}
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white border border-white/10 focus:outline-none focus:border-wingman-500 font-mono"
        />
        <button
          onClick={onToggleShow}
          className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white text-xs"
        >
          {showKey ? "Hide" : "Show"}
        </button>
        <button
          onClick={handleSave}
          className="px-3 py-1.5 rounded-lg bg-wingman-500 text-white text-xs hover:bg-wingman-600 transition-colors"
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
};

const InfoBox: React.FC<{
  children: React.ReactNode;
  type?: "info" | "warning";
}> = ({ children, type = "info" }) => (
  <div className={`flex items-start gap-3 p-3 rounded-lg ${
    type === "warning" ? "bg-amber-500/10 border border-amber-500/20" : "bg-white/5"
  }`}>
    {type === "warning" ? (
      <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
    ) : (
      <AlertCircle className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
    )}
    <p className={`text-xs ${type === "warning" ? "text-amber-200/80" : "text-white/50"}`}>
      {children}
    </p>
  </div>
);

const ResetButton: React.FC = () => {
  const { resetToDefaults } = useSettingsStore();

  const handleReset = () => {
    if (confirm("Reset all settings to defaults?")) {
      resetToDefaults();
      toast.success("Settings reset to defaults");
    }
  };

  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm text-white">Reset to defaults</p>
        <p className="text-xs text-white/40">Restore all settings to their original values</p>
      </div>
      <button
        onClick={handleReset}
        className="px-4 py-2 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 text-sm transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Reset
      </button>
    </div>
  );
};

export default SettingsPanel;
