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
  chatButton.innerHTML = '💬';
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
      <span>💬 Ask Resurface</span>
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
      <button id="rmc-send" class="rmc-send-btn">→</button>
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
      border: 1px solid #F0EBD8;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      cursor: pointer;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      z-index: 2147483645;
      transition: all 0.2s;
      user-select: none;
    }
    
    #resurface-chat-button:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
      transform: scale(1.05);
    }
    
    #resurface-mini-chat {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 360px;
      height: 480px;
      background: #FFFDF7;
      border: 1px solid #F0EBD8;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      z-index: 2147483646;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    
    .rmc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #FFFFFF;
      border-bottom: 1px solid #F0EBD8;
      font-size: 14px;
      font-weight: 600;
      color: #1A1A1A;
    }
    
    .rmc-close {
      background: none;
      border: none;
      font-size: 14px;
      color: #9B9B9B;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
    
    .rmc-close:hover {
      background: #FFF8E7;
      color: #1A1A1A;
    }
    
    .rmc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .rmc-bot-message {
      align-self: flex-start;
      max-width: 85%;
      padding: 10px 14px;
      background: #FFFFFF;
      border: 1px solid #F0EBD8;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      color: #1A1A1A;
    }
    
    .rmc-user-message {
      align-self: flex-end;
      max-width: 85%;
      padding: 10px 14px;
      background: #F5A623;
      color: #FFFFFF;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .rmc-input-area {
      display: flex;
      align-items: center;
      padding: 12px;
      border-top: 1px solid #F0EBD8;
      background: #FFFFFF;
      gap: 8px;
    }
    
    .rmc-input {
      flex: 1;
      height: 36px;
      padding: 0 12px;
      border: 1px solid #E5DFC8;
      border-radius: 18px;
      font-size: 13px;
      outline: none;
      color: #1A1A1A;
    }
    
    .rmc-input:focus {
      border-color: #F5A623;
    }
    
    .rmc-send-btn {
      width: 36px;
      height: 36px;
      background: #F5A623;
      color: #FFFFFF;
      border: none;
      border-radius: 50%;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .rmc-send-btn:hover {
      background: #E09510;
    }
  `;
  
  document.head.appendChild(styles);
}
