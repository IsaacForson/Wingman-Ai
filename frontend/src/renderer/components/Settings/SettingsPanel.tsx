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
  User,
  Upload,
} from "lucide-react";
import { useSettingsStore, HotkeyAction, ListenSource } from "../../store/settingsStore";
import { AIProvider, PROVIDER_MODELS } from "../../store/appStore";
import socketService from "../../services/socket";
import toast from "react-hot-toast";

type SettingsTab =
  | "general"
  | "audio"
  | "screen"
  | "ai"
  | "profile"
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
    { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
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
                    {activeTab === "profile" && <ProfileSettings />}
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
      </SettingsSection>

      <SettingsSection title="Notifications">
        <ToggleSetting
          label="Sound effects"
          description="Play a short chime when an answer is ready (your mic may pick it up)"
          value={soundEffects}
          onChange={setSoundEffects}
        />
        <ToggleSetting
          label="Desktop notifications"
          description="Show a system notification when an answer is ready while Wingman is hidden"
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
    listenSource, setListenSource,
  } = useSettingsStore();

  const [devices, setDevices] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    socketService.getSocket()?.emit("get_audio_devices", null, (list: { id: number; name: string }[]) => {
      setDevices(list || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <SettingsSection title="Listen To">
        <SelectSetting
          label="Audio source"
          description="Computer audio hears the interviewer on Zoom/Meet/Teams. With Both, only the interviewer's questions get answered."
          value={listenSource}
          options={[
            { value: "mic", label: "Microphone (you)" },
            { value: "system", label: "Computer audio (interviewer)" },
            { value: "both", label: "Both" },
          ]}
          onChange={(v) => setListenSource(v as ListenSource)}
        />
        {listenSource !== "mic" && (
          <InfoBox>
            The first time, macOS asks to let Wingman AI record the screen and system audio. Allow it in System
            Settings → Privacy &amp; Security → Screen &amp; System Audio Recording, then restart Wingman. Applies
            the next time you start listening.
          </InfoBox>
        )}
      </SettingsSection>

      <SettingsSection title="Input Device">
        <SelectSetting
          label="Microphone"
          description="Microphone to listen with (applies next time you start listening)"
          value={inputDevice}
          options={[
            { value: "default", label: "System Default" },
            ...devices.map((d) => ({ value: String(d.id), label: d.name })),
          ]}
          onChange={setInputDevice}
        />
      </SettingsSection>

      <SettingsSection title="Voice Detection">
        <SliderSetting
          label="VAD Sensitivity"
          description="How strictly background noise is filtered out (0 = lenient, 3 = strict)"
          value={vadSensitivity}
          min={0}
          max={3}
          onChange={setVadSensitivity}
        />
        <SliderSetting
          label="Silence threshold"
          description="Milliseconds of silence before your question is sent"
          value={silenceThreshold}
          min={200}
          max={2000}
          step={100}
          onChange={setSilenceThreshold}
        />
        <ToggleSetting
          label="Auto-start listening"
          description="Begin listening automatically when the app connects"
          value={autoStartListening}
          onChange={setAutoStartListening}
        />
      </SettingsSection>

      <SettingsSection title="Transcription">
        <SelectSetting
          label="Whisper Model"
          description="Used by local Whisper. Larger = more accurate but slower"
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
          description="Transcribe on this Mac instead of Groq's cloud Whisper (downloads the model on first use)"
          value={useLocalWhisper}
          onChange={setUseLocalWhisper}
        />
      </SettingsSection>
    </div>
  );
};

// Screen Settings
const ScreenSettings: React.FC = () => {
  const { enableScreenCapture, setEnableScreenCapture } = useSettingsStore();

  return (
    <div className="space-y-6">
      <SettingsSection title="Screen Capture">
        <ToggleSetting
          label="Enable screen capture"
          description="Allow the capture button and ⌘+Shift+S to analyze your screen"
          value={enableScreenCapture}
          onChange={setEnableScreenCapture}
        />
        <InfoBox>
          Capture reads the active Chrome tab through the Wingman extension (just your highlighted text, if you
          selected some). If the extension isn't connected it takes a screenshot instead. Screenshot (⌘+Shift+X)
          sends the screen under your mouse to a vision model, so it works on images, PDFs and any app.
        </InfoBox>
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
    autoScrollAnswers, setAutoScrollAnswers,
  } = useSettingsStore();

  const modelOptions = PROVIDER_MODELS[aiProvider].map((m) => ({ value: m, label: m }));

  return (
    <div className="space-y-6">
      <SettingsSection title="AI Provider">
        <SelectSetting
          label="Provider"
          description="Choose which AI service to use"
          value={aiProvider}
          options={[
            { value: "groq", label: "🚀 Groq (recommended)" },
            { value: "nvidia", label: "🟢 NVIDIA" },
          ]}
          onChange={(v) => setAIProvider(v as AIProvider)}
        />
        <InfoBox>
          The other provider is the automatic backup. If the main one is busy, rate-limited or not responding,
          Wingman switches over, and rotates through your NVIDIA keys until one answers.
        </InfoBox>
      </SettingsSection>

      <SettingsSection title="Model">
        <SelectSetting
          label="Model"
          description="Choose the AI model to use"
          value={aiModel}
          options={modelOptions}
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
        <ToggleSetting
          label="Auto-scroll while generating"
          description="Automatically scroll to bottom as answers are generated"
          value={autoScrollAnswers}
          onChange={setAutoScrollAnswers}
        />
      </SettingsSection>
    </div>
  );
};

// Profile Settings
const ProfileSettings: React.FC = () => {
  const { resume, setResume, jobDescription, setJobDescription } = useSettingsStore();

  return (
    <div className="space-y-6">
      <InfoBox>
        In Interview and Practice mode, answers use your real experience from your résumé and match them to the
        job. Stored on this Mac only.
      </InfoBox>
      <ProfileField
        title="Your Résumé"
        placeholder="Paste your résumé, or import a PDF / text file…"
        value={resume}
        onSave={setResume}
      />
      <ProfileField
        title="Job Description"
        placeholder="Paste the job posting you're interviewing for…"
        value={jobDescription}
        onSave={setJobDescription}
      />
    </div>
  );
};

const ProfileField: React.FC<{
  title: string;
  placeholder: string;
  value: string;
  onSave: (text: string) => void;
}> = ({ title, placeholder, value, onSave }) => {
  const [text, setText] = useState(value);
  const [importing, setImporting] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const save = (next: string) => {
    if (next !== value) {
      onSave(next);
      toast.success(`${title} saved`);
    }
  };

  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("http://localhost:8765/api/profile/extract", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Import failed");
      setText(data.text);
      save(data.text);
    } catch (e) {
      toast.error(`Could not import ${file.name}: ${e instanceof Error ? e.message : e}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <SettingsSection title={title}>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => save(text)}
        placeholder={placeholder}
        aria-label={title}
        rows={7}
        className="w-full px-3 py-2 rounded-lg bg-white/10 text-sm text-white border border-white/10 focus:outline-none focus:border-wingman-500 resize-y"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{text.length.toLocaleString()} characters</span>
        <div className="flex gap-2">
          {text && (
            <button
              onClick={() => {
                setText("");
                save("");
              }}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white text-xs"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="px-3 py-1.5 rounded-lg bg-wingman-500/20 text-wingman-300 hover:bg-wingman-500/30 text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Upload className="w-3 h-3" />
            {importing ? "Importing…" : "Import PDF / text"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
        </div>
      </div>
    </SettingsSection>
  );
};

// API Keys Settings
const APIKeysSettings: React.FC = () => {
  const { apiKeys, setAPIKey } = useSettingsStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const providers = [
    { key: "groq", name: "Groq", url: "https://console.groq.com/keys", multi: false },
    { key: "nvidia", name: "NVIDIA (backup keys)", url: "https://build.nvidia.com/", multi: true },
  ];

  return (
    <div className="space-y-6">
      <InfoBox>
        Leave a field blank to use the keys from the backend .env file. Keys are stored on this Mac and only
        sent to that provider.
      </InfoBox>

      <SettingsSection title="Providers">
        {providers.map((provider) => (
          <APIKeyInput
            key={provider.key}
            provider={provider.key}
            name={provider.name}
            url={provider.url}
            multi={provider.multi}
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
          description="Overall transparency of Wingman"
          value={windowOpacity}
          min={50}
          max={100}
          onChange={setWindowOpacity}
        />
        <ToggleSetting
          label="Compact mode"
          description="Shrink the whole interface"
          value={compactMode}
          onChange={setCompactMode}
        />
      </SettingsSection>
    </div>
  );
};

// Hotkeys Settings
const HotkeysSettings: React.FC = () => {
  const { hotkeys, setHotkey } = useSettingsStore();
  const [recording, setRecording] = useState<HotkeyAction | null>(null);

  const hotkeyList: { key: HotkeyAction; action: string }[] = [
    { key: "toggleVisibility", action: "Toggle visibility" },
    { key: "commandPalette", action: "Command palette" },
    { key: "pauseResume", action: "Pause/Resume" },
    { key: "captureScreen", action: "Capture Chrome tab" },
    { key: "screenshot", action: "Screenshot" },
    { key: "emergencyHide", action: "Emergency hide" },
    { key: "startListening", action: "Start listening" },
    { key: "stopListening", action: "Stop listening" },
  ];

  // Record the next key combo and turn it into an Electron accelerator
  useEffect(() => {
    if (!recording) return;
    const onKey = async (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        setRecording(null);
        return;
      }
      if (["Meta", "Control", "Shift", "Alt"].includes(e.key)) return;
      const mods = [
        (e.metaKey || e.ctrlKey) && "CommandOrControl",
        e.altKey && "Alt",
        e.shiftKey && "Shift",
      ].filter(Boolean);
      if (!mods.length) {
        toast.error("Use at least one modifier (⌘, ⌥ or ⇧)");
        return;
      }
      const key = e.code.startsWith("Key") ? e.code.slice(3)
        : e.code.startsWith("Digit") ? e.code.slice(5)
        : e.key === " " ? "Space"
        : e.key.length === 1 ? e.key.toUpperCase() : e.key;
      const accelerator = [...mods, key].join("+");
      const action = recording;
      setRecording(null);
      if (await setHotkey(action, accelerator)) {
        toast.success(`Set to ${formatAccelerator(accelerator)}`);
      } else {
        toast.error(`${formatAccelerator(accelerator)} is taken or not allowed`);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [recording, setHotkey]);

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
              <button
                onClick={() => setRecording(recording === hotkey.key ? null : hotkey.key)}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                  recording === hotkey.key
                    ? "bg-wingman-500/30 text-wingman-300"
                    : "bg-white/10 text-white/60 hover:bg-white/20"
                }`}
              >
                {recording === hotkey.key ? "Press keys… (Esc to cancel)" : formatAccelerator(hotkeys[hotkey.key])}
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>

      <InfoBox>
        Click a shortcut and press the new key combination. Shortcuts work even when Wingman isn't focused.
      </InfoBox>
    </div>
  );
};

const formatAccelerator = (accelerator: string) =>
  accelerator
    .replace("CommandOrControl", "⌘")
    .replace("Alt", "⌥")
    .replace("Escape", "Esc")
    .split("+")
    .join(" + ");

// Privacy Settings
const PrivacySettings: React.FC = () => {
  const {
    hideFromScreenCapture, setHideFromScreenCapture,
    saveSessionHistory, setSaveSessionHistory,
    clearAllData,
  } = useSettingsStore();

  const handleClearData = async () => {
    if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      await clearAllData();
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
          description="Keep conversations on disk so they survive a restart"
          value={saveSessionHistory}
          onChange={setSaveSessionHistory}
        />
      </SettingsSection>

      <SettingsSection title="Danger Zone">
        <div className="flex items-center justify-between py-3 px-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div>
            <p className="text-sm text-white">Clear all data</p>
            <p className="text-xs text-white/40">
              Delete conversation history and reset all settings
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
  multi?: boolean;
  value: string;
  showKey: boolean;
  onToggleShow: () => void;
  onChange: (value: string) => void;
}> = ({ provider: _provider, name, url, multi, value, showKey, onToggleShow, onChange }) => {
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
        {multi && showKey ? (
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder="One key per line"
            rows={4}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white border border-white/10 focus:outline-none focus:border-wingman-500 font-mono"
          />
        ) : (
          <input
            type={showKey ? "text" : "password"}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            placeholder={multi ? "Click Show to paste one key per line" : `Enter ${name} API key...`}
            className="flex-1 px-3 py-1.5 rounded-lg bg-white/10 text-sm text-white border border-white/10 focus:outline-none focus:border-wingman-500 font-mono"
          />
        )}
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
