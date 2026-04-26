/**
 * Save Decision Matrix:
 * ┌──────────────────────┬───────────────────┬──────────────┬──────────┐
 * │ Situation            │ Saved As          │ AI Summary?  │ Type     │
 * ├──────────────────────┼───────────────────┼──────────────┼──────────┤
 * │ Selected < 200 chars │ Text + context    │ No           │ text     │
 * │ Selected 200-2000    │ Text + 1-liner    │ Yes          │ text     │
 * │ Selected 2000-5000   │ Text + sum+bullet │ Yes          │ text     │
 * │ Selected > 5000      │ Truncated + both  │ Yes          │ text     │
 * ├──────────────────────┼───────────────────┼──────────────┼──────────┤
 * │ Article page         │ Article content   │ Yes (>500ch) │ page     │
 * │ Documentation        │ Doc content       │ Yes (>500ch) │ page     │
 * │ Video/YouTube        │ Title + link      │ No           │ link     │
 * │ PDF file             │ URL + metadata    │ No           │ link     │
 * │ Image file           │ Image URL         │ No           │ link     │
 * │ Code/GitHub          │ Code + context    │ No           │ link     │
 * │ Social media         │ Post text         │ No           │ link     │
 * │ Design/Figma         │ File link         │ No           │ link     │
 * │ Search results       │ Query context     │ No           │ link     │
 * │ Q&A (Stack Overflow) │ Question + answer │ Yes (>200ch) │ page     │
 * │ Small/empty page     │ Link only         │ No           │ link     │
 * └──────────────────────┴───────────────────┴──────────────┴──────────┘
 */

import { v4 as uuidv4 } from 'uuid';
import { saveResource } from '../utils/storage.js';
import { detectPageType } from '../utils/pageTypeDetector.js';
import { generateSummary, generateBulletSummary } from '../utils/summarizer.js';
import { categorizeResource } from '../utils/categorizer.js';
import { extractDeadline } from '../utils/deadlineParser.js';

// Main save handler — called when user presses Ctrl+Shift+S
async function handleSaveCommand() {
  try {
    // ==========================================
    // STEP 1: Get current tab context
    // ==========================================
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('Step 1: Got tab context', tab?.url);
    
    if (!tab || !tab.url) {
      showNotification('Cannot Save', 'No active page detected.');
      return;
    }
    
    // Don't save extension pages or chrome:// URLs
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      showNotification('Cannot Save', 'Cannot save browser system pages.');
      return;
    }
    
    // ==========================================
    // STEP 2: Detect page type
    // ==========================================
    const pageType = detectPageType(tab.url, tab.title);
    
    // ==========================================
    // STEP 3: Check for selected text
    // ==========================================
    const [selectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return null;
        return {
          text: selection.toString(),
          length: selection.toString().length,
          hasSelection: true
        };
      }
    });
    
    const hasSelectedText = selectionResult?.result?.hasSelection || false;
    const selectedText = selectionResult?.result?.text || '';
    const selectionLength = selectionResult?.result?.length || 0;
    console.log('Step 2: Selection check', { hasSelectedText, selectionLength });
    
    // ==========================================
    // STEP 4: DECISION — What to save?
    // ==========================================
    
    let resource;
    
    if (hasSelectedText && selectedText.trim()) {
      // ==========================================
      // CASE A: USER HAS SELECTED TEXT
      // Selected text always takes priority
      // ==========================================
      resource = await saveSelectedText(tab, selectedText, selectionLength, pageType);
      
    } else {
      // ==========================================
      // CASE B: NO SELECTION — Save based on page type
      // ==========================================
      resource = await saveByPageType(tab, pageType);
    }
    
    // ==========================================
    // STEP 5: ENRICH WITH AI (UPDATED)
    // ==========================================
    
    if (shouldSummarize(resource)) {
      // Show "analyzing" notification
      chrome.notifications.create('save-progress', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
        title: 'Resurface',
        message: 'AI is analyzing your content...',
        priority: 0
      });
      
      try {
        // Determine content type for summarization
        let contentType = 'auto';
        
        if (resource.type === 'text') {
          // Selected text
          const textLen = (resource.textContent || '').length;
          if (textLen < 200) contentType = 'none';
          else if (textLen < 2000) contentType = 'short';
          else contentType = 'detailed';
        } else if (resource.type === 'page') {
          // Full webpage
          if (resource.isArticle || resource.sourcePageType === 'article') {
            contentType = 'article';
          } else {
            contentType = 'fullpage';
          }
        } else {
          // Link or other
          contentType = 'short';
        }
        
        // Generate the appropriate summary
        resource.summary = await generateSummary(resource.textContent, { contentType });
        
        // Generate bullets for longer content
        if (shouldGenerateBullets(resource)) {
          const bulletCount = resource.type === 'page' ? 5 : 3;
          resource.bulletSummary = await generateBulletSummary(resource.textContent, bulletCount);
        }
        
        // Track AI provider status
        resource.aiProvider = 'groq'; 
        
      } catch (error) {
        console.warn('AI summarization failed:', error);
        // Fallback: use first 200 chars as summary
        resource.summary = (resource.textContent || resource.title || '').substring(0, 200).trim();
        if (resource.textContent && resource.textContent.length > 200) {
          resource.summary += '...';
        }
        resource.bulletSummary = null;
      }
    }
    
    // Clear progress notification
    chrome.notifications.clear('save-progress');
    
    // ==========================================
    // STEP 6: CATEGORIZE
    // ==========================================
    try {
      const categorization = await categorizeResource(resource.title, resource.textContent);
      if (categorization) {
        resource.projectId = categorization.projectId;
        resource.tags = categorization.tags || [];
      }
    } catch (error) {
      console.warn('Categorization failed:', error);
      resource.projectId = null;
      resource.tags = [];
    }
    
    // ==========================================
    // STEP 7: PARSE DEADLINES
    // ==========================================
    try {
      resource.deadlineMentioned = await extractDeadline(resource.textContent);
    } catch (error) {
      console.warn('Deadline parsing failed:', error);
      resource.deadlineMentioned = null;
    }
    
    // ==========================================
    // STEP 8: FINALIZE & SAVE
    // ==========================================
    console.log('Step 3: Building resource object');
    resource.id = uuidv4();
    resource.savedAt = new Date().toISOString();
    resource.lastAccessed = null;
    resource.accessCount = 0;
    resource.readStatus = 'unread';
    
    console.log('Step 4: Saving to storage...', resource);
    await saveResource(resource);
    console.log('Step 5: Saved successfully!');
    
    // Clear progress notification if it exists
    chrome.notifications.clear('save-progress');
    
    // Show success notification
    const summaryPreview = resource.summary 
      ? resource.summary.substring(0, 100) + (resource.summary.length > 100 ? '...' : '')
      : '';
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: resource.sourceFavicon || chrome.runtime.getURL('icons/icon-128.png'),
      title: 'Saved to Resurface',
      message: summaryPreview || resource.title || 'Resource saved!',
      priority: 1
    });

    // Also show in-page toast for absolute certainty
    await showInPageToast(tab.id, 'Saved to Resurface', summaryPreview || resource.title);
    
  } catch (error) {
    console.error('Save failed:', error);
    showNotification('Save Failed', error.message || 'Something went wrong. Try again.');
    
    // Also show in-page toast for failure
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab) {
      await showInPageToast(tab.id, 'Save Failed', error.message || 'Something went wrong', 'error');
    }
  }
}

// ==========================================
// CASE A: SAVE SELECTED TEXT
// ==========================================
async function saveSelectedText(tab, selectedText, selectionLength, pageType) {
  
  const cleanText = selectedText.trim();
  
  // Determine summary needs based on text length
  let needsSummary = false;
  let needsBullets = false;
  let textToSave = cleanText;
  
  if (selectionLength <= 200) {
    // Short text: no summary needed, the text IS the summary
    needsSummary = false;
    needsBullets = false;
  } else if (selectionLength <= 2000) {
    // Medium text: 1-sentence summary
    needsSummary = true;
    needsBullets = false;
    textToSave = cleanText;
  } else if (selectionLength <= 5000) {
    // Long text: summary + bullets
    needsSummary = true;
    needsBullets = true;
    textToSave = cleanText;
  } else {
    // Very long text: truncate, still summarize
    needsSummary = true;
    needsBullets = true;
    textToSave = cleanText.substring(0, 5000);
  }
  
  // Get source page metadata
  const [metadataResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      pageTitle: document.title,
      favicon: document.querySelector('link[rel="icon"]')?.href || 
               document.querySelector('link[rel="shortcut icon"]')?.href || '',
      contextBefore: (() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return '';
        const range = sel.getRangeAt(0).cloneRange();
        range.setStart(range.startContainer, Math.max(0, range.startOffset - 30));
        return range.toString().substring(0, 30);
      })(),
      contextAfter: (() => {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return '';
        const range = sel.getRangeAt(0).cloneRange();
        range.setEnd(range.endContainer, range.endOffset + 30);
        return range.toString().slice(-30);
      })()
    })
  });
  
  const meta = metadataResult?.result || {};
  
  return {
    type: 'text',
    title: `Selection from: ${meta.pageTitle || tab.title}`,
    url: tab.url,
    textContent: textToSave,
    textLength: selectionLength,
    needsSummary,
    needsBullets,
    sourceTitle: meta.pageTitle || tab.title,
    sourceFavicon: meta.favicon || tab.favIconUrl,
    sourcePageType: pageType,
    selectionContext: {
      before: meta.contextBefore || '',
      after: meta.contextAfter || ''
    }
  };
}

// ==========================================
// CASE B: SAVE BY PAGE TYPE
// ==========================================
async function saveByPageType(tab, pageType) {
  
  // Extract page content (smart extraction)
  const [extractionResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (type) => {
      // Helper function for extraction logic
      function getSmartContent() {
        // Try article first
        const article = document.querySelector('article');
        if (article && article.innerText.trim().length > 100) {
          return { text: article.innerText.substring(0, 5000), isArticle: true };
        }
        
        // Try main/content areas
        const selectors = ['main', '[role="main"]', '.content', '#content', '.post-content', '.article-content'];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim().length > 100) {
            return { text: el.innerText.substring(0, 5000), isArticle: true };
          }
        }
        
        // Fallback: meta description
        const meta = document.querySelector('meta[name="description"]')?.content ||
                    document.querySelector('meta[property="og:description"]')?.content || '';
        if (meta) {
          return { text: meta, isArticle: false };
        }
        
        // Last resort
        return { text: document.body?.innerText?.substring(0, 3000) || document.title, isArticle: false };
      }
      
      const content = getSmartContent();
      const favicon = document.querySelector('link[rel="icon"]')?.href ||
                     document.querySelector('link[rel="shortcut icon"]')?.href || '';
      
      return {
        text: content.text,
        isArticle: content.isArticle,
        favicon,
        title: document.querySelector('meta[property="og:title"]')?.content ||
               document.querySelector('h1')?.innerText ||
               document.title
      };
    },
    args: [pageType]
  });
  
  const extracted = extractionResult?.result || {};
  const pageText = extracted.text || tab.title;
  const textLength = pageText.length;
  const isArticle = extracted.isArticle || false;
  
  // Determine resource type and summary needs
  let resourceType, needsSummary, needsBullets;
  
  switch (pageType) {
    case 'pdf':
      resourceType = 'link';
      needsSummary = false;
      needsBullets = false;
      break;
    
    case 'image':
      resourceType = 'link';
      needsSummary = false;
      needsBullets = false;
      break;
    
    case 'video':
      resourceType = 'link';
      needsSummary = false;
      needsBullets = false;
      break;
    
    case 'code':
      resourceType = 'link';
      needsSummary = false;
      needsBullets = false;
      break;
    
    case 'repo':
      resourceType = 'link';
      needsSummary = textLength > 200;
      needsBullets = false;
      break;
    
    case 'social':
    case 'search':
      resourceType = 'link';
      needsSummary = false;
      needsBullets = false;
      break;
    
    case 'design':
    case 'spreadsheet':
    case 'document':
      resourceType = 'link';
      needsSummary = false;
      needsBullets = false;
      break;
    
    case 'article':
    case 'documentation':
      resourceType = 'page';
      needsSummary = textLength > 500;
      needsBullets = textLength > 2000 && isArticle;
      break;
    
    default:
      // Unknown page type — save as page if there's substantial content
      resourceType = textLength > 500 && isArticle ? 'page' : 'link';
      needsSummary = textLength > 500;
      needsBullets = textLength > 2000 && isArticle;
      break;
  }
  
  return {
    type: resourceType,
    title: extracted.title || tab.title,
    url: tab.url,
    textContent: pageText.substring(0, 5000),
    textLength,
    needsSummary,
    needsBullets,
    sourceFavicon: extracted.favicon || tab.favIconUrl,
    sourcePageType: pageType,
    isArticle,
    readingTimeMinutes: Math.ceil(textLength / 1000) // rough estimate
  };
}

// ==========================================
// HELPER: Should we summarize this resource?
// ==========================================
function shouldSummarize(resource) {
  // Never summarize these types
  const noSummaryTypes = ['image', 'video', 'pdf'];
  if (noSummaryTypes.includes(resource.sourcePageType)) return false;
  if (resource.fileType && noSummaryTypes.includes(resource.fileType)) return false;
  
  // Don't summarize if text is too short
  const textLength = (resource.textContent || '').length;
  if (textLength < 200) return false;
  
  // Use the needsSummary flag if set
  if (resource.needsSummary !== undefined) return resource.needsSummary;
  
  return textLength > 200;
}

// ==========================================
// HELPER: Should we generate bullet summaries?
// ==========================================
function shouldGenerateBullets(resource) {
  if (resource.needsBullets !== undefined) return resource.needsBullets;
  return (resource.textContent || '').length > 2000;
}

// ==========================================
// HELPER: Show notification
// ==========================================
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/icon-128.png'),
    title: title,
    message: message,
    priority: 1
  });
}

// ==========================================
// HELPER: Show in-page toast confirmation
// ==========================================
async function showInPageToast(tabId, title, message, type = 'success') {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (t, m, ty) => {
        // Simple inline version of the toast logic to ensure it always works
        const existing = document.getElementById('resurface-inpage-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'resurface-inpage-toast';
        const color = ty === 'success' ? '#F5A623' : '#E57373';
        
        Object.assign(toast.style, {
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: '2147483647',
          background: '#FFFDF7',
          border: '1px solid #F0EBD8',
          borderLeft: `4px solid ${color}`,
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '280px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          transform: 'translateX(120%)',
          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          pointerEvents: 'auto'
        });

        toast.innerHTML = `
          <div style="width: 32px; height: 32px; background: ${color}15; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m9 11 3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 800; color: #1A1A1A; font-size: 14px;">${t}</div>
            <div style="color: #6B6B6B; font-size: 12px;">${m}</div>
          </div>
        `;

        document.body.appendChild(toast);
        requestAnimationFrame(() => toast.style.transform = 'translateX(0)');
        
        setTimeout(() => {
          toast.style.transform = 'translateX(120%)';
          setTimeout(() => toast.remove(), 400);
        }, 4000);
      },
      args: [title, message, type]
    });
  } catch (err) {
    console.warn('Could not show in-page toast:', err);
  }
}

export { handleSaveCommand };
