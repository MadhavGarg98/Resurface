import { getProjects } from '../utils/storage.js';
import { matchUrl } from '../utils/urlMatcher.js';

// Track tabs where sidebar is already shown to avoid duplicates
const shownTabs = new Set();

/**
 * Initialize tab listener
 * Called from background/index.js
 */
export function init() {
  // Listen for tab updates (page loads)
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Only trigger when page has finished loading
    if (changeInfo.status !== 'complete') return;
    
    // Skip chrome:// and extension pages
    if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return;
    }
    
    // Check if we already showed sidebar for this tab
    if (shownTabs.has(tabId)) return;
    
    await checkAndShowSidebar(tabId, tab.url);
  });
  
  // Clean up when tab is closed
  chrome.tabs.onRemoved.addListener((tabId) => {
    shownTabs.delete(tabId);
  });
  
  // Clean up when tab navigates to a different domain
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      // URL changed — remove from shown set so sidebar can appear again if needed
      shownTabs.delete(tabId);
    }
  });
  
  console.log('[TabListener] Initialized');
}

/**
 * Check if current URL matches any project and show sidebar
 */
async function checkAndShowSidebar(tabId, url) {
  try {
    const projects = await getProjects();
    
    if (!projects || projects.length === 0) return;
    
    // Find projects that match this URL
    const matchingProjects = [];
    
    for (const project of projects) {
      if (project.archived) continue;
      if (!project.relatedUrls || project.relatedUrls.length === 0) continue;
      
      // Check if URL matches any of the project's related URLs
      const isMatch = project.relatedUrls.some(pattern => {
        try {
          return matchUrl(url, pattern);
        } catch (e) {
          console.warn(`URL matching error for pattern "${pattern}":`, e);
          return false;
        }
      });
      
      if (isMatch) {
        matchingProjects.push(project);
      }
    }
    
    if (matchingProjects.length === 0) return;
    
    // Get the best matching project (first match, or most specific)
    const bestProject = matchingProjects[0];
    
    // Get top resources for this project
    const { getResources } = await import('../utils/storage.js');
    const resources = await getResources(bestProject.id);
    
    if (!resources || resources.length === 0) return;
    
    // Sort by access count (most accessed first) and take top 3
    const topResources = resources
      .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, 3);
    
    // Send message to content script to show sidebar
    chrome.tabs.sendMessage(tabId, {
      action: 'SHOW_SIDEBAR',
      data: {
        project: bestProject,
        resources: topResources,
        totalResources: resources.length,
        unreadCount: resources.filter(r => r.readStatus === 'unread').length
      }
    }).then(() => {
      shownTabs.add(tabId);
      console.log(`[TabListener] Sidebar shown for tab ${tabId} — project "${bestProject.name}"`);
    }).catch(err => {
      // Content script might not be loaded yet — that's okay
      console.log(`[TabListener] Could not show sidebar (content script not ready):`, err.message);
    });
    
  } catch (error) {
    console.error('[TabListener] Error:', error);
  }
}

/**
 * Force show sidebar (called from popup/dashboard when user clicks "Show Sidebar")
 */
export async function forceShowSidebar(tabId) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    shownTabs.delete(tab.id);
    await checkAndShowSidebar(tab.id, tab.url);
  }
}
