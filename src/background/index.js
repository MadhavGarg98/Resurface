import { handleSaveCommand } from './commands.js';
import { init as initContextMenus } from './contextMenus.js';
import { init as initTabListener } from './tabListener.js';
import { init as initAlarms } from './alarms.js';
import { init as initMessageHandler } from './messageHandler.js';

console.log('Resurface background service worker started');

// Register keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save-resource') {
    await handleSaveCommand();
  }
});

// Initialize modules
initContextMenus();
initTabListener();
initAlarms();
// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener((notificationId) => {
  if (notificationId.startsWith('help-categorize-')) {
    // Open the popup (note: openPopup only works in some contexts, but let's try)
    if (chrome.action.openPopup) {
      chrome.action.openPopup();
    } else {
      // Fallback: open full dashboard
      chrome.tabs.create({ url: 'src/popup/dashboard.html' });
    }
  }
});

console.log('All background modules initialized');
