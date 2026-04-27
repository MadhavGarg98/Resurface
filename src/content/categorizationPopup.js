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

  const confidenceColor = classification.confidence >= 90 ? '#4CAF50' :
                           classification.confidence >= 60 ? '#F5A623' : '#E57373';

  function render() {
    container.innerHTML = `
      <div id="rs-cat-card" style="
        background: white;
        border: 1px solid #F0EBD8;
        border-radius: 16px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.12);
        width: 300px;
        max-height: calc(100vh - 60px);
        pointer-events: auto;
        transform: translateY(20px);
        opacity: 0;
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      ">
        <!-- Fixed Header -->
        <div style="padding: 16px 18px 12px; border-bottom: 1px solid #F5A62315; flex-shrink: 0;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: #F5A623; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <div style="font-size: 13px; font-weight: 800; color: #1A1A1A;">Saved to Resurface</div>
          </div>
        </div>

        <!-- Scrollable Content -->
        <div style="flex: 1; overflow-y: auto; padding: 14px 18px; min-height: 0;">
          <!-- AI Decision -->
          <div style="display: flex; gap: 10px; margin-bottom: 14px;">
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 700; color: #1A1A1A; font-size: 13px; display: flex; align-items: center; gap: 8px;">
                <img src="${chrome.runtime.getURL('icons/favicon.png')}" style="width: 16px; height: 16px; object-fit: contain; flex-shrink: 0;" alt="" />
                ${classification.projectId ? 'Project Suggestion' : 'Where to save?'}
              </div>
              <div style="font-size: 11px; color: #6B6B6B; margin-top: 4px; line-height: 1.4; max-height: 46px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                ${classification.reasoning || 'AI is classifying this resource...'}
              </div>
            </div>
            
            <!-- Timer Circle -->
            <div style="position: relative; width: 32px; height: 32px; flex-shrink: 0;">
               <svg width="32" height="32" viewBox="0 0 32 32">
                  <circle cx="16" cy="16" r="14" fill="none" stroke="#F0EBD8" stroke-width="2.5" />
                  <circle cx="16" cy="16" r="14" fill="none" stroke="#F5A623" stroke-width="2.5" 
                          stroke-dasharray="88" stroke-dashoffset="${88 * (1 - timeLeft / 25)}" 
                          stroke-linecap="round" transform="rotate(-90 16 16)" 
                          style="transition: stroke-dashoffset 1s linear;" />
               </svg>
               <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #F5A623;">
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
                     padding: 10px 12px;
                     border-radius: 12px;
                     border: 2px solid ${selectedProjectId === classification.projectId ? '#F5A623' : '#F0EBD8'};
                     background: ${selectedProjectId === classification.projectId ? '#FFF8E7' : 'white'};
                     cursor: pointer;
                     margin-bottom: 8px;
                     transition: all 0.2s;
                   ">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="font-size: 13px; font-weight: 700; color: #1A1A1A; display: flex; align-items: center; gap: 6px;">
                    📁 ${classification.projectName || 'Best Match'}
                    <div style="font-size: 10px; font-weight: 800; color: ${confidenceColor}; background: ${confidenceColor}15; padding: 1px 5px; border-radius: 4px;">${classification.confidence}%</div>
                  </div>
                  ${selectedProjectId === classification.projectId ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A623" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
                </div>
                ${classification.matchedKeywords?.length > 0 ? `
                  <div style="display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap;">
                    ${classification.matchedKeywords.slice(0, 3).map(kw => `<span style="font-size: 9px; background: white; color: #F5A623; padding: 1px 5px; border-radius: 4px; border: 1px solid #F5A62330;">${kw}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            ` : ''}

            ${showAllOptions ? (classification.alternatives || []).filter(alt => alt.projectId !== classification.projectId).map(alt => `
              <div class="rs-cat-option ${selectedProjectId === alt.projectId ? 'selected' : ''}" 
                   data-id="${alt.projectId}"
                   style="
                     padding: 8px 12px;
                     border-radius: 10px;
                     border: 1px solid ${selectedProjectId === alt.projectId ? '#F5A623' : '#F0EBD8'};
                     background: ${selectedProjectId === alt.projectId ? '#FFF8E7' : 'white'};
                     cursor: pointer;
                     margin-bottom: 6px;
                     display: flex;
                     justify-content: space-between;
                     align-items: center;
                   ">
                <div style="font-size: 12px; font-weight: 500; color: #1A1A1A;">📁 ${alt.projectName}</div>
                <div style="font-size: 10px; color: #9B9B9B;">${alt.confidence}%</div>
              </div>
            `).join('') : ''}
          </div>

          <!-- Controls -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
             <button id="rs-cat-toggle-all" style="background: none; border: none; font-size: 10px; font-weight: 700; color: #F5A623; cursor: pointer; padding: 4px 0; display: flex; align-items: center; gap: 3px;">
                ${showAllOptions ? 'Fewer options' : 'More options'}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="transform: ${showAllOptions ? 'rotate(180deg)' : 'none'}"><path d="m6 9 6 6 6-6"/></svg>
             </button>
             <button id="rs-cat-create-btn" style="background: none; border: none; font-size: 10px; font-weight: 700; color: #9B9B9B; cursor: pointer; padding: 4px 0; display: flex; align-items: center; gap: 3px;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M5 12h14m-7-7v14"/></svg>
                Create New
             </button>
          </div>

          <!-- Creation Form -->
          <div id="rs-cat-create-form" style="display: ${isCreating ? 'block' : 'none'}; margin-top: 12px; padding: 12px; background: #FFFDF7; border: 1px solid #F0EBD8; border-radius: 12px;">
            <input id="rs-cat-new-name" type="text" placeholder="Project name" value="${classification.suggestedNewProject?.name || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #E5DFC8; border-radius: 6px; font-size: 12px; margin-bottom: 6px; outline: none; box-sizing: border-box;">
            <input id="rs-cat-new-keywords" type="text" placeholder="Keywords (comma separated)" value="${classification.suggestedNewProject?.keywords?.join(', ') || ''}" style="width: 100%; padding: 6px 10px; border: 1px solid #E5DFC8; border-radius: 6px; font-size: 12px; margin-bottom: 6px; outline: none; box-sizing: border-box;">
            <div style="display: flex; gap: 6px;">
              <button id="rs-cat-do-create" style="flex: 2; background: #4CAF50; color: white; border: none; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 700; cursor: pointer;">Create & Assign</button>
              <button id="rs-cat-cancel-create" style="flex: 1; background: white; color: #6B6B6B; border: 1px solid #E5DFC8; padding: 6px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">Cancel</button>
            </div>
          </div>
        </div>

        <!-- Fixed Action Buttons (always visible at bottom) -->
        <div style="padding: 12px 18px 16px; border-top: 1px solid #F0EBD8; flex-shrink: 0; background: white; display: flex; gap: 8px;">
          <button id="rs-cat-confirm" style="flex: 1.5; background: #F5A623; color: white; border: none; height: 36px; border-radius: 10px; font-size: 12px; font-weight: 800; cursor: pointer; transition: all 0.15s;">
            ✓ Confirm
          </button>
          <button id="rs-cat-dismiss" style="flex: 1; background: white; color: #6B6B6B; border: 1px solid #E5DFC8; height: 36px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.15s;">
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
