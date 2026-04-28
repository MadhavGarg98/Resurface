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
      showProjectPopup(data);
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
  function showProjectPopup(data) {
    console.log('[Popup] Showing project popup:', data);
    
    // Remove existing
    const existing = document.getElementById('rs-project-popup');
    if (existing) existing.remove();
    
    const { resourceId, resourceTitle, matches, suggestedProject } = data;
    let secondsLeft = data.timeout || 30;
    const titlePreview = (resourceTitle || 'Untitled').substring(0, 55);
    
    // Build match list HTML
    let matchListHTML = '';
    const hasMatches = matches && matches.length > 0;
    
    if (hasMatches) {
      matchListHTML = `
        <div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:600;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
            📊 Suggested Projects
          </div>
          ${matches.slice(0, 3).map((m, i) => `
            <div class="rs-match-option ${i === 0 ? 'rs-selected' : ''}" 
                 data-project-id="${m.projectId}"
                 style="padding:10px 14px;margin-bottom:6px;border:2px solid ${i === 0 ? '#F5A623' : '#eee'};border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;background:${i === 0 ? '#FFF8E7' : 'white'};transition:all 0.15s;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:13px;color:#1a1a1a;">📁 ${escapeHTML(m.projectName)}</div>
                <div style="font-size:11px;color:#999;margin-top:2px;">${escapeHTML(m.matchReason || '')}</div>
              </div>
              <div style="flex-shrink:0;margin-left:12px;text-align:right;">
                <span style="font-weight:700;font-size:16px;color:${m.score >= 50 ? '#4CAF50' : m.score >= 25 ? '#F5A623' : '#999'};">${m.score}%</span>
                ${i === 0 ? '<span style="font-size:10px;color:#4CAF50;display:block;">Best Match</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="text-align:center;margin:16px 0;color:#ccc;font-size:12px;">── OR ──</div>
      `;
    }
    
    // Build create form
    const createHTML = `
      <div style="margin-bottom:4px;">
        <div style="font-size:12px;font-weight:600;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">
          ✨ Create New Project
        </div>
        <div style="margin-bottom:10px;">
          <input id="rs-proj-name" type="text" 
            value="${escapeHTML(suggestedProject?.name || '')}"
            placeholder="Project name"
            style="width:100%;padding:10px 14px;border:2px solid #eee;border-radius:10px;font-size:13px;box-sizing:border-box;outline:none;"
            onfocus="this.style.borderColor='#F5A623'"
            onblur="this.style.borderColor='#eee'">
        </div>
        <div style="margin-bottom:4px;">
          <input id="rs-proj-keywords" type="text"
            value="${escapeHTML((suggestedProject?.keywords || []).join(', '))}"
            placeholder="Keywords (comma separated)"
            style="width:100%;padding:10px 14px;border:2px solid #eee;border-radius:10px;font-size:13px;box-sizing:border-box;outline:none;"
            onfocus="this.style.borderColor='#F5A623'"
            onblur="this.style.borderColor='#eee'">
        </div>
        <div style="padding:8px 12px;background:#FFF8E7;border-radius:8px;font-size:11px;color:#996600;">
          🔗 Future saves from this site will auto-go to this project
        </div>
      </div>
    `;
    
    // Build complete popup
    const popup = document.createElement('div');
    popup.id = 'rs-project-popup';
    popup.innerHTML = `
      <div style="
        position:fixed;top:16px;right:24px;width:380px;max-width:calc(100vw-24px);max-height:80vh;overflow-y:auto;
        background:white;border-radius:16px;box-shadow:0 12px 50px rgba(0,0,0,0.2);z-index:2147483647;
        font-family:system-ui,sans-serif;animation:rsSlideIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275);
      ">
        <!-- Header -->
        <div style="padding:18px 20px 14px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;">
          <div style="flex:1;min-width:0;">
            <div style="font-size:15px;font-weight:700;color:#1a1a1a;">📁 Where should this go?</div>
            <div style="font-size:12px;color:#999;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHTML(titlePreview)}</div>
          </div>
          <div style="flex-shrink:0;margin-left:12px;text-align:center;">
            <div id="rs-timer" style="width:38px;height:38px;border-radius:50%;border:3px solid #F5A623;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#F5A623;">${secondsLeft}</div>
            <div style="font-size:9px;color:#999;margin-top:2px;">auto</div>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding:16px 20px;">
          ${matchListHTML}
          ${createHTML}
        </div>
        
        <!-- Actions -->
        <div style="padding:14px 20px;border-top:1px solid #f0f0f0;display:flex;gap:10px;">
          <button id="rs-confirm-btn" style="
            flex:1;padding:12px;background:#F5A623;color:white;border:none;border-radius:10px;font-weight:600;
            font-size:13px;cursor:pointer;transition:all 0.15s;
          " onmouseover="this.style.background='#E09510'" onmouseout="this.style.background='#F5A623'">
            ✓ Confirm
          </button>
          <button id="rs-skip-btn" style="
            padding:12px 20px;background:transparent;border:2px solid #eee;border-radius:10px;
            font-size:13px;color:#999;cursor:pointer;font-weight:500;transition:all 0.15s;
          " onmouseover="this.style.borderColor='#ddd';this.style.color='#666'" onmouseout="this.style.borderColor='#eee';this.style.color='#999'">
            Skip
          </button>
        </div>
      </div>
      <style>
        @keyframes rsSlideIn {
          from { opacity:0; transform:translateY(-15px) scale(0.95); }
          to { opacity:1; transform:translateY(0) scale(1); }
        }
        .rs-match-option:hover { border-color:#F5A623 !important; }
        .rs-match-option.rs-selected { border-color:#F5A623 !important; background:#FFF8E7 !important; }
      </style>
    `;
    
    document.body.appendChild(popup);
    
    // State
    let selectedProjectId = hasMatches ? matches[0].projectId : null;
    let isCreatingNew = !hasMatches;
    
    // Timer
    const timerEl = popup.querySelector('#rs-timer');
    const timerInterval = setInterval(() => {
      secondsLeft--;
      if (timerEl) {
        timerEl.textContent = secondsLeft;
        if (secondsLeft <= 5) {
          timerEl.style.borderColor = '#E57373';
          timerEl.style.color = '#E57373';
        }
      }
      
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
        popup.remove();
        console.log('[Popup] Timer expired - auto-saving');
        
        if (selectedProjectId) {
          assignToProject(resourceId, selectedProjectId);
          showToast('✅ Auto-assigned to project');
        } else {
          showToast('💾 Saved without project');
        }
      }
    }, 1000);
    
    // Match Option Clicks
    popup.querySelectorAll('.rs-match-option').forEach(option => {
      option.addEventListener('click', () => {
        popup.querySelectorAll('.rs-match-option').forEach(o => {
          o.classList.remove('rs-selected');
          o.style.borderColor = '#eee';
          o.style.background = 'white';
        });
        option.classList.add('rs-selected');
        option.style.borderColor = '#F5A623';
        option.style.background = '#FFF8E7';
        
        selectedProjectId = option.dataset.projectId;
        isCreatingNew = false;
        
        const nameInput = popup.querySelector('#rs-proj-name');
        const keywordsInput = popup.querySelector('#rs-proj-keywords');
        if (nameInput) nameInput.value = '';
        if (keywordsInput) keywordsInput.value = '';
      });
    });
    
    // Create form focus -> switch to create mode
    const nameInput = popup.querySelector('#rs-proj-name');
    const keywordsInput = popup.querySelector('#rs-proj-keywords');
    
    if (nameInput) {
      nameInput.addEventListener('focus', () => {
        isCreatingNew = true;
        selectedProjectId = null;
        popup.querySelectorAll('.rs-match-option').forEach(o => {
          o.classList.remove('rs-selected');
          o.style.borderColor = '#eee';
          o.style.background = 'white';
        });
      });
    }
    
    // Confirm Button
    popup.querySelector('#rs-confirm-btn').addEventListener('click', () => {
      clearInterval(timerInterval);
      
      if (isCreatingNew || !selectedProjectId) {
        const name = nameInput?.value?.trim();
        if (!name) {
          nameInput?.focus();
          nameInput?.style.setProperty('border-color', '#E57373', 'important');
          return;
        }
        
        const keywords = keywordsInput?.value
          ?.split(',').map(k => k.trim()).filter(k => k) || [];
        
        popup.remove();
        
        chrome.runtime.sendMessage({
          action: 'CREATE_PROJECT_AND_ASSIGN',
          data: {
            resourceId: resourceId,
            name: name,
            keywords: keywords,
            relatedUrls: suggestedProject?.relatedUrls || [],
            color: suggestedProject?.color || '#F5A623'
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Popup] Message error:', chrome.runtime.lastError.message);
            showToast('❌ Error. Try again.');
            return;
          }
          if (response?.success) showToast('✅ Project created & saved!');
          else showToast('❌ Error. Try again.');
        });
      } else {
        popup.remove();
        assignToProject(resourceId, selectedProjectId);
        showToast('✅ Saved to project!');
      }
    });
    
    // Skip Button
    popup.querySelector('#rs-skip-btn').addEventListener('click', () => {
      clearInterval(timerInterval);
      popup.remove();
      showToast('💾 Saved without project');
    });
    
    // Keyboard Shortcuts
    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        clearInterval(timerInterval);
        popup.remove();
        showToast('💾 Saved without project');
        document.removeEventListener('keydown', keyHandler);
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        popup.querySelector('#rs-confirm-btn')?.click();
      }
    };
    document.addEventListener('keydown', keyHandler);
  }

  // ============================================
  // HELPER: Assign resource to project
  // ============================================
  function assignToProject(resourceId, projectId) {
    chrome.runtime.sendMessage({
      action: 'ASSIGN_TO_PROJECT',
      data: { resourceId, projectId }
    });
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
  // Chat bot is handled by chatBot.js (loaded separately via manifest)
  
  // Heartbeat: Ask background if we should show a sidebar
  // This helps when the background trigger was missed
  chrome.runtime.sendMessage({ action: 'TRIGGER_SIDEBAR' });

  console.log('✅ Resurface: Ready');
})();
