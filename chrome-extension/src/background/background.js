/**
 * Wingman AI - Chrome Extension Background Service Worker
 * Handles communication between content scripts, popup, and backend
 */

const BACKEND_URL = 'http://localhost:8765';
let isListening = false;
let currentAnswer = null;
let currentQuestion = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Wingman AI Extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Fresh install - set defaults
    // Using Groq as default since it's fast and reliable
    chrome.storage.local.set({
      isEnabled: true,
      autoCapture: false,
      aiProvider: 'groq',
      aiModel: 'llama-3.3-70b-versatile',
      backendUrl: BACKEND_URL
    });
  }
  // Don't auto-migrate - let user choose their preferred provider
});

// Check on startup - set default if not set
chrome.runtime.onStartup.addListener(async () => {
  const { aiProvider } = await chrome.storage.local.get('aiProvider');
  if (!aiProvider) {
    chrome.storage.local.set({
      aiProvider: 'groq',
      aiModel: 'llama-3.3-70b-versatile'
    });
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  console.log('Command received:', command);
  
  if (command === 'capture_screen') {
    await captureAndAnalyze();
  } else if (command === 'toggle_listening') {
    await toggleListening();
  }
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  switch (message.type) {
    case 'CAPTURE_PAGE':
      captureAndAnalyze().then(sendResponse);
      return true; // Keep channel open for async response
      
    case 'TOGGLE_LISTENING':
      toggleListening().then(sendResponse);
      return true;
      
    case 'GET_STATUS':
      sendResponse({
        isListening,
        currentAnswer,
        currentQuestion,
        isConnected: socket?.readyState === WebSocket.OPEN
      });
      break;
      
    case 'SUBMIT_QUESTION':
      submitQuestion(message.question).then(sendResponse);
      return true;
      
    case 'PAGE_CONTENT':
      // Received page content from content script
      analyzeContent(message.content).then(sendResponse);
      return true;
      
    case 'TRANSCRIPT':
      // Received speech transcript
      handleTranscript(message.text, message.isFinal);
      break;
      
    case 'SET_AI_PROVIDER':
      setAIProvider(message.provider, message.model);
      break;
  }
});

// Capture current tab and analyze
async function captureAndAnalyze() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      console.error('No active tab found');
      return { error: 'No active tab' };
    }
    
    // First, try to inject the content script if it's not already there
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['src/content/content.js']
      });
      console.log('Content script injected');
    } catch (injectError) {
      console.log('Content script already exists or cannot inject:', injectError.message);
    }
    
    // Small delay to let script initialize
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Send message to content script to capture page content
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE_CONTENT' });
      
      if (response?.content) {
        return await analyzeContent(response.content);
      }
    } catch (msgError) {
      console.error('Message error:', msgError);
      // If content script communication fails, try direct capture
      return await directCapture(tab);
    }
    
    return { error: 'Failed to capture content' };
  } catch (error) {
    console.error('Capture error:', error);
    return { error: error.message };
  }
}

// Direct capture using scripting API (fallback)
async function directCapture(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Get all visible text from the page
        return document.body.innerText;
      }
    });
    
    if (results?.[0]?.result) {
      return await analyzeContent(results[0].result);
    }
    return { error: 'Could not capture page content' };
  } catch (error) {
    console.error('Direct capture error:', error);
    return { error: 'Cannot access this page. Try refreshing or use a different page.' };
  }
}

// Analyze content for questions
async function analyzeContent(content, source = 'screen') {
  console.log('Analyzing content:', content.substring(0, 200) + '...');
  
  // Store as current question
  currentQuestion = content;
  currentAnswer = null;
  
  // Notify popup of new question
  broadcastToPopup({ type: 'QUESTION_DETECTED', question: content });
  broadcastToPopup({ type: 'ANSWER_GENERATING' });
  
  try {
    // Get current provider from storage (default: gemini for extension)
    const { aiProvider, aiModel } = await chrome.storage.local.get(['aiProvider', 'aiModel']);
    const provider = aiProvider || 'gemini';
    const model = aiModel || 'gemini-2.0-flash';
    
    console.log(`Using AI provider: ${provider} (${model})`);
    
    // Send to backend REST API for analysis with provider preference
    const response = await fetch(`${BACKEND_URL}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        content, 
        type: source,
        provider,  // Tell backend which AI to use
        model
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    currentAnswer = result.answer;
    
    console.log('Got answer:', currentAnswer?.substring(0, 100) + '...');
    broadcastToPopup({ type: 'ANSWER_COMPLETE', answer: result.answer, provider: result.provider });
    
    return result;
  } catch (error) {
    console.error('Analysis failed:', error.message);
    broadcastToPopup({ type: 'ANSWER_ERROR', error: error.message });
    return { error: error.message };
  }
}

// Check backend connection status
async function checkBackendConnection() {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    const connected = response.ok;
    broadcastToPopup({ type: connected ? 'CONNECTED' : 'DISCONNECTED' });
    return connected;
  } catch (error) {
    broadcastToPopup({ type: 'DISCONNECTED' });
    return false;
  }
}

// Periodically check connection
setInterval(checkBackendConnection, 5000);

// Toggle listening mode
async function toggleListening() {
  isListening = !isListening;
  
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    await chrome.tabs.sendMessage(tab.id, { 
      type: isListening ? 'START_LISTENING' : 'STOP_LISTENING' 
    });
  }
  
  broadcastToPopup({ type: 'LISTENING_STATUS', isListening });
  
  return { isListening };
}

// Handle speech transcript
function handleTranscript(text, isFinal) {
  if (isFinal && text.trim().length > 10) {
    // Check if it's a question
    const questionIndicators = ['?', 'what', 'how', 'why', 'explain', 'describe'];
    const isQuestion = questionIndicators.some(q => text.toLowerCase().includes(q));
    
    if (isQuestion) {
      currentQuestion = text;
      broadcastToPopup({ type: 'QUESTION_DETECTED', question: text, source: 'audio' });
      analyzeContent(text);
    }
  } else {
    broadcastToPopup({ type: 'TRANSCRIPT_PARTIAL', text });
  }
}

// Submit manual question
async function submitQuestion(question) {
  currentQuestion = question;
  return await analyzeContent(question);
}

// Set AI provider
function setAIProvider(provider, model) {
  chrome.storage.local.set({ aiProvider: provider, aiModel: model });
  
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({
      type: 'set_ai_provider',
      provider,
      model
    }));
  }
}

// Broadcast message to popup and side panel
function broadcastToPopup(message) {
  chrome.runtime.sendMessage(message).catch(() => {
    // Popup might not be open, that's fine
  });
}

// Initialize - check backend connection
checkBackendConnection();
console.log('Wingman AI background script initialized');

