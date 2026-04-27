// ============================================
// RESURFACE CONTENT SCRIPT v3.3 (ULTIMATE)
// ============================================

(function() {
  if (window.self !== window.top) return;
  if (window.__rs_injected_v3) return;
  window.__rs_injected_v3 = true;

  console.log('💎 [Resurface v3.3] Ultimate Sidebar ACTIVE');

  let sidebar = null;

  // Listen for messages
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'SHOW_SIDEBAR') {
      showSidebar(msg.data);
      sendResponse({ ok: true });
    } else if (msg.action === 'HIDE_SIDEBAR') {
      hideSidebar();
      sendResponse({ ok: true });
    }
    return true;
  });

  function showSidebar(data) {
    if (sidebar) sidebar.remove();

    const { project, resources } = data;
    const color = project.color || '#F5A623';
    
    // Helper to clean markdown and truncate
    const cleanText = (text) => {
      if (!text) return '';
      return text.replace(/\*\*/g, '').replace(/Summary:/i, '').trim();
    };

    const itemsHTML = (resources || []).slice(0, 3).map((r, index) => {
      const displaySummary = cleanText(r.summary);
      const displayTitle = r.title ? r.title.split(' - ')[0] : 'Untitled';
      const displaySource = r.title && r.title.includes(' - ') ? r.title.split(' - ')[1] : 'Web';

      return `
        <div class="rs-card" id="rs-card-${index}" style="
          margin-bottom:12px; background:white; border:1px solid #E8E2D6;
          border-radius:14px; cursor:pointer; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden; position: relative; display: flex; flex-direction: column;
        ">
          <!-- Card Header -->
          <div style="padding:16px; display:flex; gap:12px; align-items:flex-start;">
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <span style="font-weight:800; font-size:13px; color:#1A1A1A; line-height:1.2;">${displayTitle}</span>
              </div>
              <div class="rs-preview-text" style="font-size:12px; color:#888; line-height:1.4;">
                ${displaySummary.substring(0, 50)}...
              </div>
            </div>
            <div class="rs-chevron" style="transition: transform 0.3s ease; color:#C49A6C; margin-top:2px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>

          <!-- Expanded Body -->
          <div class="rs-card-content" style="display:none; padding:0 16px 16px 16px; animation: rsFadeIn 0.3s ease;">
            <div style="height:1px; background:#F0EBD8; margin-bottom:12px;"></div>
            
            <div style="font-size:12px; color:#3D3832; line-height:1.6; margin-bottom:16px; font-style:italic;">
              "${displaySummary}"
            </div>

            ${r.bulletSummary && r.bulletSummary.length > 0 ? `
              <div style="margin-bottom:18px; background:#FFFDF7; border:1px solid #F0EBD8; border-radius:10px; padding:12px;">
                <div style="font-weight:900; font-size:10px; color:#C49A6C; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px;">Key Takeaways</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${r.bulletSummary.slice(0, 3).map(b => `
                    <div style="font-size:11px; color:#6B6B6B; display:flex; gap:8px; line-height:1.4;">
                      <span style="color:${color}; font-weight:bold;">•</span>
                      <span>${cleanText(b)}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <button class="rs-go-btn" data-url="${r.url}" style="
              width:100%; padding:12px; background:${color}; color:white; border:none;
              border-radius:10px; font-weight:800; font-size:11px; cursor:pointer;
              display:flex; align-items:center; justify-content:center; gap:8px;
              box-shadow: 0 4px 12px ${color}33; transition: all 0.2s;
            ">
              <span>VISIT SOURCE</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    sidebar = document.createElement('div');
    sidebar.id = 'rs-sidebar-container';
    sidebar.innerHTML = `
      <div id="rs-sidebar-panel" style="
        position:fixed; top:20px; right:20px; width:340px; max-height:calc(100vh - 40px);
        background:#FFFDF7; border:1px solid #F0EBD8; z-index:2147483647;
        border-radius:24px; display:flex; flex-direction:column;
        box-shadow: 0 20px 50px rgba(0,0,0,0.1);
        transform: translateX(400px);
        transition: transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <!-- Header -->
        <div style="padding:24px 20px 16px 20px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <div style="width:12px; height:12px; border-radius:50%; background:${color}; box-shadow: 0 0 10px ${color}66;"></div>
            <div style="font-weight:900; font-size:15px; color:#1A1A1A; letter-spacing:-0.01em;">${project.name.toLowerCase()}</div>
          </div>
          <button id="rs-x-btn" style="border:none; background:#F0EBD8; color:#3D3832; width:28px; height:28px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px;">✕</button>
        </div>

        <!-- Scrollable Content -->
        <div id="rs-scroll-area" style="flex:1; overflow-y:auto; padding:0 20px 20px 20px; scrollbar-width: none;">
          <div style="font-weight:800; font-size:10px; color:#9B9B9B; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:16px;">Saved Knowledge</div>
          ${itemsHTML}
        </div>

        <!-- Footer -->
        <div style="padding:16px 20px; background:white; border-top:1px solid #F0EBD8; border-bottom-left-radius:24px; border-bottom-right-radius:24px;">
          <button id="rs-dashboard-link" style="
            width:100%; padding:14px; background:white; color:${color}; border:2px solid ${color}22;
            border-radius:14px; font-weight:800; font-size:12px; cursor:pointer; transition: all 0.2s;
            display:flex; align-items:center; justify-content:center; gap:8px;
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
            Open Dashboard
          </button>
        </div>
      </div>

      <style>
        @keyframes rsFadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        #rs-scroll-area::-webkit-scrollbar { display: none; }
        .rs-card:hover { border-color: ${color}88 !important; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
        .rs-card.active { border-color: ${color} !important; background:white !important; box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
        .rs-card.active .rs-chevron { transform: rotate(180deg); }
        .rs-card.active .rs-preview-text { display: none; }
        .rs-go-btn:hover { transform: scale(1.02); filter: brightness(1.05); }
        #rs-dashboard-link:hover { background: ${color}08; border-color: ${color}; }
      </style>
    `;

    document.body.appendChild(sidebar);
    
    // Animate In
    setTimeout(() => {
      const panel = document.getElementById('rs-sidebar-panel');
      if (panel) panel.style.transform = 'translateX(0)';
    }, 10);

    // Expansion Handler
    document.querySelectorAll('.rs-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('.rs-go-btn')) return;
        
        const content = card.querySelector('.rs-card-content');
        const isActive = card.classList.contains('active');

        // Close others
        document.querySelectorAll('.rs-card').forEach(c => {
          c.classList.remove('active');
          c.querySelector('.rs-card-content').style.display = 'none';
        });

        // Toggle current
        if (!isActive) {
          card.classList.add('active');
          content.style.display = 'block';
        }
      };
    });

    // Navigation
    document.querySelectorAll('.rs-go-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const url = btn.dataset.url;
        if (url) window.open(url, '_blank');
      };
    });

    document.getElementById('rs-x-btn').onclick = hideSidebar;
    document.getElementById('rs-dashboard-link').onclick = () => {
      window.open(chrome.runtime.getURL('src/popup/dashboard.html'), '_blank');
    };

    // Auto-hide after 1 minute
    setTimeout(hideSidebar, 60000);
  }

  function hideSidebar() {
    const panel = document.getElementById('rs-sidebar-panel');
    if (panel) {
      panel.style.transform = 'translateX(400px)';
      setTimeout(() => { if (sidebar) sidebar.remove(); sidebar = null; }, 500);
    }
  }
})();
