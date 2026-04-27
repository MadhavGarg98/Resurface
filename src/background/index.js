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

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Background] Message received:', message.action);

  // Create project and assign resource
  if (message.action === 'CREATE_PROJECT_AND_ASSIGN') {
    handleCreateAndAssign(message.data)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // Assign resource to existing project
  if (message.action === 'ASSIGN_TO_PROJECT') {
    handleAssignProject(message.data)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  return false;
});

async function handleCreateAndAssign(data) {
  const { resourceId, projectName, keywords, relatedUrls } = data;
  
  const { saveProject } = await import('../utils/storage.js');
  
  const newProject = await saveProject({
    name: projectName,
    keywords: keywords || [],
    relatedUrls: relatedUrls || [],
    color: ['#F5A623','#4CAF50','#2196F3','#9C27B0','#E57373'][Math.floor(Math.random()*5)]
  });
  
  // Assign resource
  const { updateResource } = await import('../utils/storage.js');
  await updateResource(resourceId, { projectId: newProject.id });
  
  console.log('[Background] Created project & assigned:', newProject.name);
  return { success: true, projectId: newProject.id };
}

async function handleAssignProject(data) {
  const { resourceId, projectId } = data;
  const { updateResource } = await import('../utils/storage.js');
  await updateResource(resourceId, { projectId });
  console.log('[Background] Assigned to project:', projectId);
  return { success: true };
}
