/**
 * Wingman AI - Stealth Mode Background Service Worker
 * 
 * NO POPUP - Everything works via keyboard shortcuts!
 * Answers are sent to the Electron Desktop App (hidden from screen share)
 * 
 * Hotkeys:
 * - Cmd+Shift+S: Capture screen content
 * - Cmd+Shift+L: Toggle audio listening
 */

const BACKEND_URL = 'http://localhost:8765';

// Badge colors for status
const BADGE_COLORS = {
  ready: '#00d4aa',      // Green - ready
  processing: '#ffc107', // Yellow - processing
  error: '#ff4757',      // Red - error
  listening: '#ff6b81'   // Pink - listening
};

// State
let isListening = false;
let isConnected = false;

// ============================================
// INITIALIZATION
// ============================================

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('🥷 Wingman AI Stealth Mode installed:', details.reason);
  
  // Set defaults
  await chrome.storage.local.set({
    aiProvider: 'gemini',
    aiModel: 'gemini-1.5-flash'
  });
  
  // Set initial badge
  setBadge('ready', '✓');
});

// Check connection on startup
chrome.runtime.onStartup.addListener(() => {
  checkBackendConnection();
});

// ============================================
// BADGE STATUS INDICATOR
// ============================================

function setBadge(status, text = '') {
  const color = BADGE_COLORS[status] || BADGE_COLORS.ready;
  
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  
  // Update tooltip
  const tooltips = {
    ready: 'Wingman AI Ready - Cmd+Shift+S to capture',
    processing: 'Processing...',
    error: 'Error - Check if backend is running',
    listening: 'Listening for questions...'
  };
  chrome.action.setTitle({ title: tooltips[status] || 'Wingman AI' });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

chrome.commands.onCommand.addListener(async (command) => {
  console.log('🎹 Command received:', command);
  
  // Show we received the command
  setBadge('processing', '!');
  
  switch (command) {
    case 'capture_screen':
      console.log('📷 Capture command triggered!');
      await stealthCapture();
      break;
    case 'toggle_listening':
      console.log('🎤 Listen command triggered!');
      await toggleListening();
      break;
    default:
      console.log('Unknown command:', command);
  }
});

// Also handle clicking the extension icon
chrome.action.onClicked.addListener(async () => {
  console.log('🖱️ Extension icon clicked - triggering capture');
  await stealthCapture();
});

// Log registered commands on startup
chrome.commands.getAll((commands) => {
  console.log('📋 Registered commands:', commands);
});

// ============================================
// STEALTH CAPTURE
// ============================================

async function stealthCapture() {
  console.log('🥷 Stealth capture initiated...');
  setBadge('processing', '⏳');
  
  try {
    // Get active tab (not extension pages)
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    console.log('📋 Found tabs:', tabs.length, tabs.map(t => t.url?.substring(0, 50)));
    
    const tab = tabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('chrome-extension://'));
    
    if (!tab) {
      console.error('❌ No suitable tab found. Tabs:', tabs);
      setBadge('error', '✗');
      setTimeout(() => setBadge('ready', '✓'), 3000);
      return;
    }
    
    console.log('📄 Capturing from tab:', tab.id, tab.url?.substring(0, 50));
    
    // Capture page content directly
    let content;
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Get visible text content
          return document.body.innerText;
        }
      });
      content = results?.[0]?.result;
      console.log('📝 Script executed, got content:', content?.length || 0, 'chars');
    } catch (e) {
      console.error('❌ Script injection failed:', e.message);
      setBadge('error', '✗');
      setTimeout(() => setBadge('ready', '✓'), 3000);
      return;
    }
    
    if (!content || content.trim().length < 10) {
      console.error('❌ No content captured or too short');
      setBadge('error', '✗');
      setTimeout(() => setBadge('ready', '✓'), 3000);
      return;
    }
    
    console.log('✅ Captured content:', content.substring(0, 200) + '...');
    
    // Send to backend - it will route to Electron via WebSocket
    await sendToBackend(content, 'extension_capture');
    
  } catch (error) {
    console.error('❌ Stealth capture error:', error);
    setBadge('error', '✗');
    setTimeout(() => setBadge('ready', '✓'), 3000);
  }
}

// ============================================
// SEND TO BACKEND (Routes to Electron)
// ============================================

async function sendToBackend(content, source) {
  try {
    // Don't send provider - let the backend use whatever the user selected in Electron app
    console.log(`📤 Sending to backend (using Electron's selected provider)...`);
    
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        type: source,
        // provider: null - backend will use its current provider setting
        route_to_electron: true  // Tell backend to send answer to Electron
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ Answer received and routed to Electron');
    
    // Success - show green badge briefly
    setBadge('ready', '✓');
    
    return result;
    
  } catch (error) {
    console.error('Backend error:', error);
    setBadge('error', '!');
    setTimeout(() => setBadge('ready', '✓'), 3000);
    throw error;
  }
}

// ============================================
// AUDIO LISTENING
// ============================================

async function toggleListening() {
  isListening = !isListening;
  
  console.log(`🎤 Listening: ${isListening}`);
  
  if (isListening) {
    setBadge('listening', '🎤');
    
    // Tell backend to start listening
    try {
      await fetch(`${BACKEND_URL}/api/listen/start`, { method: 'POST' });
    } catch (e) {
      console.log('Backend listen start:', e.message);
    }
  } else {
    setBadge('ready', '✓');
    
    // Tell backend to stop listening
    try {
      await fetch(`${BACKEND_URL}/api/listen/stop`, { method: 'POST' });
    } catch (e) {
      console.log('Backend listen stop:', e.message);
    }
  }
  
  // Also try to toggle in current tab (for Web Speech API fallback)
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && !tab.url?.startsWith('chrome')) {
      await chrome.tabs.sendMessage(tab.id, { 
        type: isListening ? 'START_LISTENING' : 'STOP_LISTENING' 
      });
    }
  } catch (e) {
    // Tab might not have content script
  }
}

// ============================================
// BACKEND CONNECTION CHECK
// ============================================

async function checkBackendConnection() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    isConnected = response.ok;
    
    if (isConnected && !isListening) {
      setBadge('ready', '✓');
    } else if (!isConnected) {
      setBadge('error', '!');
    }
    
    return isConnected;
  } catch (error) {
    isConnected = false;
    setBadge('error', '!');
    return false;
  }
}

// Check connection periodically
setInterval(checkBackendConnection, 10000);

// ============================================
// MESSAGE HANDLING (from content scripts)
// ============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'TRANSCRIPT' && message.isFinal) {
    // Audio transcript received - analyze it
    console.log('🎤 Transcript:', message.text);
    sendToBackend(message.text, 'audio_transcript');
  }
  
  if (message.type === 'PAGE_CONTENT') {
    sendToBackend(message.content, 'page_content');
  }
});

// ============================================
// STARTUP
// ============================================

console.log('🥷 Wingman AI Stealth Mode initialized');
console.log('   📷 Cmd+Shift+S = Capture screen');
console.log('   🎤 Cmd+Shift+L = Toggle listening');
console.log('   👁️ Answers appear in Desktop App (hidden!)');

checkBackendConnection();
