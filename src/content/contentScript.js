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
        ${data.resources.map(r => `
          <div class="rs-item" onclick="window.open('${r.url}', '_blank')">
            <div class="rs-title">${r.title || 'Untitled'}</div>
            <div class="rs-summary">${(r.summary || r.textContent || '').substring(0, 100)}...</div>
          </div>
        `).join('')}
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
    
    // Premium Circle Design
    Object.assign(chatBtn.style, {
      position: 'fixed', bottom: '24px', right: '24px', width: '60px', height: '60px',
      background: 'linear-gradient(135deg, #FFF9EB 0%, #FFE0A3 100%)',
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'grab', boxShadow: '0 8px 24px rgba(245, 166, 35, 0.2)', zIndex: '2147483645',
      transition: 'transform 0.2s, box-shadow 0.2s', userSelect: 'none',
      border: '2px solid #F5A623'
    });
    
    // Resurface Bolt Logo
    chatBtn.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#F5A623">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    `;
    
    // Hover Effects
    chatBtn.onmouseenter = () => {
      if (!isDragging) {
        chatBtn.style.transform = 'scale(1.05) translateY(-2px)';
        chatBtn.style.boxShadow = '0 12px 32px rgba(245, 166, 35, 0.4)';
      }
    };
    chatBtn.onmouseleave = () => {
      if (!isDragging) {
        chatBtn.style.transform = 'scale(1)';
        chatBtn.style.boxShadow = '0 8px 24px rgba(245, 166, 35, 0.3)';
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
      width: '340px', height: '480px',
      background: '#FFFDF7', border: '1px solid #F0EBD8', borderRadius: '20px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.15)', zIndex: '2147483645',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'sans-serif'
    });

    panel.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #F0EBD8; background: #FFF; font-weight: 800; display: flex; justify-content: space-between; align-items: center; color: #1A1A1A;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; background: #F5A623; border-radius: 50%;"></div>
          Resurface Assistant
        </div>
        <button onclick="this.closest('#resurface-chat-panel').remove()" style="background:none; border:none; cursor:pointer; color: #9B9B9B; font-size: 18px;">✕</button>
      </div>
      <div id="rs-chat-msgs" style="flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;">
        <div style="background: #FFF; border: 1px solid #F0EBD8; padding: 12px 16px; border-radius: 16px; font-size: 13px; line-height: 1.5; color: #1A1A1A; align-self: flex-start; max-width: 85%;">
          👋 Hi there! I can search your saved resources and answer questions about them.
        </div>
      </div>
      <div style="padding: 16px; border-top: 1px solid #F0EBD8; background: #FFF; display: flex; gap: 10px;">
        <input id="rs-chat-input" type="text" placeholder="Ask about your library..." style="flex:1; padding: 10px 16px; border: 1px solid #E5DFC8; border-radius: 20px; outline: none; font-size: 13px; transition: border-color 0.2s;">
      </div>
      <style>
        #rs-chat-input:focus { border-color: #F5A623; }
        #rs-chat-msgs::-webkit-scrollbar { width: 4px; }
        #rs-chat-msgs::-webkit-scrollbar-thumb { background: #F0EBD8; border-radius: 10px; }
      </style>
    `;

    document.body.appendChild(panel);
    
    const input = panel.querySelector('#rs-chat-input');
    input.focus();
    input.onkeydown = async (e) => {
      if (e.key === 'Enter') {
        const text = input.value.trim();
        if (text) {
          addMsg('user', text);
          input.value = '';
          const loadingId = addMsg('bot', 'Analyzing your library...');
          
          try {
            const data = await chrome.storage.local.get(['resources']);
            const resources = data.resources || [];
            const results = resources.filter(r => 
              (r.title || '').toLowerCase().includes(text.toLowerCase()) || 
              (r.summary || '').toLowerCase().includes(text.toLowerCase())
            ).slice(0, 3);
            
            document.getElementById(loadingId).remove();
            
            if (results.length > 0) {
              let resText = `I found ${results.length} relevant items:\n\n`;
              results.forEach((r, i) => {
                resText += `**${i+1}. ${r.title}**\n${(r.summary || '').substring(0, 60)}...\n\n`;
              });
              addMsg('bot', resText);
            } else {
              addMsg('bot', "I couldn't find any specific matches. Try a broader keyword!");
            }
          } catch (err) {
            addMsg('bot', "Sorry, I had trouble searching your library.");
          }
        }
      }
    };
  }

  function addMsg(type, text) {
    const container = document.getElementById('rs-chat-msgs');
    if (!container) return;
    const id = 'msg-' + Date.now();
    const msg = document.createElement('div');
    msg.id = id;
    Object.assign(msg.style, {
      padding: '12px 16px', borderRadius: '16px', fontSize: '13px', lineHeight: '1.5',
      background: type === 'user' ? '#F5A623' : '#FFF',
      color: type === 'user' ? '#FFF' : '#1A1A1A',
      border: type === 'bot' ? '1px solid #F0EBD8' : 'none',
      alignSelf: type === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '85%', boxShadow: type === 'bot' ? '0 2px 4px rgba(0,0,0,0.02)' : 'none'
    });
    msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    return id;
  }

  // ============================================
  // START
  // ============================================
  initSidebar();
  initChat();
})();
