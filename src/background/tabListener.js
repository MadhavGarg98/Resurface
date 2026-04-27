import { getProjects } from '../utils/storage.js';
import { matchUrl } from '../utils/urlMatcher.js';

// Track tabs where sidebar is already shown to avoid duplicates
const shownTabs = new Set();

export function init() {
  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    if (!tab.url || tab.url.startsWith('chrome://')) return;
    
    console.log(`[TabListener] Page complete: ${tab.url}`);
    checkAndShowSidebar(tabId, tab.url);
  });
  
  chrome.tabs.onRemoved.addListener((tabId) => {
    shownTabs.delete(tabId);
  });

  // HEARTBEAT: Listen for content scripts asking for a sidebar
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'CHECK_FOR_SIDEBAR' && sender.tab) {
      console.log(`[TabListener] Heartbeat from tab ${sender.tab.id}: ${sender.tab.url}`);
      checkAndShowSidebar(sender.tab.id, sender.tab.url);
      sendResponse({ received: true });
    }
    return true;
  });

  console.log('[TabListener] Initialized');
}

async function checkAndShowSidebar(tabId, url) {
  try {
    const projects = await getProjects();
    console.log(`[TabListener] Checking ${projects.length} projects for matches...`);
    
    let bestProject = null;
    for (const project of projects) {
      if (project.archived) continue;
      
      const patterns = project.relatedUrls || [];
      console.log(`[TabListener] Testing project "${project.name}" against patterns:`, patterns);
      
      const isMatch = patterns.some(p => matchUrl(url, p));
      if (isMatch) {
        console.log(`[TabListener] MATCH FOUND: "${project.name}" matches "${url}"`);
        bestProject = project;
        break;
      }
    }
    
    if (!bestProject) {
      console.log(`[TabListener] No match found for ${url}`);
      return;
    }
    
    // Get resources
    const { getResources } = await import('../utils/storage.js');
    const resources = await getResources(bestProject.id);
    const topResources = (resources || [])
      .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, 3);
    
    console.log(`[TabListener] Injecting sidebar for "${bestProject.name}" with ${resources.length} total resources`);
    
    // Inject
    chrome.scripting.executeScript({
      target: { tabId },
      func: (project, resources, totalCount) => {
        if (window.__resurfaceShowSidebar) {
          window.__resurfaceShowSidebar({ project, resources, totalResources: totalCount });
        } else {
          console.warn('Resurface: window.__resurfaceShowSidebar not found in page context');
        }
      },
      args: [bestProject, topResources, resources.length]
    }).catch(err => {
      console.error(`[TabListener] Scripting error:`, err);
    });

    shownTabs.add(tabId);
  } catch (error) {
    console.error('[TabListener] Error in checkAndShowSidebar:', error);
  }
}

export async function forceShowSidebar(tabId) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) {
    shownTabs.delete(tab.id);
    await checkAndShowSidebar(tab.id, tab.url);
  }
}
