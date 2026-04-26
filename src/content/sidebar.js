// ============================================
// SIDEBAR STATE
// ============================================
let sidebarElement = null;
let isVisible = false;
let currentProject = null;
let currentResources = [];

// ============================================
// INITIALIZATION
// ============================================
export function initSidebar() {
  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SHOW_SIDEBAR') {
      showSidebar(message.data);
      sendResponse({ success: true });
    }
    if (message.action === 'HIDE_SIDEBAR') {
      hideSidebar();
      sendResponse({ success: true });
    }
    return true;
  });
  
  console.log('[Sidebar] Initialized');
}

// ============================================
// SHOW SIDEBAR
// ============================================
function showSidebar(data) {
  // Remove existing sidebar if any
  if (sidebarElement) {
    hideSidebar();
  }
  
  currentProject = data.project;
  currentResources = data.resources;
  
  // Create sidebar container
  sidebarElement = document.createElement('div');
  sidebarElement.id = 'resurface-sidebar';
  sidebarElement.innerHTML = buildSidebarHTML(data);
  
  // Add styles
  injectSidebarStyles();
  
  // Add to page
  document.body.appendChild(sidebarElement);
  
  // Trigger animation
  requestAnimationFrame(() => {
    sidebarElement.classList.add('visible');
  });
  
  isVisible = true;
  
  // Add event listeners
  addSidebarEventListeners();
  
  // Auto-dismiss after 15 seconds if user doesn't interact
  sidebarElement._autoDismissTimeout = setTimeout(() => {
    if (isVisible && !sidebarElement._userInteracted) {
      hideSidebar();
    }
  }, 15000);
}

// ============================================
// HIDE SIDEBAR
// ============================================
function hideSidebar() {
  if (!sidebarElement) return;
  
  sidebarElement.classList.remove('visible');
  
  // Remove after animation
  setTimeout(() => {
    if (sidebarElement && sidebarElement.parentNode) {
      sidebarElement.parentNode.removeChild(sidebarElement);
    }
    sidebarElement = null;
    isVisible = false;
  }, 300);
  
  // Clear auto-dismiss timeout
  if (sidebarElement?._autoDismissTimeout) {
    clearTimeout(sidebarElement._autoDismissTimeout);
  }
}

// ============================================
// BUILD SIDEBAR HTML
// ============================================
function buildSidebarHTML(data) {
  const { project, resources, totalResources, unreadCount } = data;
  
  // Format deadline
  let deadlineHTML = '';
  if (project.deadline) {
    const deadline = new Date(project.deadline);
    const now = new Date();
    const diffMs = deadline - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    let deadlineColor = '#4CAF50'; // green (plenty of time)
    let deadlineText = `${diffDays} days left`;
    
    if (diffDays < 0) {
      deadlineColor = '#E57373'; // red (overdue)
      deadlineText = 'Overdue';
    } else if (diffDays <= 1) {
      deadlineColor = '#E57373'; // red
      deadlineText = 'Due today';
    } else if (diffDays <= 3) {
      deadlineColor = '#F5A623'; // amber
      deadlineText = `${diffDays} days left`;
    }
    
    deadlineHTML = `
      <div class="rs-deadline" style="color: ${deadlineColor};">
        <span class="rs-deadline-icon">⏰</span>
        ${deadlineText}
      </div>
    `;
  }
  
  // Build resource list
  const resourcesHTML = resources.map((r, index) => {
    const typeIcon = r.type === 'text' ? '📝' : r.type === 'link' ? '🔗' : '📄';
    const summary = r.summary || r.textContent?.substring(0, 100) || 'No summary';
    const truncatedSummary = summary.length > 100 ? summary.substring(0, 100) + '...' : summary;
    
    return `
      <div class="rs-resource-item" data-resource-id="${r.id}" data-url="${r.url || ''}">
        <div class="rs-resource-icon">${typeIcon}</div>
        <div class="rs-resource-content">
          <div class="rs-resource-title">${escapeHTML(r.title || 'Untitled')}</div>
          <div class="rs-resource-summary">${escapeHTML(truncatedSummary)}</div>
        </div>
        ${r.url ? '<div class="rs-resource-arrow">→</div>' : ''}
      </div>
    `;
  }).join('');
  
  const projectColor = project.color || '#F5A623';
  
  return `
    <div class="rs-sidebar-header">
      <div class="rs-sidebar-project-info">
        <div class="rs-project-name">
          <span class="rs-project-dot" style="background: ${projectColor};"></span>
          ${escapeHTML(project.name)}
        </div>
        ${deadlineHTML}
      </div>
      <button class="rs-close-btn" id="rs-close-sidebar">✕</button>
    </div>
    
    <div class="rs-sidebar-body">
      <div class="rs-sidebar-title">
        💡 Here are your saved resources
        ${unreadCount > 0 ? `<span class="rs-badge">${unreadCount} unread</span>` : ''}
      </div>
      <div class="rs-resource-count">
        ${totalResources} resource${totalResources !== 1 ? 's' : ''} saved for this project
      </div>
      
      <div class="rs-resources-list">
        ${resourcesHTML}
      </div>
      
      <div class="rs-sidebar-footer">
        <button class="rs-open-dashboard-btn" id="rs-open-dashboard">
          📊 Open Full Dashboard
        </button>
      </div>
    </div>
  `;
}

// ============================================
// INJECT STYLES
// ============================================
function injectSidebarStyles() {
  if (document.getElementById('resurface-sidebar-styles')) return;
  
  const styles = document.createElement('style');
  styles.id = 'resurface-sidebar-styles';
  styles.textContent = `
    #resurface-sidebar {
      position: fixed;
      top: 0;
      right: 0;
      width: 360px;
      height: 100vh;
      background: #FFFDF7;
      border-left: 1px solid #F0EBD8;
      box-shadow: -4px 0 24px rgba(0, 0, 0, 0.08);
      z-index: 2147483646;
      transform: translateX(100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    
    #resurface-sidebar.visible {
      transform: translateX(0);
    }
    
    #resurface-sidebar * {
      box-sizing: border-box;
    }
    
    .rs-sidebar-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid #F0EBD8;
      background: #FFFFFF;
    }
    
    .rs-sidebar-project-info {
      flex: 1;
      min-width: 0;
    }
    
    .rs-project-name {
      font-size: 16px;
      font-weight: 600;
      color: #1A1A1A;
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    
    .rs-project-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    
    .rs-deadline {
      font-size: 12px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    
    .rs-deadline-icon {
      font-size: 12px;
    }
    
    .rs-close-btn {
      background: none;
      border: none;
      font-size: 16px;
      color: #9B9B9B;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    
    .rs-close-btn:hover {
      background: #FFF8E7;
      color: #1A1A1A;
    }
    
    .rs-sidebar-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }
    
    .rs-sidebar-title {
      font-size: 14px;
      font-weight: 600;
      color: #1A1A1A;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .rs-badge {
      font-size: 11px;
      font-weight: 500;
      background: #FFF8E7;
      color: #F5A623;
      padding: 2px 8px;
      border-radius: 12px;
    }
    
    .rs-resource-count {
      font-size: 12px;
      color: #9B9B9B;
      margin-bottom: 16px;
    }
    
    .rs-resources-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .rs-resource-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      background: #FFFFFF;
      border: 1px solid #F0EBD8;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .rs-resource-item:hover {
      border-color: #F5A623;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      background: #FFFDF7;
    }
    
    .rs-resource-icon {
      font-size: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .rs-resource-content {
      flex: 1;
      min-width: 0;
    }
    
    .rs-resource-title {
      font-size: 13px;
      font-weight: 600;
      color: #1A1A1A;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .rs-resource-summary {
      font-size: 12px;
      color: #6B6B6B;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    
    .rs-resource-arrow {
      font-size: 14px;
      color: #9B9B9B;
      flex-shrink: 0;
      margin-top: 2px;
    }
    
    .rs-sidebar-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid #F0EBD8;
    }
    
    .rs-open-dashboard-btn {
      width: 100%;
      padding: 10px;
      background: #F5A623;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 500;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .rs-open-dashboard-btn:hover {
      background: #E09510;
    }
    
    /* Responsive: smaller sidebar on narrow screens */
    @media (max-width: 480px) {
      #resurface-sidebar {
        width: 100vw;
      }
    }
  `;
  
  document.head.appendChild(styles);
}

// ============================================
// EVENT LISTENERS
// ============================================
function addSidebarEventListeners() {
  if (!sidebarElement) return;
  
  // Track user interaction
  sidebarElement.addEventListener('mouseenter', () => {
    sidebarElement._userInteracted = true;
  });
  
  // Close button
  const closeBtn = sidebarElement.querySelector('#rs-close-sidebar');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideSidebar);
  }
  
  // Resource items — open on click
  const resourceItems = sidebarElement.querySelectorAll('.rs-resource-item');
  resourceItems.forEach(item => {
    item.addEventListener('click', () => {
      const url = item.dataset.url;
      if (url && url !== 'undefined' && url !== 'null') {
        window.open(url, '_blank');
      }
    });
  });
  
  // Open dashboard button
  const dashboardBtn = sidebarElement.querySelector('#rs-open-dashboard');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      const dashboardUrl = chrome.runtime.getURL('src/popup/dashboard.html');
      window.open(dashboardUrl, '_blank');
    });
  }
  
  // Keyboard shortcut: Escape to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      hideSidebar();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ============================================
// HELPER: Escape HTML
// ============================================
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
