import { getProjects, getResources } from '../utils/storage';

const shownTabs = {};

export function init() {
  console.log('[TabListener] Starting...');

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url || tab.url.startsWith('chrome')) return;
    
    console.log(`[TabListener] Page loaded: ${tab.url.substring(0, 60)}`);
    
    // Brief delay to ensure content script is loaded
    setTimeout(() => checkPage(tabId, tab.url), 500);
  });

  // Listen for trigger from popup or content script
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TRIGGER_SIDEBAR') {
      const tabId = sender.tab ? sender.tab.id : null;
      const url = sender.tab ? sender.tab.url : null;

      if (tabId && url) {
        // Triggered from content script
        checkPage(tabId, url, false).then(() => sendResponse({ ok: true }));
      } else {
        // Triggered from popup
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
          if (tabs[0]) {
            await checkPage(tabs[0].id, tabs[0].url, true);
            sendResponse({ ok: true });
          }
        });
      }
      return true;
    }
  });
}

async function checkPage(tabId, url, forceShow = false) {
  // Check if sidebar is globally enabled
  const result = await chrome.storage.local.get(['sidebarEnabled']);
  const isEnabled = result.sidebarEnabled !== false; // Default to true
  
  if (!isEnabled && !forceShow) {
    console.log('[TabListener] Sidebar is disabled in settings, skipping match');
    return;
  }

  if (!forceShow && shownTabs[tabId]) return;
  
  const projects = await getProjects();
  const resources = await getResources();
  
  if (resources.length === 0) {
    console.log('[TabListener] No resources saved yet');
    return;
  }

  // Find matching project
  const { matchProject } = await import('../utils/projectMatcher.js');
  const localMatch = await matchProject(url, projects, resources);
  
  let bestMatch = localMatch.projectId ? projects.find(p => p.id === localMatch.projectId) : null;
  let bestScore = localMatch.confidence;

  // FORCE SHOW: Use best match or create a general match
  if (forceShow && !bestMatch && resources.length > 0) {
    bestMatch = {
      id: 'general',
      name: 'Your Resources',
      color: '#F5A623',
      keywords: [],
      relatedUrls: []
    };
    bestScore = 10;
  }

  if (bestMatch && (bestScore >= 30 || forceShow)) {
    console.log(`[TabListener] Match found: ${bestMatch.name} (confidence: ${bestScore}%). Threshold: 30%`);
    
    const projectResources = bestMatch.id === 'general' 
      ? resources.slice(0, 3) 
      : resources.filter(r => r.projectId === bestMatch.id).slice(0, 3);
    
    const resourcesToShow = projectResources.length > 0 
      ? projectResources 
      : resources.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt)).slice(0, 3);

    if (resourcesToShow.length > 0) {
      await sendSidebarMessage(tabId, bestMatch, resourcesToShow, resources.length);
    }
  } else {
    console.log('[TabListener] No match found for this URL');
  }
}

async function sendSidebarMessage(tabId, project, resources, totalCount) {
  console.log(`[TabListener] Dispatching SHOW_SIDEBAR for project: ${project.name} to tab: ${tabId}`);
  const message = {
    action: 'SHOW_SIDEBAR',
    data: {
      project: {
        id: project.id,
        name: project.name,
        color: project.color || '#F5A623',
        deadline: project.deadline || null
      },
      resources: resources,
      totalResources: totalCount || resources.length,
      unreadCount: resources.filter(r => r.readStatus === 'unread').length
    }
  };

  try {
    await chrome.tabs.sendMessage(tabId, message);
    console.log('[TabListener] Sidebar message sent successfully');
    shownTabs[tabId] = true;
  } catch (err) {
    console.warn('[TabListener] Script missing, attempting re-injection...');
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['contentScript.js']
      });
      
      // Wait a tiny bit for init
      setTimeout(async () => {
        await chrome.tabs.sendMessage(tabId, message);
        shownTabs[tabId] = true;
      }, 100);
    } catch (injectErr) {
      console.error('[TabListener] Re-injection failed:', injectErr);
    }
  }
}
