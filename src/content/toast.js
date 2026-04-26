/**
 * Injected Toast Notification for Resurface
 * Shows a premium, non-intrusive confirmation directly in the webpage.
 */

function showResurfaceToast(title, message, type = 'success') {
  // Remove existing toast if present
  const existingToast = document.getElementById('resurface-toast-container');
  if (existingToast) existingToast.remove();

  // Create container
  const container = document.createElement('div');
  container.id = 'resurface-toast-container';
  
  // Style container
  Object.assign(container.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647', // Max z-index
    pointerEvents: 'none',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  });

  // Create toast element
  const toast = document.createElement('div');
  
  // Design variables
  const bgColor = '#FFFDF7';
  const accentColor = type === 'success' ? '#F5A623' : '#E57373';
  const textColor = '#1A1A1A';
  const subTextColor = '#6B6B6B';

  // Build HTML
  toast.innerHTML = `
    <div style="
      background: ${bgColor};
      border: 1px solid #F0EBD8;
      border-left: 4px solid ${accentColor};
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 280px;
      max-width: 350px;
      pointer-events: auto;
      transform: translateX(120%);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    ">
      <div style="
        width: 32px;
        height: 32px;
        background: ${accentColor}15;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${type === 'success' ? '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
        </svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 800; color: ${textColor}; font-size: 14px; margin-bottom: 2px;">${title}</div>
        <div style="color: ${subTextColor}; font-size: 12px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message}</div>
      </div>
      <button id="resurface-toast-close" style="
        background: none;
        border: none;
        color: #9B9B9B;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  `;

  container.appendChild(toast);
  document.body.appendChild(container);

  // Animate in
  requestAnimationFrame(() => {
    toast.firstElementChild.style.transform = 'translateX(0)';
  });

  // Close logic
  const closeBtn = toast.querySelector('#resurface-toast-close');
  const dismiss = () => {
    toast.firstElementChild.style.transform = 'translateX(120%)';
    setTimeout(() => container.remove(), 400);
  };

  closeBtn.onclick = dismiss;

  // Auto-dismiss after 4 seconds
  setTimeout(dismiss, 4000);
}

// Global scope check for the function
window.showResurfaceToast = showResurfaceToast;
