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
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap');
        
        #resurface-sidebar {
          position: fixed; top: 50%; right: 24px; width: 340px; 
          max-height: 70vh; background: #FFFDF7; 
          border: 1px solid #E8E2D6; border-radius: 24px;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.12); z-index: 2147483646;
          transform: translateY(-50%) translateX(120%); 
          transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
          font-family: 'Outfit', system-ui, -apple-system, sans-serif; 
          display: flex; flex-direction: column; overflow: hidden;
          opacity: 0;
        }
        #resurface-sidebar.visible { transform: translateY(-50%) translateX(0); opacity: 1; }
        .rs-header { padding: 18px 22px; border-bottom: 1px solid #F0EBD8; display: flex; justify-content: space-between; align-items: center; background: #FFF; }
        .rs-project-name { font-weight: 700; color: #1A1A1A; display: flex; align-items: center; gap: 10px; font-size: 14.5px; }
        .rs-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 2px rgba(0,0,0,0.03); }
        .rs-close { background: none; border: none; font-size: 18px; color: #A8A29E; cursor: pointer; padding: 4px; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .rs-close:hover { background: #F3EFE8; color: #3D3832; }
        .rs-body { flex: 1; overflow-y: auto; padding: 20px; scrollbar-width: none; }
        .rs-body::-webkit-scrollbar { display: none; }
        .rs-item { padding: 14px; background: #FFF; border: 1px solid #F0EBD8; border-radius: 16px; margin-bottom: 12px; cursor: pointer; transition: all 0.2s; }
        .rs-item:hover { border-color: #F5A623; background: #FFFDF7; transform: scale(1.02); box-shadow: 0 4px 12px rgba(120, 100, 70, 0.08); }
        .rs-title { font-weight: 700; font-size: 13px; margin-bottom: 5px; color: #1A1A1A; line-height: 1.4; }
        .rs-summary { font-size: 11.5px; color: #6B6B6B; line-height: 1.6; }
        .rs-footer { padding: 16px 20px; border-top: 1px solid #F0EBD8; background: #FDFCFA; }
        .rs-btn { width: 100%; padding: 12px; background: #C49A6C; color: #FFF; border: none; border-radius: 14px; cursor: pointer; font-weight: 700; transition: all 0.2s; font-size: 13px; box-shadow: 0 4px 12px rgba(196, 154, 108, 0.2); }
        .rs-btn:hover { background: #B08A5E; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(196, 154, 108, 0.25); }
      </style>
      <div class="rs-header">
        <div class="rs-project-name">
          <div class="rs-dot" style="background: ${projectColor};"></div>
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

    function updateSidebarToDetails(resource) {
      const body = sidebarElement.querySelector('.rs-body');
      const footer = sidebarElement.querySelector('.rs-footer');
      
      // Save original list for "Back" button
      const originalBodyHTML = body.innerHTML;
      const originalFooterHTML = footer.innerHTML;

      body.innerHTML = `
        <div style="animation: rsFadeIn 0.3s ease;">
          <button id="rs-back-btn" style="background:none; border:none; color:#C49A6C; font-weight:700; font-size:12px; cursor:pointer; margin-bottom:15px; padding:0; display:flex; align-items:center; gap:5px;">
            ← Back to list
          </button>
          <div style="font-weight:800; font-size:16px; color:#1A1A1A; margin-bottom:12px; line-height:1.4;">
            ${escapeHTML(resource.title || 'Untitled')}
          </div>
          <div style="font-size:13px; color:#4A4A4A; line-height:1.7; white-space:pre-wrap;">
            ${escapeHTML(resource.summary || resource.textContent || 'No detailed summary available.')}
          </div>
        </div>
        <style>
          @keyframes rsFadeIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
        </style>
      `;

      footer.innerHTML = `
        <div style="display:flex; gap:10px;">
          <button id="rs-open-link-btn" class="rs-btn" style="flex:2;">🌐 Open Original Link</button>
        </div>
      `;

      document.getElementById('rs-back-btn').onclick = () => {
        body.innerHTML = originalBodyHTML;
        footer.innerHTML = originalFooterHTML;
        attachItemClickHandlers();
        // Restore dash button handler
        document.getElementById('rs-dash-btn').onclick = () => {
          window.open(chrome.runtime.getURL('src/popup/dashboard.html'), '_blank');
        };
      };

      document.getElementById('rs-open-link-btn').onclick = () => {
        window.open(resource.url, '_blank');
      };
    }

    function attachItemClickHandlers() {
      sidebarElement.querySelectorAll('.rs-item').forEach((item, index) => {
        item.onclick = () => {
          const resource = data.resources[index];
          if (resource) updateSidebarToDetails(resource);
        };
      });
    }

    attachItemClickHandlers();

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
    const { resource, suggestedProject, classification } = data;
    
    // Remove existing
    const existing = document.getElementById('rs-project-popup');
    if (existing) existing.remove();

    const isMatch = classification?.decision === 'MATCH' || (classification?.projectId && classification?.confidence > 50);
    const projectName = isMatch 
      ? (classification.alternatives?.find(a => a.projectId === classification.projectId)?.projectName || 'Matched Project')
      : (suggestedProject?.name || 'New Project');
    const keywords = (suggestedProject?.keywords || []).join(', ');
    const resourceTitle = (resource?.title || 'Untitled').substring(0, 50);

    const popup = document.createElement('div');
    popup.id = 'rs-project-popup';
    popup.innerHTML = `
      <div style="position:fixed;top:24px;right:24px;z-index:2147483645;font-family: 'Inter', -apple-system, sans-serif;pointer-events:none;">
        <div style="background:white;border-radius:24px;width:340px;box-shadow:0 24px 64px rgba(61, 56, 50, 0.18);border:1px solid #E8E2D6;overflow:hidden;animation:rsPopupSlideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);pointer-events:auto;">
          
          <div style="padding:20px 24px;border-bottom:1px solid #E8E2D6;background:#FFFFFF;">
            <div style="font-size:15px;font-weight:800;color:#3D3832;display:flex;align-items:center;gap:10px;">
              <div style="width:24px;height:24px;background:#C49A6C;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 8px rgba(196, 154, 108, 0.3);">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><path d="M5 12h14m-7-7v14"/></svg>
              </div>
              ${isMatch ? 'Confirm Assignment' : 'Create New Project'}
            </div>
            <div style="font-size:11px;color:#A8A29E;margin-top:4px;font-weight:500;">
              ${isMatch ? 'AI found a likely project match' : 'No matching project found for this site'}
            </div>
          </div>
          
          <div style="padding:20px 24px;background:#FAF8F5;">
            <div style="margin-bottom:16px;">
              <label style="font-size:10px;font-weight:800;color:#3D3832;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.8px;">Resource Title</label>
              <input id="rs-res-title" type="text" value="${escapeHTML(resource?.title || 'Untitled')}" style="width:100%;padding:10px 14px;border:1px solid #E8E2D6;border-radius:12px;font-size:13px;box-sizing:border-box;outline:none;transition:all 0.2s;background:white;color:#3D3832;font-weight:600;" onfocus="this.style.borderColor='#C49A6C';this.style.boxShadow='0 0 0 3px rgba(196,154,108,0.1)'" onblur="this.style.borderColor='#E8E2D6';this.style.boxShadow='none'">
            </div>
            
            <div style="margin-bottom:16px;">
              <label style="font-size:10px;font-weight:800;color:#3D3832;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.8px;">Project Name</label>
              <input id="rs-proj-name" type="text" value="${escapeHTML(projectName)}" style="width:100%;padding:10px 14px;border:1px solid #E8E2D6;border-radius:12px;font-size:13px;box-sizing:border-box;outline:none;transition:all 0.2s;background:white;color:#3D3832;font-weight:600;" onfocus="this.style.borderColor='#C49A6C';this.style.boxShadow='0 0 0 3px rgba(196,154,108,0.1)'" onblur="this.style.borderColor='#E8E2D6';this.style.boxShadow='none'">
            </div>
            
            <div style="margin-bottom:16px;">
              <label style="font-size:10px;font-weight:800;color:#3D3832;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.8px;">Keywords</label>
              <input id="rs-proj-keywords" type="text" value="${escapeHTML(keywords)}" style="width:100%;padding:10px 14px;border:1px solid #E8E2D6;border-radius:12px;font-size:13px;box-sizing:border-box;outline:none;transition:all 0.2s;background:white;color:#3D3832;font-weight:600;" placeholder="e.g. news, tech" onfocus="this.style.borderColor='#C49A6C';this.style.boxShadow='0 0 0 3px rgba(196,154,108,0.1)'" onblur="this.style.borderColor='#E8E2D6';this.style.boxShadow='none'">
            </div>
            
            <div style="font-size:10px;color:#B5895B;padding:10px 12px;background:#FFFDF7;border-radius:10px;border:1px solid #FFEBA0;font-weight:500;line-height:1.4;">
              💡 <strong>Resurface AI:</strong> ${isMatch ? 'This resource matches your existing project perfectly.' : 'Future saves from this domain will automatically group here.'}
            </div>
          </div>
          
          <div style="padding:16px 24px 24px;background:white;border-top:1px solid #E8E2D6;display:flex;gap:10px;">
            <button id="rs-create-btn" style="flex:2;padding:12px;background:#C49A6C;color:white;border:none;border-radius:14px;font-weight:800;cursor:pointer;font-size:13px;transition:all 0.2s;box-shadow:0 4px 12px rgba(196, 154, 108, 0.3);" onmouseover="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 16px rgba(196, 154, 108, 0.4)'" onmouseout="this.style.transform='none';this.style.boxShadow='0 4px 12px rgba(196, 154, 108, 0.3)'">
              ${isMatch ? '✓ Confirm & Save' : 'Confirm & Save'}
            </button>
            <button id="rs-skip-btn" style="flex:1;padding:12px;background:white;border:1px solid #E8E2D6;border-radius:14px;cursor:pointer;font-size:13px;color:#A8A29E;font-weight:700;transition:all 0.2s;">Skip</button>
          </div>
        </div>
      </div>
      <style>
        @keyframes rsPopupSlideIn {
          from { opacity:0; transform: translateX(40px); }
          to { opacity:1; transform: translateX(0); }
        }
      </style>
    `;

    document.body.appendChild(popup);

    popup.querySelector('#rs-create-btn').onclick = async () => {
      const name = popup.querySelector('#rs-proj-name').value.trim();
      const keywords = popup.querySelector('#rs-proj-keywords').value.split(',').map(k => k.trim()).filter(k => k);
      const resTitle = popup.querySelector('#rs-res-title').value.trim();

      if (!name) {
        alert('Please enter a project name');
        return;
      }

      if (isMatch && classification?.projectId) {
        chrome.runtime.sendMessage({
          action: 'ASSIGN_TO_PROJECT',
          data: {
            resourceId: resource.id,
            resourceTitle: resTitle,
            projectId: classification.projectId
          }
        }, (response) => {
          popup.remove();
          if (response?.success) {
            showToast('✅ Resource assigned!');
          }
        });
      } else {
        chrome.runtime.sendMessage({
          action: 'CREATE_PROJECT_AND_ASSIGN',
          data: {
            resourceId: resource.id,
            resourceTitle: resTitle,
            projectName: name,
            keywords: keywords,
            relatedUrls: suggestedProject?.relatedUrls || [],
            tags: classification?.suggestedTags || []
          }
        }, (response) => {
          popup.remove();
          if (response?.success) {
            showToast('✅ Project created & saved!');
          }
        });
      }
    };

    popup.querySelector('#rs-skip-btn').onclick = () => {
      chrome.runtime.sendMessage({
        action: 'DISMISS_CLASSIFICATION',
        data: { resourceId: resource.id }
      }, () => {
        popup.remove();
        showToast('Saved to library');
      });
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
