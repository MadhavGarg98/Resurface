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

  // Listen for manual trigger from popup
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'TRIGGER_SIDEBAR') {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
          await checkPage(tabs[0].id, tabs[0].url, true);
          sendResponse({ ok: true });
        }
      });
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
  let bestMatch = null;
  let bestScore = 0;

  for (const project of projects) {
    if (project.archived) continue;
    
    let score = 0;
    const urlLower = url.toLowerCase();
    const domain = new URL(url).hostname;

    // Check related URLs (exact or wildcard match)
    const relatedUrls = project.relatedUrls || [];
    for (const pattern of relatedUrls) {
      const cleanPattern = pattern.toLowerCase().replace(/\*/g, '');
      if (urlLower.includes(cleanPattern) || domain.includes(cleanPattern)) {
        score += 50;
      }
    }

    // Check keywords in URL
    const keywords = project.keywords || [];
    for (const kw of keywords) {
      if (urlLower.includes(kw.toLowerCase())) {
        score += 20;
      }
    }

    // Check project name in URL
    if (urlLower.includes(project.name.toLowerCase())) {
      score += 30;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = project;
    }
  }

  // FORCE SHOW: Use best match or create a general match
  if (forceShow && !bestMatch && resources.length > 0) {
    bestMatch = {
      id: 'general',
      name: '📚 Your Resources',
      color: '#F5A623',
      keywords: [],
      relatedUrls: []
    };
    bestScore = 10;
  }

  if (bestMatch && (bestScore > 0 || forceShow)) {
    console.log(`[TabListener] Match found: ${bestMatch.name} (score: ${bestScore})`);
    
    const projectResources = bestMatch.id === 'general' 
      ? resources.slice(0, 3) 
      : resources.filter(r => r.projectId === bestMatch.id).slice(0, 3);
    
    if (projectResources.length === 0) {
      // No resources for this project — show recent resources instead
      const recentResources = resources.sort((a, b) => 
        new Date(b.savedAt) - new Date(a.savedAt)
      ).slice(0, 3);
      
      if (recentResources.length > 0) {
        sendSidebarMessage(tabId, bestMatch, recentResources, resources.length);
      }
    } else {
      sendSidebarMessage(tabId, bestMatch, projectResources, 
        resources.filter(r => r.projectId === bestMatch.id).length);
    }
  } else {
    console.log('[TabListener] No match found for this URL');
  }
}

function sendSidebarMessage(tabId, project, resources, totalCount) {
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

  chrome.tabs.sendMessage(tabId, message, (response) => {
    if (chrome.runtime.lastError) {
      console.log('[TabListener] Send failed (content script may not be ready):', chrome.runtime.lastError.message);
    } else {
      console.log('[TabListener] Sidebar sent successfully');
      shownTabs[tabId] = true;
    }
  });
}
