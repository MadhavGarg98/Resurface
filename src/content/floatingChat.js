let chatElement = null;
let chatButton = null;
let isChatOpen = false;

export function initFloatingChat() {
  injectChatStyles();
  createChatButton();
  console.log('[FloatingChat] Initialized');
}

function createChatButton() {
  // Create floating button
  chatButton = document.createElement('div');
  chatButton.id = 'resurface-chat-button';
  chatButton.innerHTML = `
    <img 
      src="${chrome.runtime.getURL('icons/favicon.png')}" 
      style="width: 28px; height: 28px; object-fit: contain;" 
      alt="" 
    />
  `;
  chatButton.title = 'Ask Resurface about your saved resources';
  
  chatButton.addEventListener('click', toggleChat);
  
  document.body.appendChild(chatButton);
}

function toggleChat() {
  if (isChatOpen) {
    closeChat();
  } else {
    openChat();
  }
}

function openChat() {
  if (chatElement) {
    chatElement.remove();
  }
  
  chatElement = document.createElement('div');
  chatElement.id = 'resurface-mini-chat';
  chatElement.innerHTML = `
    <div class="rmc-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 16px; height: 16px;" alt="" />
        <span>Ask Resurface</span>
      </div>
      <button class="rmc-close" id="rmc-close">✕</button>
    </div>
    <div class="rmc-messages" id="rmc-messages">
      <div class="rmc-bot-message">
        👋 Hi! You can ask me about your saved resources.<br>
        Try: "What did I save about AI?" or "Show my recent saves"
      </div>
    </div>
    <div class="rmc-input-area">
      <input 
        type="text" 
        id="rmc-input" 
        placeholder="Ask about your saved resources..." 
        class="rmc-input"
        autocomplete="off"
      />
      <button id="rmc-send" class="rmc-send-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 22 1-1 18-9-18-9-1 1 2 8h10"></path>
        </svg>
      </button>
    </div>
  `;
  
  document.body.appendChild(chatElement);
  
  // Add event listeners
  document.getElementById('rmc-close').addEventListener('click', closeChat);
  document.getElementById('rmc-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleChatSend();
  });
  document.getElementById('rmc-send').addEventListener('click', handleChatSend);
  
  isChatOpen = true;
  chatButton.style.display = 'none';
  
  // Focus input
  setTimeout(() => {
    document.getElementById('rmc-input')?.focus();
  }, 100);
}

function closeChat() {
  if (chatElement) {
    chatElement.remove();
    chatElement = null;
  }
  isChatOpen = false;
  chatButton.style.display = 'flex';
}

async function handleChatSend() {
  const input = document.getElementById('rmc-input');
  const query = input.value.trim();
  
  if (!query) return;
  
  // Add user message
  addMessage('user', query);
  input.value = '';
  
  // Add loading message
  const loadingId = addMessage('bot', 'Searching your resources... 🔍');
  
  try {
    // Search saved resources
    const { getResources } = await import('../utils/storage.js');
    const resources = await getResources();
    
    // Simple search
    const lowerQuery = query.toLowerCase();
    const results = resources.filter(r => 
      (r.title || '').toLowerCase().includes(lowerQuery) ||
      (r.summary || '').toLowerCase().includes(lowerQuery) ||
      (r.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery))
    ).slice(0, 5);
    
    // Remove loading message
    removeMessage(loadingId);
    
    if (results.length === 0) {
      addMessage('bot', '📭 I couldn\'t find any saved resources matching your query. Try different keywords, or save some resources first!');
    } else {
      let response = `Found ${results.length} resource${results.length > 1 ? 's' : ''}:\n\n`;
      results.forEach((r, i) => {
        const summary = r.summary || r.textContent?.substring(0, 80) || 'No summary';
        response += `<b>${i + 1}. ${r.title || 'Untitled'}</b>\n${summary.substring(0, 100)}\n\n`;
      });
      addMessage('bot', response);
    }
  } catch (error) {
    removeMessage(loadingId);
    addMessage('bot', '❌ Sorry, something went wrong. Please try again.');
    console.error('Chat search error:', error);
  }
}

function addMessage(type, text) {
  const messagesContainer = document.getElementById('rmc-messages');
  if (!messagesContainer) return;

  const msgDiv = document.createElement('div');
  const id = 'msg-' + Date.now();
  msgDiv.id = id;
  msgDiv.className = type === 'user' ? 'rmc-user-message' : 'rmc-bot-message';
  msgDiv.innerHTML = text.replace(/\n/g, '<br>');
  messagesContainer.appendChild(msgDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  return id;
}

function removeMessage(id) {
  const msg = document.getElementById(id);
  if (msg) msg.remove();
}

function injectChatStyles() {
  if (document.getElementById('resurface-chat-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'resurface-chat-styles';
  styles.textContent = `
    #resurface-chat-button {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 56px;
      height: 56px;
      background: #FFFFFF;
      border: 2px solid #E8E2D6;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(61, 56, 50, 0.12);
      z-index: 2147483645;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      user-select: none;
    }
    
    #resurface-chat-button:hover {
      box-shadow: 0 8px 24px rgba(196, 154, 108, 0.25);
      transform: translateY(-2px);
      border-color: #C49A6C;
    }
    
    #resurface-mini-chat {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 360px;
      height: 500px;
      background: #FAF8F5;
      border: 1px solid #E8E2D6;
      border-radius: 24px;
      box-shadow: 0 12px 48px rgba(61, 56, 50, 0.15);
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
    }
    
    .rmc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      background: #FFFFFF;
      border-bottom: 1px solid #E8E2D6;
      font-size: 14px;
      font-weight: 800;
      color: #3D3832;
      letter-spacing: -0.01em;
    }
    
    .rmc-close {
      background: none;
      border: none;
      font-size: 14px;
      color: #A8A29E;
      cursor: pointer;
      padding: 6px;
      border-radius: 10px;
      transition: all 0.2s;
    }
    
    .rmc-close:hover {
      background: #FAF8F5;
      color: #3D3832;
    }
    
    .rmc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .rmc-bot-message {
      align-self: flex-start;
      max-width: 85%;
      padding: 12px 16px;
      background: #FFFFFF;
      border: 1px solid #E8E2D6;
      border-radius: 16px 16px 16px 4px;
      font-size: 13px;
      line-height: 1.6;
      color: #3D3832;
      box-shadow: 0 2px 4px rgba(0,0,0,0.02);
    }
    
    .rmc-user-message {
      align-self: flex-end;
      max-width: 85%;
      padding: 12px 16px;
      background: #3D3832;
      color: #FFFFFF;
      border-radius: 16px 16px 4px 16px;
      font-size: 13px;
      line-height: 1.6;
      box-shadow: 0 4px 12px rgba(61, 56, 50, 0.2);
    }
    
    .rmc-input-area {
      display: flex;
      align-items: center;
      padding: 16px;
      border-top: 1px solid #E8E2D6;
      background: #FFFFFF;
      gap: 10px;
    }
    
    .rmc-input {
      flex: 1;
      height: 40px;
      padding: 0 16px;
      border: 1px solid #E8E2D6;
      border-radius: 20px;
      font-size: 13px;
      outline: none;
      color: #3D3832;
      background: #FAF8F5;
      transition: all 0.2s;
    }
    
    .rmc-input:focus {
      border-color: #C49A6C;
      background: #FFFFFF;
      box-shadow: 0 0 0 3px rgba(196, 154, 108, 0.1);
    }
    
    .rmc-send-btn {
      width: 40px;
      height: 40px;
      background: #C49A6C;
      color: #FFFFFF;
      border: none;
      border-radius: 50%;
      font-size: 18px;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(196, 154, 108, 0.3);
    }
    
    .rmc-send-btn:hover {
      background: #B5895B;
      transform: scale(1.05);
    }
  `;
  
  document.head.appendChild(styles);
}
