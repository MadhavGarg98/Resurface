import { v4 as uuidv4 } from 'uuid';
import { generateBulletSummary } from '../utils/summarizer.js';
import { saveResource } from '../utils/storage.js';
import { categorizeResource } from '../utils/categorizer.js';
import { handleSaveCommand } from './commands.js';

/**
 * Initialize context menu items
 */
export function init() {
  // Remove existing items to avoid duplicates
  chrome.contextMenus.removeAll(() => {
    // Create "Summarize Selection" menu item
    chrome.contextMenus.create({
      id: 'resurface-summarize',
      title: '🔍 Resurface — Summarize Selection',
      contexts: ['selection']
    });
    
    // Create "Save to Resurface" menu item
    chrome.contextMenus.create({
      id: 'resurface-save',
      title: '📎 Resurface — Save This Page',
      contexts: ['page']
    });
    
    console.log('[ContextMenus] Initialized');
  });
}

/**
 * Handle context menu clicks
 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'resurface-summarize') {
    await handleSummarizeSelection(info, tab);
  }
  
  if (info.menuItemId === 'resurface-save') {
    try {
      await handleSaveCommand();
    } catch (error) {
      console.error('Save page error:', error);
    }
  }
});

/**
 * Summarize selected text
 */
async function handleSummarizeSelection(info, tab) {
  const selectedText = info.selectionText;
  
  if (!selectedText || selectedText.trim().length < 20) {
    showSystemNotification('Resurface', 'Please select more text to summarize.');
    return;
  }
  
  const notifId = 'summarize-' + Date.now();
  showSystemNotification('Resurface', 'Generating summary...', notifId);
  
  try {
    const bullets = await generateBulletSummary(selectedText, 3);
    chrome.notifications.clear(notifId);
    
    const bulletText = bullets.map((b, i) => `${i + 1}. ${b}`).join('\n');
    
    chrome.notifications.create('summary-result', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
      title: '📝 Summary Results',
      message: bulletText || 'Could not generate summary.',
      priority: 2,
      buttons: [{ title: '💾 Save to Resurface' }]
    });
    
    // Store temporarily
    await chrome.storage.local.set({
      _lastSummarizedText: selectedText,
      _lastSummarizedBullets: bullets
    });
    
  } catch (error) {
    chrome.notifications.clear(notifId);
    showSystemNotification('Error', 'Failed to generate summary.');
    console.error('Summarize error:', error);
  }
}

// Listen for notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId === 'summary-result' && buttonIndex === 0) {
    const data = await chrome.storage.local.get(['_lastSummarizedText', '_lastSummarizedBullets']);
    
    if (data._lastSummarizedText) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const categorization = await categorizeResource(tab?.title || 'Selection', data._lastSummarizedText);
      
      const resource = {
        id: uuidv4(),
        type: 'text',
        title: `Selection: ${tab?.title || 'Unknown page'}`,
        url: tab?.url || '',
        textContent: data._lastSummarizedText.substring(0, 5000),
        summary: data._lastSummarizedBullets?.join(' ') || data._lastSummarizedText.substring(0, 200),
        bulletSummary: data._lastSummarizedBullets || [],
        tags: categorization?.tags || [],
        projectId: categorization?.projectId || null,
        savedAt: new Date().toISOString(),
        readStatus: 'unread',
        accessCount: 0
      };
      
      await saveResource(resource);
      await chrome.storage.local.remove(['_lastSummarizedText', '_lastSummarizedBullets']);
      showSystemNotification('✅ Saved', 'Selection saved to your library.');
    }
  }
});

function showSystemNotification(title, message, id = null) {
  const options = {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: title,
    message: message,
    priority: 1
  };
  
  if (id) {
    chrome.notifications.create(id, options);
  } else {
    chrome.notifications.create(options);
  }
}
