/**
 * Wingman AI - Popup Script
 * Handles UI interactions and displays answers
 */

// DOM Elements
const captureBtn = document.getElementById('captureBtn');
const listenBtn = document.getElementById('listenBtn');
const listenText = document.getElementById('listenText');
const transcriptContainer = document.getElementById('transcriptContainer');
const transcript = document.getElementById('transcript');
const questionContainer = document.getElementById('questionContainer');
const questionText = document.getElementById('questionText');
const answerContainer = document.getElementById('answerContainer');
const answerText = document.getElementById('answerText');
const copyBtn = document.getElementById('copyBtn');
const loading = document.getElementById('loading');
const connectionStatus = document.getElementById('connectionStatus');
const providerSelect = document.getElementById('providerSelect');

// State
let isListening = false;
let currentAnswer = '';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Get initial status
  const status = await chrome.runtime.sendMessage({ type: 'GET_STATUS' });
  updateStatus(status);
  
  // Load saved provider
  const { aiProvider } = await chrome.storage.local.get('aiProvider');
  if (aiProvider) {
    providerSelect.value = aiProvider;
  }
});

// Listen for messages from background
chrome.runtime.onMessage.addListener((message) => {
  console.log('[Popup] Message:', message.type);
  
  switch (message.type) {
    case 'CONNECTED':
      setConnected(true);
      break;
      
    case 'DISCONNECTED':
      setConnected(false);
      break;
      
    case 'QUESTION_DETECTED':
      showQuestion(message.question, message.source);
      break;
      
    case 'ANSWER_GENERATING':
      showLoading(true);
      break;
      
    case 'ANSWER_CHUNK':
      appendAnswer(message.chunk);
      break;
      
      case 'ANSWER_COMPLETE':
      showAnswer(message.answer, message.provider);
      showLoading(false);
      break;
      
    case 'ANSWER_ERROR':
      showError(message.error);
      showLoading(false);
      break;
      
    case 'TRANSCRIPT_PARTIAL':
      updateTranscript(message.text);
      break;
      
    case 'LISTENING_STATUS':
      updateListeningState(message.isListening);
      break;
  }
});

// Capture button click
captureBtn.addEventListener('click', async () => {
  showLoading(true);
  clearAnswer();
  
  const result = await chrome.runtime.sendMessage({ type: 'CAPTURE_PAGE' });
  
  if (result?.error) {
    showError(result.error);
    showLoading(false);
  }
  // Answer will come through message events
});

// Listen button click
listenBtn.addEventListener('click', async () => {
  const result = await chrome.runtime.sendMessage({ type: 'TOGGLE_LISTENING' });
  updateListeningState(result?.isListening);
});

// Copy button click
copyBtn.addEventListener('click', () => {
  if (currentAnswer) {
    navigator.clipboard.writeText(currentAnswer).then(() => {
      copyBtn.classList.add('copied');
      setTimeout(() => copyBtn.classList.remove('copied'), 2000);
    });
  }
});

// Provider change
providerSelect.addEventListener('change', () => {
  const provider = providerSelect.value;
  chrome.runtime.sendMessage({ 
    type: 'SET_AI_PROVIDER', 
    provider 
  });
  chrome.storage.local.set({ aiProvider: provider });
});

// UI Update Functions
function setConnected(connected) {
  const dot = connectionStatus.querySelector('.status-dot');
  const text = connectionStatus.querySelector('.status-text');
  
  if (connected) {
    dot.classList.add('connected');
    dot.classList.remove('disconnected');
    text.textContent = 'Connected';
  } else {
    dot.classList.remove('connected');
    dot.classList.add('disconnected');
    text.textContent = 'Disconnected';
  }
}

function updateStatus(status) {
  if (status) {
    setConnected(status.isConnected);
    updateListeningState(status.isListening);
    
    if (status.currentQuestion) {
      showQuestion(status.currentQuestion);
    }
    
    if (status.currentAnswer) {
      showAnswer(status.currentAnswer);
    }
  }
}

function updateListeningState(listening) {
  isListening = listening;
  
  if (listening) {
    listenBtn.classList.add('active');
    listenText.textContent = 'Stop';
    transcriptContainer.classList.remove('hidden');
  } else {
    listenBtn.classList.remove('active');
    listenText.textContent = 'Listen';
    transcriptContainer.classList.add('hidden');
  }
}

function updateTranscript(text) {
  transcript.textContent = text || '...';
}

function showQuestion(text, source) {
  questionText.textContent = text.length > 200 ? text.substring(0, 200) + '...' : text;
  questionContainer.classList.remove('hidden');
  
  if (source === 'audio') {
    questionContainer.style.borderColor = '#f59e0b'; // Orange for audio
  } else {
    questionContainer.style.borderColor = '#0ea5e9'; // Blue for screen
  }
}

function showLoading(show) {
  if (show) {
    loading.classList.remove('hidden');
    answerText.innerHTML = '';
  } else {
    loading.classList.add('hidden');
  }
}

function clearAnswer() {
  currentAnswer = '';
  answerText.innerHTML = '<div class="placeholder">Analyzing...</div>';
}

function appendAnswer(chunk) {
  loading.classList.add('hidden');
  
  // Remove placeholder if present
  const placeholder = answerText.querySelector('.placeholder');
  if (placeholder) {
    answerText.innerHTML = '';
  }
  
  currentAnswer += chunk;
  answerText.innerHTML = formatAnswer(currentAnswer);
  
  // Auto-scroll to bottom
  answerText.scrollTop = answerText.scrollHeight;
}

function showAnswer(answer, provider) {
  currentAnswer = answer || currentAnswer;
  answerText.innerHTML = formatAnswer(currentAnswer);
  
  // Show which provider was used
  if (provider) {
    const label = document.querySelector('.answer-label');
    if (label) {
      label.innerHTML = `Answer <span style="font-size: 10px; color: var(--text-muted); margin-left: 8px;">via ${provider}</span>`;
    }
  }
}

function showError(error) {
  answerText.innerHTML = `<div class="placeholder" style="color: #ef4444;">Error: ${error}</div>`;
}

// Format answer with syntax highlighting
function formatAnswer(text) {
  if (!text) return '<div class="placeholder">No answer yet</div>';
  
  // First, handle code blocks with syntax highlighting
  text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'code';
    const highlighted = highlightCode(code.trim(), language);
    return `<div class="code-block-wrapper"><pre data-language="${language}"><code>${highlighted}</code></pre><button class="code-copy-btn" onclick="copyCode(this)">Copy</button></div>`;
  });
  
  return text
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
}

// Simple syntax highlighter
function highlightCode(code, language) {
  // Escape HTML first
  code = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Common patterns for syntax highlighting
  const patterns = {
    // Comments
    comment: {
      pattern: /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm,
      class: 'comment'
    },
    // Strings
    string: {
      pattern: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
      class: 'string'
    },
    // Numbers
    number: {
      pattern: /\b(\d+\.?\d*)\b/g,
      class: 'number'
    },
    // Keywords (common across languages)
    keyword: {
      pattern: /\b(function|const|let|var|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|from|async|await|try|catch|finally|throw|new|this|super|static|public|private|protected|def|self|elif|pass|lambda|yield|with|as|True|False|None|true|false|null|undefined|int|float|double|char|boolean|void|string|struct|enum|interface|type|fn|impl|pub|mod|use|match|loop|mut)\b/g,
      class: 'keyword'
    },
    // Built-in functions/types
    builtin: {
      pattern: /\b(print|println|console|log|len|range|str|int|float|list|dict|set|tuple|map|filter|reduce|Math|Array|Object|String|Number|Boolean|Date|JSON|Promise|Error)\b/g,
      class: 'builtin'
    },
    // Function calls
    function: {
      pattern: /\b([a-zA-Z_]\w*)\s*\(/g,
      class: 'function',
      replacement: '<span class="function">$1</span>('
    },
    // Types/Classes (capitalized words)
    type: {
      pattern: /\b([A-Z][a-zA-Z0-9_]*)\b/g,
      class: 'type'
    },
    // Operators
    operator: {
      pattern: /([+\-*/%=!<>&|^~?:]+)/g,
      class: 'operator'
    }
  };
  
  // Apply highlighting in order (to avoid conflicts)
  // First protect strings and comments
  const protected = [];
  
  // Protect strings
  code = code.replace(patterns.string.pattern, (match) => {
    protected.push(`<span class="string">${match}</span>`);
    return `__PROTECTED_${protected.length - 1}__`;
  });
  
  // Protect comments
  code = code.replace(patterns.comment.pattern, (match) => {
    protected.push(`<span class="comment">${match}</span>`);
    return `__PROTECTED_${protected.length - 1}__`;
  });
  
  // Apply other highlighting
  code = code.replace(patterns.keyword.pattern, '<span class="keyword">$1</span>');
  code = code.replace(patterns.builtin.pattern, '<span class="builtin">$1</span>');
  code = code.replace(patterns.number.pattern, '<span class="number">$1</span>');
  code = code.replace(/\b([a-zA-Z_]\w*)\s*\(/g, '<span class="function">$1</span>(');
  
  // Restore protected content
  protected.forEach((content, i) => {
    code = code.replace(`__PROTECTED_${i}__`, content);
  });
  
  return code;
}

// Copy code to clipboard
window.copyCode = function(btn) {
  const codeBlock = btn.previousElementSibling;
  const code = codeBlock.textContent;
  
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'Copy';
      btn.classList.remove('copied');
    }, 2000);
  });
}

