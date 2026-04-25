/**
 * Detects the type of content on the current page
 * @param {string} url - The current tab URL
 * @param {string} title - The page title
 * @returns {string} One of: 'article', 'documentation', 'video', 'pdf', 'image', 
 *                            'code', 'social', 'search', 'design', 'spreadsheet',
 *                            'qa', 'homepage', 'unknown'
 */
function detectPageType(url, title) {
  // Check URL patterns (order matters - more specific first):
  
  // 1. File extension checks
  if (url.match(/\.(pdf)$/i)) return 'pdf';
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i)) return 'image';
  if (url.match(/\.(mp4|webm|mov|avi)$/i)) return 'video';
  
  // 2. Known platform checks
  if (url.includes('youtube.com/watch') || url.includes('youtu.be/')) return 'video';
  if (url.includes('vimeo.com')) return 'video';
  if (url.includes('github.com')) {
    return url.includes('/blob/') ? 'code' : 'repo';
  }
  if (url.includes('gitlab.com')) return url.includes('/blob/') ? 'code' : 'repo';
  if (url.includes('stackoverflow.com/questions/')) return 'qa';
  if (url.includes('stackexchange.com')) return 'qa';
  if (url.includes('quora.com')) return 'qa';
  if (url.includes('docs.google.com/spreadsheets')) return 'spreadsheet';
  if (url.includes('docs.google.com/document')) return 'document';
  if (url.includes('docs.google.com/presentation')) return 'document';
  if (url.includes('figma.com/file')) return 'design';
  if (url.includes('figma.com')) return 'design';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'social';
  if (url.includes('reddit.com')) return 'social';
  if (url.includes('linkedin.com')) return 'social';
  if (url.includes('instagram.com')) return 'social';
  if (url.includes('notion.so')) return 'document';
  if (url.includes('medium.com')) return 'article';
  if (url.includes('dev.to')) return 'article';
  if (url.includes('wikipedia.org')) return 'article';
  if (url.includes('docs.microsoft.com')) return 'documentation';
  if (url.includes('developer.mozilla.org')) return 'documentation';
  
  // 3. Search engine detection
  if (url.includes('google.com/search') || 
      url.includes('bing.com/search') || 
      url.includes('duckduckgo.com')) {
    return 'search';
  }
  
  // 4. Default
  return 'unknown';
}

/**
 * Determines if the page is primarily an article/long-form content
 * Run this in the page context via chrome.scripting.executeScript
 */
function isArticlePage() {
  // Check for article-specific elements
  const article = document.querySelector('article');
  const mainContent = document.querySelector('main, [role="main"]');
  
  // Check meta tags
  const ogType = document.querySelector('meta[property="og:type"]')?.content;
  if (ogType === 'article') return true;
  
  // Check for article schema
  const schemaArticle = document.querySelector('[itemtype*="Article"]');
  if (schemaArticle) return true;
  
  // Check word count in main content area
  const content = article || mainContent || document.body;
  const wordCount = (content?.innerText || '').split(/\s+/).length;
  
  return wordCount > 500;
}

export { detectPageType, isArticlePage };
