/**
 * Resurface In-Page Categorization Confirmation
 * 
 * Ported from React to Vanilla JS for easy injection.
 */

function showResurfaceCategorizationPopup(resource, classification) {
  // Remove existing if any
  const existing = document.getElementById('resurface-cat-popup-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'resurface-cat-popup-container';
  
  // Style container
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    pointerEvents: 'none'
  });

  let timeLeft = 25;
  let selectedProjectId = classification.projectId || (classification.alternatives?.[0]?.projectId) || null;
  let isCreating = false;
  let showAllOptions = false;

  const confidenceColor = classification.confidence >= 90 ? '#C49A6C' :
                           classification.confidence >= 60 ? '#B5895B' : '#E57373';

  function render() {
    container.innerHTML = `
      <div id="rs-cat-card" style="
        background: white;
        border: 1px solid #E8E2D6;
        border-radius: 24px;
        box-shadow: 0 24px 64px rgba(61, 56, 50, 0.18);
        width: 320px;
        max-height: calc(100vh - 60px);
        pointer-events: auto;
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      ">
        <!-- Fixed Header -->
        <div style="padding: 20px 20px 16px; border-bottom: 1px solid #E8E2D6; flex-shrink: 0; background: #FFFFFF;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 24px; height: 24px; background: #C49A6C; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 4px 8px rgba(196, 154, 108, 0.3);">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #3D3832; letter-spacing: -0.01em;">Saved to Resurface</div>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div style="flex: 1; overflow-y: auto; padding: 16px 20px; min-height: 0; background: #FAF8F5;">
          <!-- AI Decision -->
          <div style="display: flex; gap: 12px; margin-bottom: 20px; background: white; padding: 14px; border-radius: 16px; border: 1px solid #E8E2D6;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 800; color: #3D3832; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 16px; height: 16px; object-fit: contain; flex-shrink: 0;" alt="" />
                ${classification.projectId ? 'AI Suggestion' : 'Where to save?'}
              </div>
              <div style="font-size: 11px; color: #6B6661; margin-top: 6px; line-height: 1.6; max-height: 52px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                ${classification.reasoning || 'Analyzing this resource for optimal categorization...'}
              </div>
            </div>
            
            <!-- Timer Circle -->
            <div style="position: relative; width: 36px; height: 36px; flex-shrink: 0;">
               <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#E8E2D6" stroke-width="3" />
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#C49A6C" stroke-width="3" 
                          stroke-dasharray="100" stroke-dashoffset="${100 * (1 - timeLeft / 25)}" 
                          stroke-linecap="round" transform="rotate(-90 18 18)" 
                          style="transition: stroke-dashoffset 1s linear;" />
               </svg>
               <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #C49A6C;">
                  <span id="rs-cat-timer">${timeLeft}</span>
               </div>
            </div>
          </div>

          <!-- Options Area -->
          <div id="rs-cat-options-list">
            ${classification.projectId ? `
              <div class="rs-cat-option ${selectedProjectId === classification.projectId ? 'selected' : ''}" 
                   data-id="${classification.projectId}"
                   style="
                     padding: 14px;
                     border-radius: 16px;
                     border: 2px solid ${selectedProjectId === classification.projectId ? '#C49A6C' : '#E8E2D6'};
                     background: ${selectedProjectId === classification.projectId ? 'white' : 'white'};
                     cursor: pointer;
                     margin-bottom: 10px;
                     transition: all 0.3s;
                     box-shadow: ${selectedProjectId === classification.projectId ? '0 8px 16px rgba(196, 154, 108, 0.12)' : '0 2px 4px rgba(0,0,0,0.02)'};
                   ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 13px; font-weight: 800; color: #3D3832; display: flex; align-items: center; gap: 8px;">
                    <span style="opacity: 0.8;">📁</span> ${classification.projectName || 'Best Match'}
                  </div>
                  <div style="font-size: 10px; font-weight: 800; color: ${confidenceColor}; background: ${confidenceColor}12; padding: 2px 6px; border-radius: 6px;">${classification.confidence}%</div>
                </div>
                ${classification.matchedKeywords?.length > 0 ? `
                  <div style="display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap;">
                    ${classification.matchedKeywords.slice(0, 3).map(kw => `<span style="font-size: 10px; background: #FAF8F5; color: #C49A6C; padding: 2px 8px; border-radius: 6px; border: 1px solid #E8E2D6;">${kw}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${showAllOptions ? (classification.alternatives || []).filter(alt => alt.projectId !== classification.projectId).map(alt => `
              <div class="rs-cat-option ${selectedProjectId === alt.projectId ? 'selected' : ''}" 
                   data-id="${alt.projectId}"
                   style="
                     padding: 12px 14px;
                     border-radius: 12px;
                     border: 1px solid ${selectedProjectId === alt.projectId ? '#C49A6C' : '#E8E2D6'};
                     background: white;
                     cursor: pointer;
                     margin-bottom: 8px;
                     display: flex;
                     justify-content: space-between;
                     align-items: center;
                     transition: all 0.2s;
                   ">
                <div style="font-size: 13px; font-weight: 600; color: #3D3832;">📁 ${alt.projectName}</div>
                <div style="font-size: 10px; font-weight: 700; color: #A8A29E;">${alt.confidence}%</div>
              </div>
            `).join('') : ''}
          </div>

          <!-- Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
             <button id="rs-cat-toggle-all" style="background: none; border: none; font-size: 11px; font-weight: 800; color: #C49A6C; cursor: pointer; padding: 4px 0; display: flex; align-items: center; gap: 4px;">
                ${showAllOptions ? 'Show less' : 'View alternatives'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="transform: ${showAllOptions ? 'rotate(180deg)' : 'none'}; transition: transform 0.3s;"><path d="m6 9 6 6 6-6"/></svg>
             </button>
             <button id="rs-cat-create-btn" style="background: none; border: none; font-size: 11px; font-weight: 800; color: #A8A29E; cursor: pointer; padding: 4px 0; display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><path d="M5 12h14m-7-7v14"/></svg>
                New Project
             </button>
          </div>

          <!-- Creation Form -->
          <div id="rs-cat-create-form" style="display: ${isCreating ? 'block' : 'none'}; margin-top: 16px; padding: 16px; background: #FFFFFF; border: 1px solid #E8E2D6; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <input id="rs-cat-new-name" type="text" placeholder="Project name" value="${classification.suggestedNewProject?.name || ''}" style="width: 100%; padding: 10px 14px; border: 1px solid #E8E2D6; border-radius: 10px; font-size: 13px; margin-bottom: 10px; outline: none; box-sizing: border-box; background: #FAF8F5; color: #3D3832;">
            <input id="rs-cat-new-keywords" type="text" placeholder="Keywords (comma separated)" value="${classification.suggestedNewProject?.keywords?.join(', ') || ''}" style="width: 100%; padding: 10px 14px; border: 1px solid #E8E2D6; border-radius: 10px; font-size: 13px; margin-bottom: 12px; outline: none; box-sizing: border-box; background: #FAF8F5; color: #3D3832;">
            <div style="display: flex; gap: 8px;">
              <button id="rs-cat-do-create" style="flex: 2; background: #C49A6C; color: white; border: none; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 4px 8px rgba(196, 154, 108, 0.2);">Create & Assign</button>
              <button id="rs-cat-cancel-create" style="flex: 1; background: white; color: #A8A29E; border: 1px solid #E8E2D6; padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Fixed Action Buttons (always visible at bottom) -->
        <div style="padding: 16px 20px 24px; border-top: 1px solid #E8E2D6; flex-shrink: 0; background: white; display: flex; gap: 10px;">
          <button id="rs-cat-confirm" style="flex: 1.6; background: #C49A6C; color: white; border: none; height: 44px; border-radius: 14px; font-size: 14px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(196, 154, 108, 0.3);">
            ✓ Confirm
          </button>
          <button id="rs-cat-dismiss" style="flex: 1; background: white; color: #A8A29E; border: 1px solid #E8E2D6; height: 44px; border-radius: 14px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s;">
            Skip
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    
    // Animate in
    setTimeout(() => {
      const card = document.getElementById('rs-cat-card');
      if (card) {
        card.style.transform = 'translateY(0)';
        card.style.opacity = '1';
      }
    }, 10);

    // Bind events
    bindEvents();
  }

  function bindEvents() {
    // Option Selection
    container.querySelectorAll('.rs-cat-option').forEach(el => {
      el.onclick = () => {
        selectedProjectId = el.dataset.id;
        updateUI();
      };
    });

    // Toggle All
    const toggleBtn = container.querySelector('#rs-cat-toggle-all');
    if (toggleBtn) toggleBtn.onclick = () => {
      showAllOptions = !showAllOptions;
      updateUI();
    };

    // Create Toggle
    container.querySelector('#rs-cat-create-btn').onclick = () => {
      isCreating = true;
      updateUI();
      setTimeout(() => container.querySelector('#rs-cat-new-name').focus(), 10);
    };

    container.querySelector('#rs-cat-cancel-create').onclick = () => {
      isCreating = false;
      updateUI();
    };

    // Create Action
    container.querySelector('#rs-cat-do-create').onclick = async () => {
      const name = container.querySelector('#rs-cat-new-name').value;
      const keywords = container.querySelector('#rs-cat-new-keywords').value;
      
      if (!name) return;
      
      // Disable UI
      container.querySelector('#rs-cat-do-create').innerText = 'Creating...';
      container.querySelector('#rs-cat-do-create').disabled = true;

      // Send message to background to create project and update resource
      chrome.runtime.sendMessage({
        action: 'CREATE_PROJECT_AND_ASSIGN',
        data: {
          name,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
          resourceId: resource.id,
          tags: classification.suggestedTags
        }
      }, (response) => {
        dismissPopup();
      });
    };

    // Confirm Action
    container.querySelector('#rs-cat-confirm').onclick = () => {
      if (!selectedProjectId) return;
      
      chrome.runtime.sendMessage({
        action: 'CONFIRM_CLASSIFICATION',
        data: {
          resourceId: resource.id,
          projectId: selectedProjectId,
          tags: classification.suggestedTags
        }
      }, () => dismissPopup());
    };

    // Dismiss Action
    container.querySelector('#rs-cat-dismiss').onclick = () => {
      chrome.runtime.sendMessage({
        action: 'DISMISS_CLASSIFICATION',
        data: { resourceId: resource.id }
      }, () => dismissPopup());
    };
  }

  function updateUI() {
    // Instead of full re-render (which would lose focus/state), just patch the parts
    // but for simplicity in this script, we'll just re-render the list/form parts
    render();
  }

  function dismissPopup() {
    const card = document.getElementById('rs-cat-card');
    if (card) {
      card.style.transform = 'translateY(-10px)';
      card.style.opacity = '0';
      setTimeout(() => container.remove(), 400);
    }
    clearInterval(timerInterval);
  }

  // Timer logic
  const timerInterval = setInterval(() => {
    timeLeft--;
    const timerEl = document.getElementById('rs-cat-timer');
    if (timerEl) timerEl.innerText = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      if (selectedProjectId && !isCreating) {
        container.querySelector('#rs-cat-confirm').click();
      } else {
        dismissPopup();
      }
    }
  }, 1000);

  // Escape key support
  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      dismissPopup();
      document.removeEventListener('keydown', onKeyDown);
    }
  };
  document.addEventListener('keydown', onKeyDown);

  // Initial render
  render();
}

// Listen for messages to show the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'SHOW_CLASSIFICATION_POPUP') {
    showResurfaceCategorizationPopup(message.data.resource, message.data.classification);
    sendResponse({ success: true });
  }
});
