import { handleSaveCommand } from './commands.js';
import { init as initContextMenus } from './contextMenus.js';
import { init as initTabListener } from './tabListener.js';
import { init as initAlarms } from './alarms.js';
import { init as initMessageHandler } from './messageHandler.js';
import { getResources } from '../utils/storage.js';

// Update extension badge with resource count
async function updateBadgeCount() {
  try {
    const resources = await getResources();
    const count = resources.length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#C49A6C' });
  } catch (error) {
    console.error('[Badge] Failed to update:', error);
  }
}

// Initial count
updateBadgeCount();

// Listen for storage changes to update badge in real-time
chrome.storage.onChanged.addListener((changes) => {
  if (changes.resources) {
    const count = changes.resources.newValue.length;
    chrome.action.setBadgeText({ text: count > 0 ? count.toString() : '' });
  }
});

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

  // Trigger save from popup button
  if (message.action === 'save-resource') {
    handleSaveCommand()
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

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
  await updateResource(resourceId, { 
    title: data.resourceTitle || undefined, // Update title if provided
    projectId: newProject.id,
    tags: data.tags || [],
    _needsConfirmation: false 
  });
  
  // Show success notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/favicon.png'),
    title: '✅ Project Created',
    message: `"${projectName}" created and resource assigned successfully.`,
    priority: 1
  });

  console.log('[Background] Created project & assigned:', newProject.name);
  return { success: true, projectId: newProject.id };
}

async function handleAssignProject(data) {
  const { resourceId, projectId, resourceTitle, tags } = data;
  const { updateResource, getProjects } = await import('../utils/storage.js');
  
  const updated = await updateResource(resourceId, { 
    projectId,
    title: resourceTitle || undefined,
    tags: tags || undefined,
    _needsConfirmation: false,
    _pendingClassification: null
  });

  // Get project name for notification
  const projects = await getProjects();
  const project = projects.find(p => p.id === projectId);

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/favicon.png'),
    title: '📌 Resource Assigned',
    message: `Saved to "${project?.name || 'Project'}".`,
    priority: 1
  });

  console.log('[Background] Assigned to project:', projectId);
  return { success: true };
}
