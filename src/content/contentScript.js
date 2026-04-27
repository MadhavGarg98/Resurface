(function() {
  // ============================================
  // GLOBAL SAFETY CHECKS
  // ============================================
  if (window.self !== window.top) return;
  if (window.__resurfaceInjected) return;
  window.__resurfaceInjected = true;
  
  console.log('Resurface: Content script active');

  // ============================================
  // SIDEBAR LOGIC
  // ============================================
  let sidebarElement = null;

  function initSidebar() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'SHOW_SIDEBAR') {
        showSidebar(message.data);
        sendResponse({ success: true });
      }
      return true;
    });
  }

  function showSidebar(data) {
    if (sidebarElement) sidebarElement.remove();
    
    sidebarElement = document.createElement('div');
    sidebarElement.id = 'resurface-sidebar';
    const projectColor = data.project.color || '#F5A623';
    
    sidebarElement.innerHTML = `
      <style>
        #resurface-sidebar {
          position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
          background: #FFFDF7; border-left: 1px solid #F0EBD8;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08); z-index: 2147483646;
          transform: translateX(100%); transition: transform 0.3s ease;
          font-family: -apple-system, sans-serif; display: flex; flex-direction: column;
        }
        #resurface-sidebar.visible { transform: translateX(0); }
        .rs-header { padding: 20px; border-bottom: 1px solid #F0EBD8; display: flex; justify-content: space-between; align-items: center; background: #FFF; }
        .rs-project-name { font-weight: 700; color: #1A1A1A; display: flex; align-items: center; gap: 8px; }
        .rs-dot { width: 10px; height: 10px; border-radius: 50%; }
        .rs-close { background: none; border: none; font-size: 18px; color: #9B9B9B; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .rs-close:hover { background: #FFF8E7; color: #1A1A1A; }
        .rs-body { flex: 1; overflow-y: auto; padding: 20px; }
        .rs-item { padding: 12px; background: #FFF; border: 1px solid #F0EBD8; border-radius: 12px; margin-bottom: 10px; cursor: pointer; transition: all 0.2s; }
        .rs-item:hover { border-color: #F5A623; background: #FFFDF7; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .rs-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; color: #1A1A1A; }
        .rs-summary { font-size: 12px; color: #6B6B6B; line-height: 1.4; }
        .rs-footer { padding: 16px; border-top: 1px solid #F0EBD8; background: #FFF; }
        .rs-btn { width: 100%; padding: 10px; background: #F5A623; color: #FFF; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: background 0.2s; }
        .rs-btn:hover { background: #E09510; }
      </style>
      <div class="rs-header">
        <div class="rs-project-name">
          <span class="rs-dot" style="background: ${projectColor};"></span>
          ${data.project.name}
        </div>
        <button class="rs-close" id="rs-close-sidebar">✕</button>
      </div>
      <div class="rs-body">
        <div style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #1A1A1A;">💡 Related Resources</div>
        ${data.resources.length > 0 ? data.resources.map(r => `
          <div class="rs-item" onclick="window.open('${r.url}', '_blank')">
            <div class="rs-title">${r.title || 'Untitled'}</div>
            <div class="rs-summary">${(r.summary || r.textContent || '').substring(0, 100)}...</div>
          </div>
        `).join('') : `
          <div style="padding: 40px 20px; text-align: center; color: #9B9B9B; font-size: 13px;">
            <div style="font-size: 24px; margin-bottom: 12px;">📚</div>
            No resources saved for this project yet. Start by saving this page!
          </div>
        `}
      </div>
      <div class="rs-footer">
        <button class="rs-btn" id="rs-dash-btn">Open Dashboard</button>
      </div>
    `;

    document.body.appendChild(sidebarElement);
    setTimeout(() => sidebarElement.classList.add('visible'), 50);

    document.getElementById('rs-close-sidebar').onclick = () => {
      sidebarElement.classList.remove('visible');
      setTimeout(() => sidebarElement.remove(), 300);
    };

    document.getElementById('rs-dash-btn').onclick = () => {
      window.open(chrome.runtime.getURL('src/popup/dashboard.html'), '_blank');
    };
  }

  // Expose globally for the background script's executeScript
  window.__resurfaceShowSidebar = showSidebar;

  // ============================================
  // DRAGGABLE CHAT BOT LOGIC
  // ============================================
  let chatBtn = null;
  let isDragging = false;
  let startX, startY, startRight, startBottom;

  async function initChat() {
    const settings = await chrome.storage.local.get(['settings']);
    if (settings.settings?.showFloatingChat === false) return;

    chatBtn = document.createElement('div');
    chatBtn.id = 'resurface-chat-btn';
    
    // Muted Warm Circle Design
    Object.assign(chatBtn.style, {
      position: 'fixed', bottom: '20px', right: '20px', width: '48px', height: '48px',
      background: 'linear-gradient(135deg, #F5F1EB 0%, #E8D5BE 100%)',
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'grab', boxShadow: '0 4px 16px rgba(120, 100, 70, 0.12)', zIndex: '2147483645',
      transition: 'transform 0.2s, box-shadow 0.2s', userSelect: 'none',
      border: '1.5px solid #C9B99A'
    });
    
    // Resurface Favicon Logo
    chatBtn.innerHTML = `
      <img 
        src="${chrome.runtime.getURL('icons/favicon.png')}" 
        style="width: 24px; height: 24px; object-fit: contain;" 
        alt="" 
      />
    `;
    
    // Hover Effects
    chatBtn.onmouseenter = () => {
      if (!isDragging) {
        chatBtn.style.transform = 'scale(1.04) translateY(-1px)';
        chatBtn.style.boxShadow = '0 6px 20px rgba(120, 100, 70, 0.18)';
      }
    };
    chatBtn.onmouseleave = () => {
      if (!isDragging) {
        chatBtn.style.transform = 'scale(1)';
        chatBtn.style.boxShadow = '0 4px 16px rgba(120, 100, 70, 0.12)';
      }
    };

    // Dragging Logic
    chatBtn.onmousedown = (e) => {
      isDragging = false; // Reset on every click
      startX = e.clientX;
      startY = e.clientY;
      const rect = chatBtn.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      
      chatBtn.style.cursor = 'grabbing';
      
      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging = true;
        }
        
        if (isDragging) {
          chatBtn.style.right = `${startRight - dx}px`;
          chatBtn.style.bottom = `${startBottom - dy}px`;
          chatBtn.style.transition = 'none'; // Smooth dragging
        }
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        chatBtn.style.cursor = 'grab';
        chatBtn.style.transition = 'transform 0.2s, box-shadow 0.2s, right 0.3s, bottom 0.3s';
        
        // Save position if needed, or just let it stay
        if (!isDragging) {
          toggleChat();
        }
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    document.body.appendChild(chatBtn);
  }

  function toggleChat() {
    const existing = document.getElementById('resurface-chat-panel');
    if (existing) {
      existing.remove();
      return;
    }

    // Conversation history for multi-turn context
    const chatHistory = [];

    const panel = document.createElement('div');
    panel.id = 'resurface-chat-panel';
    
    // Get current button position to anchor the panel
    const btnRect = chatBtn.getBoundingClientRect();
    const isTopHalf = btnRect.top < window.innerHeight / 2;
    
    Object.assign(panel.style, {
      position: 'fixed', 
      bottom: isTopHalf ? 'auto' : `${window.innerHeight - btnRect.top + 12}px`,
      top: isTopHalf ? `${btnRect.bottom + 12}px` : 'auto',
      right: `${window.innerWidth - btnRect.right}px`,
      width: '360px', height: '500px',
      background: '#FAF8F5', border: '1px solid #E8E2D6', borderRadius: '20px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)', zIndex: '2147483645',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      animation: 'rsChatSlideIn 0.25s ease-out'
    });

    panel.innerHTML = `
      <style>
        @keyframes rsChatSlideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes rsTypingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        #rs-chat-msgs::-webkit-scrollbar { width: 4px; }
        #rs-chat-msgs::-webkit-scrollbar-thumb { background: #DDD8CE; border-radius: 10px; }
        #rs-chat-msgs::-webkit-scrollbar-track { background: transparent; }
        #rs-chat-input:focus { border-color: #C49A6C !important; box-shadow: 0 0 0 3px rgba(196, 154, 108, 0.08) !important; }
        .rs-chat-link { color: #9E7A54; text-decoration: none; font-weight: 600; cursor: pointer; border-bottom: 1px dashed #C9B99A; }
        .rs-chat-link:hover { color: #7D6245; background: #F3EFE8; }
        .rs-typing-dot { width: 6px; height: 6px; background: #C49A6C; border-radius: 50%; display: inline-block; margin: 0 2px; }
        .rs-typing-dot:nth-child(1) { animation: rsTypingBounce 1.2s ease-in-out infinite 0s; }
        .rs-typing-dot:nth-child(2) { animation: rsTypingBounce 1.2s ease-in-out infinite 0.2s; }
        .rs-typing-dot:nth-child(3) { animation: rsTypingBounce 1.2s ease-in-out infinite 0.4s; }
        .rs-provider-badge { display: inline-block; font-size: 9px; padding: 2px 6px; background: #F3EFE8; border: 1px solid #E8E2D6; border-radius: 8px; color: #A8A29E; margin-top: 4px; font-weight: 500; }
      </style>
      <div style="padding: 14px 16px; border-bottom: 1px solid #E8E2D6; background: #FDFCFA; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 18px; height: 18px; object-fit: contain;" alt="" />
          <span style="font-weight: 700; font-size: 14px; color: #3D3832;">Resurface Assistant</span>
        </div>
        <button id="rs-chat-close" style="background:none; border:none; cursor:pointer; color: #A8A29E; font-size: 18px; padding: 2px 6px; border-radius: 6px; transition: all 0.15s;">✕</button>
      </div>
      <div id="rs-chat-msgs" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="background: #FDFCFA; border: 1px solid #E8E2D6; padding: 12px 16px; border-radius: 16px; font-size: 13px; line-height: 1.6; color: #3D3832; align-self: flex-start; max-width: 88%;">
          👋 Hi! Ask me anything about your saved resources.<br>
          <span style="color: #A8A29E; font-size: 11px;">Try: "What did I save about React?" or "Show my recent saves"</span>
        </div>
      </div>
      <div style="padding: 12px 16px; border-top: 1px solid #E8E2D6; background: #FDFCFA; display: flex; gap: 8px; align-items: center;">
        <input id="rs-chat-input" type="text" placeholder="Ask about your library..." autocomplete="off" style="flex:1; padding: 10px 16px; border: 1.5px solid #DDD8CE; border-radius: 20px; outline: none; font-size: 13px; color: #3D3832; transition: border-color 0.2s, box-shadow 0.2s; background: #FAF8F5;">
        <button id="rs-chat-send" style="width: 36px; height: 36px; background: #C49A6C; color: #FFF; border: none; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; flex-shrink: 0;">→</button>
      </div>
    `;

    document.body.appendChild(panel);
    
    // Close button
    panel.querySelector('#rs-chat-close').onclick = () => panel.remove();
    panel.querySelector('#rs-chat-close').onmouseenter = function() { this.style.background = '#F3EFE8'; this.style.color = '#3D3832'; };
    panel.querySelector('#rs-chat-close').onmouseleave = function() { this.style.background = 'none'; this.style.color = '#A8A29E'; };
    
    // Send button hover
    const sendBtn = panel.querySelector('#rs-chat-send');
    sendBtn.onmouseenter = function() { this.style.background = '#B08A5E'; this.style.transform = 'scale(1.03)'; };
    sendBtn.onmouseleave = function() { this.style.background = '#C49A6C'; this.style.transform = 'scale(1)'; };
    
    const input = panel.querySelector('#rs-chat-input');
    input.focus();
    
    let isProcessing = false;
    
    async function handleSend() {
      const text = input.value.trim();
      if (!text || isProcessing) return;
      
      isProcessing = true;
      input.value = '';
      sendBtn.style.opacity = '0.5';
      sendBtn.style.pointerEvents = 'none';
      
      // Add user message
      addMsg('user', text);
      chatHistory.push({ role: 'user', content: text });
      
      // Show typing indicator
      const typingId = showTyping();
      
      try {
        // Send to background script for AI-powered response
        const response = await chrome.runtime.sendMessage({
          action: 'CHAT_QUERY',
          data: { query: text, history: chatHistory }
        });
        
        // Remove typing indicator
        removeEl(typingId);
        
        if (response.error) {
          addMsg('bot', `⚠️ ${response.error}`);
        } else {
          // Add bot response
          const msgId = addMsg('bot', response.text);
          
          // Add clickable resource links if available
          if (response.matches && response.matches.length > 0) {
            addResourceLinks(response.matches);
          }
          
          // Show provider badge
          if (response.provider && response.elapsed) {
            addProviderBadge(response.provider, response.elapsed);
          }
          
          chatHistory.push({ role: 'assistant', content: response.text });
        }
      } catch (err) {
        removeEl(typingId);
        addMsg('bot', "❌ Something went wrong. Please try again.");
        console.error('[Resurface Chat]', err);
      }
      
      isProcessing = false;
      sendBtn.style.opacity = '1';
      sendBtn.style.pointerEvents = 'auto';
      input.focus();
    }
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') handleSend();
    };
    sendBtn.onclick = handleSend;
    
    function showTyping() {
      const container = panel.querySelector('#rs-chat-msgs');
      if (!container) return;
      const id = 'typing-' + Date.now();
      const el = document.createElement('div');
      el.id = id;
      Object.assign(el.style, {
        padding: '12px 16px', borderRadius: '16px', background: '#FDFCFA',
        border: '1px solid #E8E2D6', alignSelf: 'flex-start', display: 'flex',
        alignItems: 'center', gap: '2px', maxWidth: '80px'
      });
      el.innerHTML = '<span class="rs-typing-dot"></span><span class="rs-typing-dot"></span><span class="rs-typing-dot"></span>';
      container.appendChild(el);
      container.scrollTop = container.scrollHeight;
      return id;
    }
    
    function removeEl(id) {
      if (id) {
        const el = document.getElementById(id);
        if (el) el.remove();
      }
    }
    
    function addResourceLinks(matches) {
      const container = panel.querySelector('#rs-chat-msgs');
      if (!container) return;
      const linksEl = document.createElement('div');
      Object.assign(linksEl.style, {
        alignSelf: 'flex-start', maxWidth: '88%', display: 'flex',
        flexDirection: 'column', gap: '4px', marginTop: '-4px'
      });
      matches.forEach(m => {
        if (m.url) {
          const link = document.createElement('a');
          link.href = m.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.className = 'rs-chat-link';
          link.style.cssText = 'font-size: 11px; padding: 4px 8px; display: inline-block; background: #F3EFE8; border-radius: 8px; border: 1px solid #E8E2D6; text-decoration: none; color: #9E7A54; transition: all 0.15s;';
          link.textContent = `🔗 ${(m.title || 'Open').substring(0, 40)}${(m.title || '').length > 40 ? '...' : ''}`;
          link.onmouseenter = function() { this.style.background = '#EDE8E0'; this.style.borderColor = '#C9B99A'; };
          link.onmouseleave = function() { this.style.background = '#F3EFE8'; this.style.borderColor = '#E8E2D6'; };
          linksEl.appendChild(link);
        }
      });
      container.appendChild(linksEl);
      container.scrollTop = container.scrollHeight;
    }
    
    function addProviderBadge(provider, elapsed) {
      const container = panel.querySelector('#rs-chat-msgs');
      if (!container) return;
      const badge = document.createElement('div');
      badge.className = 'rs-provider-badge';
      badge.style.alignSelf = 'flex-start';
      const providerName = provider === 'groq' ? '⚡ Groq' : provider === 'gemini' ? '✨ Gemini' : '📁 Local';
      badge.textContent = `${providerName} · ${elapsed < 1000 ? elapsed + 'ms' : (elapsed / 1000).toFixed(1) + 's'}`;
      container.appendChild(badge);
      container.scrollTop = container.scrollHeight;
    }
  }

  function addMsg(type, text) {
    const container = document.getElementById('rs-chat-msgs');
    if (!container) return;
    const id = 'msg-' + Date.now();
    const msg = document.createElement('div');
    msg.id = id;
    Object.assign(msg.style, {
      padding: '12px 16px', borderRadius: '16px', fontSize: '13px', lineHeight: '1.6',
      background: type === 'user' ? '#C49A6C' : '#FDFCFA',
      color: type === 'user' ? '#FFFDF7' : '#3D3832',
      border: type === 'bot' ? '1px solid #E8E2D6' : 'none',
      alignSelf: type === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '88%',
      boxShadow: type === 'user' ? '0 1px 4px rgba(120, 100, 70, 0.12)' : '0 1px 2px rgba(0,0,0,0.02)',
      wordBreak: 'break-word'
    });
    // Format text: bold, newlines, italics
    msg.innerHTML = text
      .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
      .replace(/_(.*?)_/g, '<em style="color:#A8A29E;font-style:italic;">$1</em>')
      .replace(/\n/g, '<br>');
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return id;
  }

  // ============================================
  // START
  // ============================================
  initSidebar();
  initChat();

  // HEARTBEAT: Ask background if we should show a sidebar
  chrome.runtime.sendMessage({ action: 'CHECK_FOR_SIDEBAR' });
})();
