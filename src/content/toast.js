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
  const bgColor = '#FFFFFF';
  const accentColor = type === 'success' ? '#C49A6C' : '#E57373';
  const textColor = '#3D3832';
  const subTextColor = '#6B6661';

  // Build HTML
  toast.innerHTML = `
    <div style="
      background: ${bgColor};
      border: 1px solid #E8E2D6;
      border-left: 4px solid ${accentColor};
      border-radius: 16px;
      padding: 18px 20px;
      box-shadow: 0 12px 32px rgba(61, 56, 50, 0.12);
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 300px;
      max-width: 380px;
      pointer-events: auto;
      transform: translateX(120%);
      transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    ">
      <div style="
        width: 36px;
        height: 36px;
        background: ${accentColor}12;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          ${type === 'success' ? '<path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>' : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
        </svg>
      </div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 800; color: ${textColor}; font-size: 15px; margin-bottom: 3px; letter-spacing: -0.01em;">${title}</div>
        <div style="color: ${subTextColor}; font-size: 13px; line-height: 1.5; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${message}</div>
      </div>
      <button id="resurface-toast-close" style="
        background: none;
        border: none;
        color: #A8A29E;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
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
