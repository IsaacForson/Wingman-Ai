/**
 * Wingman AI - Content Script
 * Captures page content and handles speech recognition
 * Runs in the context of web pages
 */

let recognition = null;
let isListening = false;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Wingman Content] Message:', message.type);
  
  switch (message.type) {
    case 'CAPTURE_CONTENT':
      const content = capturePageContent();
      sendResponse({ content });
      break;
      
    case 'START_LISTENING':
      startSpeechRecognition();
      sendResponse({ success: true });
      break;
      
    case 'STOP_LISTENING':
      stopSpeechRecognition();
      sendResponse({ success: true });
      break;
      
    case 'GET_PAGE_INFO':
      sendResponse({
        url: window.location.href,
        title: document.title,
        isZoom: isZoomMeeting(),
        isMeet: isGoogleMeet()
      });
      break;
  }
  
  return true;
});

/**
 * Capture all visible text content from the page
 * Smart extraction that focuses on question-like content
 */
function capturePageContent() {
  const content = {
    text: '',
    questions: [],
    codeBlocks: [],
    mcqOptions: [],
    url: window.location.href,
    title: document.title
  };
  
  // Get all visible text
  const textContent = extractVisibleText();
  content.text = textContent;
  
  // Find potential questions
  content.questions = findQuestions(textContent);
  
  // Find code blocks
  content.codeBlocks = findCodeBlocks();
  
  // Find MCQ options
  content.mcqOptions = findMCQOptions();
  
  // Prioritize what to send
  let primaryContent = '';
  
  if (content.mcqOptions.length > 0) {
    // MCQ detected - send the question with options
    primaryContent = formatMCQ(content);
  } else if (content.codeBlocks.length > 0) {
    // Code question detected
    primaryContent = formatCodeQuestion(content);
  } else if (content.questions.length > 0) {
    // General questions found
    primaryContent = content.questions.join('\n\n');
  } else {
    // Send general text (trimmed)
    primaryContent = textContent.substring(0, 5000);
  }
  
  console.log('[Wingman Content] Captured:', primaryContent.substring(0, 200) + '...');
  
  return primaryContent;
}

/**
 * Extract visible text from the page
 */
function extractVisibleText() {
  // Target common content areas
  const selectors = [
    // Generic content
    'main', 'article', '.content', '#content', '.main-content',
    // Question platforms
    '.question-content', '.problem-statement', '.challenge-description',
    // LeetCode
    '[data-track-load="description_content"]', '.question-content__JfgR',
    // HackerRank
    '.challenge-body-html', '.problem-statement',
    // CodeSignal
    '.markdown-body',
    // Meeting platforms (chat/captions)
    '.chat-message', '.caption-text', '[data-message-text]',
    // Google Meet
    '.iOzk7', '.TBMuR',
    // Zoom
    '.chat-item__txt', '.meeting-chat-container',
    // Generic exam/quiz
    '.exam-question', '.quiz-question', '.assessment-question'
  ];
  
  let text = '';
  
  // Try specific selectors first
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (isVisible(el)) {
        text += el.innerText + '\n\n';
      }
    });
  }
  
  // If no specific content found, get body text
  if (text.trim().length < 100) {
    text = document.body.innerText;
  }
  
  // Clean up
  text = text
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
  
  return text;
}

/**
 * Check if element is visible
 */
function isVisible(element) {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && 
         style.visibility !== 'hidden' && 
         style.opacity !== '0' &&
         element.offsetParent !== null;
}

/**
 * Find question-like content
 */
function findQuestions(text) {
  const questions = [];
  const lines = text.split('\n');
  
  const questionPatterns = [
    /^.*\?$/,  // Ends with ?
    /^(what|how|why|when|where|which|who|explain|describe|implement|write|create|solve|find|calculate|determine)/i,
    /^(question|problem|challenge|task)[\s:]/i,
    /^\d+[\.\)]\s*.+/,  // Numbered items
  ];
  
  let currentQuestion = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if line looks like a question
    const isQuestion = questionPatterns.some(pattern => pattern.test(trimmed));
    
    if (isQuestion) {
      if (currentQuestion) {
        questions.push(currentQuestion.trim());
      }
      currentQuestion = trimmed;
    } else if (currentQuestion && trimmed) {
      // Continue building current question
      currentQuestion += ' ' + trimmed;
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion.trim());
  }
  
  return questions.filter(q => q.length > 20);
}

/**
 * Find code blocks
 */
function findCodeBlocks() {
  const codeBlocks = [];
  
  // Pre/code elements
  document.querySelectorAll('pre, code, .code-block, .CodeMirror, .monaco-editor').forEach(el => {
    const code = el.innerText.trim();
    if (code.length > 20) {
      codeBlocks.push({
        code,
        language: detectLanguage(code)
      });
    }
  });
  
  return codeBlocks;
}

/**
 * Simple language detection
 */
function detectLanguage(code) {
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes('function ') || code.includes('=>')) return 'javascript';
  if (code.includes('public class') || code.includes('public static void')) return 'java';
  if (code.includes('#include') || code.includes('int main')) return 'c';
  if (code.includes('fn ') && code.includes('->')) return 'rust';
  if (code.includes('func ') && code.includes('package')) return 'go';
  return 'unknown';
}

/**
 * Find MCQ options
 */
function findMCQOptions() {
  const options = [];
  
  // Look for typical MCQ patterns
  const optionPatterns = [
    /^[A-D][\.\)]\s*(.+)/,
    /^[1-4][\.\)]\s*(.+)/,
    /^\([A-D]\)\s*(.+)/,
  ];
  
  // Find radio buttons or checkboxes with labels
  document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(input => {
    const label = input.labels?.[0] || input.closest('label');
    if (label) {
      options.push({
        id: input.id || input.name,
        text: label.innerText.trim()
      });
    }
  });
  
  // Find labeled options in text
  const text = document.body.innerText;
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    for (const pattern of optionPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        options.push({
          label: trimmed[0],
          text: match[1].trim()
        });
        break;
      }
    }
  }
  
  return options;
}

/**
 * Format MCQ for AI analysis
 */
function formatMCQ(content) {
  let formatted = 'Multiple Choice Question:\n\n';
  
  if (content.questions.length > 0) {
    formatted += content.questions[0] + '\n\n';
  }
  
  formatted += 'Options:\n';
  content.mcqOptions.forEach(opt => {
    formatted += `${opt.label || '•'}) ${opt.text}\n`;
  });
  
  return formatted;
}

/**
 * Format code question for AI analysis
 */
function formatCodeQuestion(content) {
  let formatted = 'Coding Question:\n\n';
  
  if (content.questions.length > 0) {
    formatted += content.questions[0] + '\n\n';
  } else {
    formatted += content.text.substring(0, 1000) + '\n\n';
  }
  
  if (content.codeBlocks.length > 0) {
    formatted += 'Code:\n```' + content.codeBlocks[0].language + '\n';
    formatted += content.codeBlocks[0].code + '\n```\n';
  }
  
  return formatted;
}

/**
 * Check if on Zoom
 */
function isZoomMeeting() {
  return window.location.hostname.includes('zoom.us');
}

/**
 * Check if on Google Meet
 */
function isGoogleMeet() {
  return window.location.hostname.includes('meet.google.com');
}

/**
 * Start speech recognition
 */
function startSpeechRecognition() {
  if (isListening) return;
  
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.error('[Wingman] Speech recognition not supported');
    return;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  
  recognition.onstart = () => {
    isListening = true;
    console.log('[Wingman] Listening started');
  };
  
  recognition.onresult = (event) => {
    let interimTranscript = '';
    let finalTranscript = '';
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }
    
    // Send to background script
    if (finalTranscript) {
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT',
        text: finalTranscript,
        isFinal: true
      });
    } else if (interimTranscript) {
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPT',
        text: interimTranscript,
        isFinal: false
      });
    }
  };
  
  recognition.onerror = (event) => {
    console.error('[Wingman] Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      // Microphone permission denied
      chrome.runtime.sendMessage({
        type: 'MIC_PERMISSION_DENIED'
      });
    }
  };
  
  recognition.onend = () => {
    isListening = false;
    console.log('[Wingman] Listening ended');
    
    // Auto-restart if still supposed to be listening
    if (isListening) {
      recognition.start();
    }
  };
  
  try {
    recognition.start();
  } catch (error) {
    console.error('[Wingman] Failed to start recognition:', error);
  }
}

/**
 * Stop speech recognition
 */
function stopSpeechRecognition() {
  isListening = false;
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  console.log('[Wingman] Listening stopped');
}

// Initialize
console.log('[Wingman AI] Content script loaded on:', window.location.href);

