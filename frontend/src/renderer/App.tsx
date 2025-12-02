/**
 * Wingman AI - Main App Component
 */

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import DynamicIsland from "./components/DynamicIsland/DynamicIsland";
import { useAppStore } from "./store/appStore";
import { useWebSocket } from "./hooks/useWebSocket";

function App() {
  const { setMode, togglePause, setPaused } = useAppStore();
  const { connect, disconnect } = useWebSocket();

  useEffect(() => {
    // Connect to backend
    connect();

    // Setup IPC listeners from Electron
    if (window.wingman) {
      const unsubMode = window.wingman.onSetMode((mode) => {
        setMode(mode as any);
      });

      const unsubPause = window.wingman.onTogglePause(() => {
        togglePause();
      });

      const unsubEmergency = window.wingman.onEmergencyHide(() => {
        setPaused(true);
      });

      return () => {
        unsubMode();
        unsubPause();
        unsubEmergency();
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [connect, disconnect, setMode, togglePause, setPaused]);

  return (
    <div className="w-full h-full flex items-start justify-center pt-0">
      <DynamicIsland />
      <Toaster
        position="bottom-center"
        toastOptions={{
          className: "glass text-white text-sm",
          duration: 3000,
          style: {
            background: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            borderRadius: "12px",
            padding: "12px 16px",
          },
        }}
      />
    </div>
  );
}

export default App;
