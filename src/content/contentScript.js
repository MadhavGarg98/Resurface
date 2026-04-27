(function() {
  // ============================================
  // GLOBAL SAFETY CHECKS
  // ============================================
  if (window.self !== window.top) return;
  if (window.__resurfaceInjected) return;
  window.__resurfaceInjected = true;
  
  console.log('✅ Resurface: Content script active');

  // ============================================
  // MESSAGE LISTENER (HUB)
  // ============================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, data } = message;
    console.log('📨 CS Message:', action);

    if (action === 'SHOW_SIDEBAR') {
      showSidebar(data);
      sendResponse({ success: true });
      return true;
    }

    if (action === 'HIDE_SIDEBAR') {
      hideSidebar();
      sendResponse({ success: true });
      return true;
    }

    if (action === 'SHOW_PROJECT_POPUP') {
      showProjectCreationPopup(data);
      sendResponse({ success: true });
      return true;
    }

    return false;
  });

  // ============================================
  // SIDEBAR LOGIC (PREMIUM DESIGN)
  // ============================================
  let sidebarElement = null;

  function showSidebar(data) {
    if (sidebarElement) sidebarElement.remove();
    
    sidebarElement = document.createElement('div');
    sidebarElement.id = 'resurface-sidebar';
    const projectColor = data.project?.color || '#F5A623';
    
    sidebarElement.innerHTML = `
      <style>
        #resurface-sidebar {
          position: fixed; top: 0; right: 0; width: 360px; height: 100vh;
          background: #FFFDF7; border-left: 1px solid #F0EBD8;
          box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08); z-index: 2147483646;
          transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column;
        }
        #resurface-sidebar.visible { transform: translateX(0); }
        .rs-header { padding: 20px; border-bottom: 1px solid #F0EBD8; display: flex; justify-content: space-between; align-items: center; background: #FFF; }
        .rs-project-name { font-weight: 700; color: #1A1A1A; display: flex; align-items: center; gap: 8px; font-size: 15px; }
        .rs-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .rs-close { background: none; border: none; font-size: 18px; color: #9B9B9B; cursor: pointer; padding: 4px 8px; border-radius: 6px; }
        .rs-close:hover { background: #FFF8E7; color: #1A1A1A; }
        .rs-body { flex: 1; overflow-y: auto; padding: 20px; }
        .rs-item { padding: 14px; background: #FFF; border: 1px solid #F0EBD8; border-radius: 12px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
        .rs-item:hover { border-color: #F5A623; background: #FFFDF7; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .rs-title { font-weight: 600; font-size: 13.5px; margin-bottom: 4px; color: #1A1A1A; }
        .rs-summary { font-size: 12px; color: #6B6B6B; line-height: 1.5; }
        .rs-footer { padding: 16px; border-top: 1px solid #F0EBD8; background: #FFF; }
        .rs-btn { width: 100%; padding: 12px; background: #F5A623; color: #FFF; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: background 0.2s; font-size: 14px; }
        .rs-btn:hover { background: #E09510; }
      </style>
      <div class="rs-header">
        <div class="rs-project-name">
          <span class="rs-dot" style="background: ${projectColor};"></span>
          ${escapeHTML(data.project?.name || 'Saved Resources')}
        </div>
        <button class="rs-close" id="rs-close-sidebar">✕</button>
      </div>
      <div class="rs-body">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 15px; color: #9B9B9B; text-transform: uppercase; letter-spacing: 0.5px;">💡 Related Resources</div>
        ${data.resources && data.resources.length > 0 ? data.resources.map(r => `
          <div class="rs-item" data-url="${r.url}">
            <div class="rs-title">${escapeHTML(r.title || 'Untitled')}</div>
            <div class="rs-summary">${escapeHTML((r.summary || r.textContent || '').substring(0, 100))}...</div>
          </div>
        `).join('') : `
          <div style="padding: 40px 20px; text-align: center; color: #9B9B9B; font-size: 13px;">
            <div style="font-size: 24px; margin-bottom: 12px;">📚</div>
            No resources saved for this project yet.
          </div>
        `}
      </div>
      <div class="rs-footer">
        <button class="rs-btn" id="rs-dash-btn">📊 Open Dashboard</button>
      </div>
    `;

    document.body.appendChild(sidebarElement);
    
    // Animate in
    requestAnimationFrame(() => {
      sidebarElement.classList.add('visible');
    });

    // Event Handlers
    document.getElementById('rs-close-sidebar').onclick = hideSidebar;

    document.getElementById('rs-dash-btn').onclick = () => {
      window.open(chrome.runtime.getURL('src/popup/dashboard.html'), '_blank');
    };

    sidebarElement.querySelectorAll('.rs-item').forEach(item => {
      item.onclick = () => {
        const url = item.getAttribute('data-url');
        if (url) window.open(url, '_blank');
      };
    });

    // Auto-close on Escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        hideSidebar();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
    
    // Auto-close after 30s
    setTimeout(hideSidebar, 30000);
  }

  function hideSidebar() {
    if (sidebarElement) {
      sidebarElement.classList.remove('visible');
      setTimeout(() => {
        if (sidebarElement) sidebarElement.remove();
        sidebarElement = null;
      }, 300);
    }
  }

  // ============================================
  // PROJECT CREATION POPUP (SMART MODAL)
  // ============================================
  function showProjectCreationPopup(data) {
    const { resource, suggestedProject } = data;
    
    // Remove existing
    const existing = document.getElementById('rs-project-popup');
    if (existing) existing.remove();

    const projectName = suggestedProject?.name || 'New Project';
    const keywords = (suggestedProject?.keywords || []).join(', ');
    const resourceTitle = (resource?.title || 'Untitled').substring(0, 50);

    const popup = document.createElement('div');
    popup.id = 'rs-project-popup';
    popup.innerHTML = `
      <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.4);z-index:2147483645;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);font-family:system-ui,sans-serif;">
        <div style="background:white;border-radius:20px;width:420px;max-width:90vw;box-shadow:0 24px 80px rgba(0,0,0,0.3);overflow:hidden;animation:rsPopupIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
          
          <div style="padding:24px 28px;border-bottom:1px solid #f0f0f0;background:#FFFDF7;">
            <div style="font-size:18px;font-weight:800;color:#1a1a1a;display:flex;align-items:center;gap:10px;">📁 Create New Project</div>
            <div style="font-size:12px;color:#999;margin-top:4px;">No matching project found for this save</div>
          </div>
          
          <div style="padding:24px 28px;">
            <div style="font-size:12px;color:#666;margin-bottom:16px;padding:12px;background:#f9f9f9;border-radius:12px;border:1px solid #eee;">
              <span style="color:#999;font-weight:600;">RESOURCE:</span> <strong>${escapeHTML(resourceTitle)}</strong>
            </div>
            
            <div style="margin-bottom:16px;">
              <label style="font-size:12px;font-weight:700;color:#333;display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Project Name</label>
              <input id="rs-proj-name" type="text" value="${escapeHTML(projectName)}" style="width:100%;padding:12px 16px;border:1.5px solid #eee;border-radius:12px;font-size:14px;box-sizing:border-box;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#F5A623'" onblur="this.style.borderColor='#eee'">
            </div>
            
            <div style="margin-bottom:16px;">
              <label style="font-size:12px;font-weight:700;color:#333;display:block;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">Keywords</label>
              <input id="rs-proj-keywords" type="text" value="${escapeHTML(keywords)}" style="width:100%;padding:12px 16px;border:1.5px solid #eee;border-radius:12px;font-size:14px;box-sizing:border-box;outline:none;transition:border-color 0.2s;" placeholder="keyword1, keyword2" onfocus="this.style.borderColor='#F5A623'" onblur="this.style.borderColor='#eee'">
            </div>
            
            <div style="font-size:11px;color:#856404;margin-bottom:0;padding:10px 14px;background:#FFF8E7;border-radius:10px;border:1px solid #FFEBA0;">
              💡 <strong>Smart Link:</strong> Future saves from this site will automatically go here.
            </div>
          </div>
          
          <div style="padding:20px 28px;border-top:1px solid #f0f0f0;display:flex;gap:12px;background:#fafafa;">
            <button id="rs-create-btn" style="flex:2;padding:14px;background:#F5A623;color:white;border:none;border-radius:12px;font-weight:700;cursor:pointer;font-size:15px;transition:transform 0.2s, background 0.2s;" onmouseover="this.style.background='#E09510'" onmouseout="this.style.background='#F5A623'" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">✓ Create & Save</button>
            <button id="rs-skip-btn" style="flex:1;padding:14px;background:white;border:1.5px solid #ddd;border-radius:12px;cursor:pointer;font-size:14px;color:#666;font-weight:600;">Skip</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes rsPopupIn {
          from { opacity:0; transform:scale(0.9) translateY(20px); }
          to { opacity:1; transform:scale(1) translateY(0); }
        }
      </style>
    `;

    document.body.appendChild(popup);

    popup.querySelector('#rs-create-btn').onclick = async () => {
      const name = popup.querySelector('#rs-proj-name').value.trim();
      const keywords = popup.querySelector('#rs-proj-keywords').value.split(',').map(k => k.trim()).filter(k => k);

      if (!name) {
        alert('Please enter a project name');
        return;
      }

      chrome.runtime.sendMessage({
        action: 'CREATE_PROJECT_AND_ASSIGN',
        data: {
          resourceId: resource.id,
          projectName: name,
          keywords: keywords,
          relatedUrls: suggestedProject?.relatedUrls || []
        }
      }, (response) => {
        popup.remove();
        if (response?.success) {
          showToast('✅ Project created & saved!');
        }
      });
    };

    popup.querySelector('#rs-skip-btn').onclick = () => {
      popup.remove();
      showToast('Saved without project');
    };

    // Close on backdrop click
    popup.onclick = (e) => {
      if (e.target === popup) popup.remove();
    };
  }

  // ============================================
  // DRAGGABLE CHAT BOT (RESTORED)
  // ============================================
  let chatBtn = null;
  let isDragging = false;
  let startX, startY, startRight, startBottom;

  async function initChat() {
    // Check if chat is enabled
    const res = await chrome.storage.local.get(['settings']);
    if (res.settings?.showFloatingChat === false) return;

    chatBtn = document.createElement('div');
    chatBtn.id = 'resurface-chat-btn';
    
    Object.assign(chatBtn.style, {
      position: 'fixed', bottom: '24px', right: '24px', width: '56px', height: '56px',
      background: 'linear-gradient(135deg, #F5F1EB 0%, #E8D5BE 100%)',
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'grab', boxShadow: '0 8px 24px rgba(120, 100, 70, 0.15)', zIndex: '2147483645',
      transition: 'transform 0.2s, box-shadow 0.2s', userSelect: 'none',
      border: '2px solid #C9B99A'
    });
    
    chatBtn.innerHTML = `
      <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 28px; height: 28px; object-fit: contain;" alt="" />
    `;
    
    // Dragging & Click
    chatBtn.onmousedown = (e) => {
      isDragging = false;
      startX = e.clientX; startY = e.clientY;
      const rect = chatBtn.getBoundingClientRect();
      startRight = window.innerWidth - rect.right;
      startBottom = window.innerHeight - rect.bottom;
      chatBtn.style.cursor = 'grabbing';
      
      const onMouseMove = (me) => {
        const dx = me.clientX - startX; const dy = me.clientY - startY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging = true;
        if (isDragging) {
          chatBtn.style.right = `${startRight - dx}px`;
          chatBtn.style.bottom = `${startBottom - dy}px`;
          chatBtn.style.transition = 'none';
        }
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        chatBtn.style.cursor = 'grab';
        chatBtn.style.transition = 'transform 0.2s, box-shadow 0.2s, right 0.3s, bottom 0.3s';
        if (!isDragging) toggleChat();
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    document.body.appendChild(chatBtn);
  }

  function toggleChat() {
    const existing = document.getElementById('resurface-chat-panel');
    if (existing) { existing.remove(); return; }

    const chatHistory = [];
    const panel = document.createElement('div');
    panel.id = 'resurface-chat-panel';
    const btnRect = chatBtn.getBoundingClientRect();
    const isTopHalf = btnRect.top < window.innerHeight / 2;
    
    Object.assign(panel.style, {
      position: 'fixed', 
      bottom: isTopHalf ? 'auto' : `${window.innerHeight - btnRect.top + 12}px`,
      top: isTopHalf ? `${btnRect.bottom + 12}px` : 'auto',
      right: `${window.innerWidth - btnRect.right}px`,
      width: '380px', height: '520px',
      background: '#FAF8F5', border: '1px solid #E8E2D6', borderRadius: '24px',
      boxShadow: '0 12px 48px rgba(0,0,0,0.15)', zIndex: '2147483645',
      display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'system-ui, sans-serif',
      animation: 'rsChatSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
    });

    panel.innerHTML = `
      <style>
        @keyframes rsChatSlideIn { from { opacity: 0; transform: translateY(10px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        #rs-chat-msgs::-webkit-scrollbar { width: 4px; }
        #rs-chat-msgs::-webkit-scrollbar-thumb { background: #DDD8CE; border-radius: 10px; }
      </style>
      <div style="padding: 16px 20px; border-bottom: 1px solid #E8E2D6; background: #FFF; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 20px; height: 20px;" alt="" />
          <span style="font-weight: 700; font-size: 15px; color: #3D3832;">Resurface AI</span>
        </div>
        <button id="rs-chat-close" style="background:none; border:none; cursor:pointer; color: #A8A29E; font-size: 20px;">✕</button>
      </div>
      <div id="rs-chat-msgs" style="flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 12px;">
        <div style="background: #FFF; border: 1px solid #E8E2D6; padding: 12px 16px; border-radius: 18px; font-size: 13.5px; line-height: 1.6; color: #3D3832; align-self: flex-start; max-width: 85%;">
          👋 <b>Hi!</b> I can help you find things in your library. Ask me about your saves!
        </div>
      </div>
      <div style="padding: 16px 20px; border-top: 1px solid #E8E2D6; background: #FFF; display: flex; gap: 10px; align-items: center;">
        <input id="rs-chat-input" type="text" placeholder="Ask about your library..." style="flex:1; padding: 12px 18px; border: 1.5px solid #eee; border-radius: 25px; outline: none; font-size: 14px; background: #f9f9f9;">
        <button id="rs-chat-send" style="width: 40px; height: 40px; background: #C49A6C; color: #FFF; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m3 22 1-1 18-9-18-9-1 1 2 8h10"/></svg>
        </button>
      </div>
    `;

    document.body.appendChild(panel);
    const input = panel.querySelector('#rs-chat-input');
    input.focus();

    panel.querySelector('#rs-chat-close').onclick = () => panel.remove();
    
    const sendBtn = panel.querySelector('#rs-chat-send');
    const handleSend = async () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addChatMsg('user', text, chatHistory);
      
      const response = await chrome.runtime.sendMessage({
        action: 'CHAT_QUERY',
        data: { query: text, history: chatHistory }
      });
      
      if (response.error) {
        addChatMsg('bot', `❌ ${response.error}`);
      } else {
        addChatMsg('bot', response.text, chatHistory);
      }
    };

    input.onkeydown = (e) => { if (e.key === 'Enter') handleSend(); };
    sendBtn.onclick = handleSend;
  }

  function addChatMsg(type, text, history) {
    const container = document.getElementById('rs-chat-msgs');
    if (!container) return;
    const msg = document.createElement('div');
    Object.assign(msg.style, {
      padding: '12px 16px', borderRadius: '18px', fontSize: '13.5px', lineHeight: '1.6',
      background: type === 'user' ? '#C49A6C' : '#FFF',
      color: type === 'user' ? '#FFF' : '#3D3832',
      border: type === 'bot' ? '1px solid #E8E2D6' : 'none',
      alignSelf: type === 'user' ? 'flex-end' : 'flex-start',
      maxWidth: '85%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', wordBreak: 'break-word'
    });
    msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    if (history) history.push({ role: type === 'user' ? 'user' : 'assistant', content: text });
  }

  // ============================================
  // HELPERS
  // ============================================
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);padding:14px 24px;background:#1a1a1a;color:white;border-radius:12px;font-size:14px;z-index:2147483647;box-shadow:0 8px 32px rgba(0,0,0,0.2);font-weight:600;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  initChat();
  
  // Heartbeat: Ask background if we should show a sidebar
  // This helps when the background trigger was missed
  chrome.runtime.sendMessage({ action: 'TRIGGER_SIDEBAR' });

  console.log('✅ Resurface: Ready');
})();
