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
initMessageHandler();

console.log('All background modules initialized');
