// ============================================
// RESURFACE ULTIMATE FLOATING CHAT v3.5
// (Restored visuals + AI Integration)
// ============================================

(function() {
  if (window.self !== window.top) return;
  if (window.__rs_chat_ultimate_v3) return;
  window.__rs_chat_ultimate_v3 = true;

  let chatElement = null;
  let chatButton = null;
  let isChatOpen = false;

  // Initialize from storage
  chrome.storage.local.get(['showFloatingChat'], (result) => {
    if (result.showFloatingChat !== false) {
      injectChatStyles();
      createChatButton();
      console.log('💎 [Resurface Chat] Ready & Active');
    }
  });

  // Listen for setting changes
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.showFloatingChat) {
      if (changes.showFloatingChat.newValue !== false) {
        if (!document.getElementById('resurface-chat-button')) {
          injectChatStyles();
          createChatButton();
        }
      } else {
        removeUI();
      }
    }
  });

  function createChatButton() {
    if (document.getElementById('resurface-chat-button')) return;

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
    if (isChatOpen) closeChat();
    else openChat();
  }

  function openChat() {
    if (chatElement) chatElement.remove();
    
    chatElement = document.createElement('div');
    chatElement.id = 'resurface-mini-chat';
    chatElement.innerHTML = `
      <div class="rmc-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 16px; height: 16px;" alt="" />
          <span>Ask Resurface AI</span>
        </div>
        <button class="rmc-close" id="rmc-close">✕</button>
      </div>
      <div class="rmc-messages" id="rmc-messages">
        <div class="rmc-bot-message">
          👋 Hi! I'm your Resurface AI assistant. Ask me anything about your saved knowledge!
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
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(chatElement);
    
    document.getElementById('rmc-close').onclick = closeChat;
    document.getElementById('rmc-input').onkeydown = (e) => {
      if (e.key === 'Enter') handleChatSend();
    };
    document.getElementById('rmc-send').onclick = handleChatSend;
    
    isChatOpen = true;
    chatButton.style.display = 'none';
    setTimeout(() => document.getElementById('rmc-input')?.focus(), 100);
  }

  function closeChat() {
    if (chatElement) {
      chatElement.remove();
      chatElement = null;
    }
    isChatOpen = false;
    if (chatButton) chatButton.style.display = 'flex';
  }

  async function handleChatSend() {
    const input = document.getElementById('rmc-input');
    const query = input.value.trim();
    if (!query) return;

    addMessage('user', query);
    input.value = '';
    
    const loadingId = addMessage('bot', 'Thinking... 🧠');
    
    // Call background AI handler
    chrome.runtime.sendMessage({ 
      action: 'CHAT_QUERY', 
      data: { query, history: getChatHistory() } 
    }, (response) => {
      removeMessage(loadingId);
      if (response && response.text) {
        addMessage('bot', response.text);
        
        // ADDED: Display clickable resource links
        if (response.matches && response.matches.length > 0) {
          const linksHtml = response.matches.map(m => `
            <div class="rmc-link-card" onclick="window.open('${m.url}', '_blank')">
              <div style="font-weight:700; font-size:12px; color:#C49A6C; margin-bottom:2px;">${m.title}</div>
              <div style="font-size:10px; color:#A8A29E; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${m.url}</div>
            </div>
          `).join('');
          
          const linksContainer = document.createElement('div');
          linksContainer.style.marginTop = '8px';
          linksContainer.innerHTML = linksHtml;
          document.getElementById('rmc-messages').appendChild(linksContainer);
          document.getElementById('rmc-messages').scrollTop = document.getElementById('rmc-messages').scrollHeight;
        }
      } else {
        addMessage('bot', '❌ Sorry, I had trouble connecting to my AI brain.');
      }
    });
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

  function getChatHistory() {
    const messages = [];
    const container = document.getElementById('rmc-messages');
    if (!container) return [];
    const nodes = container.querySelectorAll('.rmc-user-message, .rmc-bot-message');
    nodes.forEach(node => {
      messages.push({
        role: node.className.includes('user') ? 'user' : 'assistant',
        content: node.innerText
      });
    });
    return messages.slice(-10);
  }

  function removeUI() {
    if (chatButton) chatButton.remove();
    if (chatElement) chatElement.remove();
    chatButton = null;
    chatElement = null;
    isChatOpen = false;
  }

  function injectChatStyles() {
    if (document.getElementById('resurface-chat-styles')) return;
    const styles = document.createElement('style');
    styles.id = 'resurface-chat-styles';
    styles.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
      
      #resurface-chat-button {
        position: fixed; bottom: 24px; right: 24px;
        width: 56px; height: 56px; background: #FFFFFF;
        border: 2px solid #E8E2D6; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; box-shadow: 0 4px 16px rgba(61, 56, 50, 0.12);
        z-index: 2147483645; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      #resurface-chat-button:hover {
        box-shadow: 0 8px 24px rgba(196, 154, 108, 0.25);
        transform: translateY(-2px); border-color: #C49A6C;
      }
      #resurface-mini-chat {
        position: fixed; bottom: 24px; right: 24px;
        width: 360px; height: 500px; background: #FAF8F5;
        border: 1px solid #E8E2D6; border-radius: 24px;
        box-shadow: 0 12px 48px rgba(61, 56, 50, 0.15);
        z-index: 2147483646; display: flex; flex-direction: column;
        overflow: hidden; font-family: 'Outfit', system-ui, -apple-system, sans-serif;
        animation: rsSlideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }
      @keyframes rsSlideUp { from { opacity:0; transform:translateY(30px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
      .rmc-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 16px 20px; background: #FFFFFF; border-bottom: 1px solid #E8E2D6;
        font-size: 14px; font-weight: 800; color: #3D3832;
      }
      .rmc-close { background: none; border: none; font-size: 14px; color: #A8A29E; cursor: pointer; padding: 6px; }
      .rmc-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; scrollbar-width: none; }
      .rmc-messages::-webkit-scrollbar { display: none; }
      .rmc-bot-message { align-self: flex-start; max-width: 85%; padding: 12px 16px; background: #FFFFFF; border: 1px solid #E8E2D6; border-radius: 16px 16px 16px 4px; font-size: 13px; line-height: 1.6; color: #3D3832; }
      .rmc-user-message { align-self: flex-end; max-width: 85%; padding: 12px 16px; background: #3D3832; color: #FFFFFF; border-radius: 16px 16px 4px 16px; font-size: 13px; line-height: 1.6; }
      .rmc-input-area { display: flex; align-items: center; padding: 16px; border-top: 1px solid #E8E2D6; background: #FFFFFF; gap: 10px; }
      .rmc-input { flex: 1; height: 40px; padding: 0 16px; border: 1px solid #E8E2D6; border-radius: 20px; font-size: 13px; outline: none; background: #FAF8F5; }
      .rmc-input:focus { border-color: #C49A6C; background: #FFFFFF; }
      .rmc-send-btn { width: 40px; height: 40px; background: #C49A6C; color: #FFFFFF; border: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.3s; }
      .rmc-send-btn:hover { background: #B5895B; transform: scale(1.05); }
      .rmc-link-card { 
        background: #FFFFFF; border: 1px solid #E8E2D6; border-radius: 12px; 
        padding: 10px; margin-bottom: 8px; cursor: pointer; transition: all 0.2s;
        box-shadow: 0 2px 6px rgba(0,0,0,0.05);
      }
      .rmc-link-card:hover { border-color: #C49A6C; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(196, 154, 108, 0.1); }
    `;
    document.head.appendChild(styles);
  }
})();
