/**
 * Extract meaningful content from the current page
 * Runs in page context via chrome.scripting.executeScript
 * @param {string} pageType - Type detected by pageTypeDetector
 * @returns {object} { text, metadata }
 */
function extractPageContent(pageType = 'unknown') {
  
  // ==========================================
  // HELPER: Get article content
  // ==========================================
  function getArticleContent() {
    // Priority 1: <article> tag
    const article = document.querySelector('article');
    if (article && article.innerText.trim().length > 100) {
      return article.innerText;
    }
    
    // Priority 2: Schema.org article markup
    const schemaArticle = document.querySelector('[itemtype*="Article"] [itemprop="articleBody"]');
    if (schemaArticle && schemaArticle.innerText.trim().length > 100) {
      return schemaArticle.innerText;
    }
    
    // Priority 3: Common content selectors
    const contentSelectors = [
      'main', '[role="main"]', '.post-content', '.article-content',
      '.entry-content', '.content', '#content', '.post', '.article',
      '.blog-post', '.story-body', '.article-body'
    ];
    
    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element && element.innerText.trim().length > 100) {
        return element.innerText;
      }
    }
    
    return null;
  }
  
  // ==========================================
  // HELPER: Get meta description
  // ==========================================
  function getMetaDescription() {
    const metaDesc = document.querySelector('meta[name="description"]')?.content ||
                     document.querySelector('meta[property="og:description"]')?.content ||
                     '';
    return metaDesc;
  }
  
  // ==========================================
  // HELPER: Get page title
  // ==========================================
  function getSmartTitle() {
    const ogTitle = document.querySelector('meta[property="og:title"]')?.content;
    const h1 = document.querySelector('h1')?.innerText;
    return ogTitle || h1 || document.title || 'Untitled';
  }
  
  // ==========================================
  // HELPER: Get favicon
  // ==========================================
  function getFavicon() {
    const faviconLink = document.querySelector('link[rel="icon"]')?.href ||
                       document.querySelector('link[rel="shortcut icon"]')?.href;
    if (faviconLink && faviconLink.startsWith('http')) return faviconLink;
    return `${window.location.origin}/favicon.ico`;
  }
  
  // ==========================================
  // MAIN EXTRACTION LOGIC BY PAGE TYPE
  // ==========================================
  
  let text = '';
  let metadata = {};
  
  switch (pageType) {
    
    case 'article':
    case 'documentation':
    case 'unknown':
      // Try article extraction first
      const articleContent = getArticleContent();
      if (articleContent) {
        text = articleContent.substring(0, 5000);
      } else {
        // Fallback: meta description + first meaningful content
        const meta = getMetaDescription();
        const bodyText = document.body?.innerText?.substring(0, 3000) || '';
        text = meta ? `${meta}\n\n${bodyText}` : bodyText;
      }
      metadata = {
        contentLength: text.length,
        isArticle: !!articleContent,
        readingTimeMinutes: Math.ceil(text.split(/\s+/).length / 200)
      };
      break;
    
    case 'video':
      // YouTube/Video: get description
      const videoDesc = document.querySelector('#description-inline-expander, [class*="description"]')?.innerText ||
                       getMetaDescription();
      text = videoDesc || `Video: ${document.title}`;
      metadata = {
        videoTitle: getSmartTitle(),
        channel: document.querySelector('[class*="channel-name"], .ytd-channel-name')?.innerText || '',
        isVideo: true
      };
      break;
    
    case 'pdf':
      // PDF in Chrome's viewer
      const pdfText = document.querySelector('embed') ? 'PDF document' : 
                     document.body?.innerText?.substring(0, 1000) || 'PDF document';
      text = pdfText;
      metadata = { isPDF: true };
      break;
    
    case 'image':
      // Direct image URL
      text = `Image: ${getSmartTitle()}`;
      metadata = { 
        isImage: true,
        imageUrl: window.location.href,
        altText: document.querySelector('img')?.alt || ''
      };
      break;
    
    case 'code':
    case 'repo':
      // GitHub/GitLab files
      const codeElement = document.querySelector('.blob-wrapper, .highlight, pre, .file-content');
      const repoDesc = document.querySelector('.f4.my-3, [class*="description"]')?.innerText || '';
      text = codeElement ? codeElement.innerText.substring(0, 5000) : 
             repoDesc ? repoDesc : `Repository: ${getSmartTitle()}`;
      metadata = {
        isCode: true,
        language: document.querySelector('[class*="lang"]')?.innerText || '',
        repoName: getSmartTitle()
      };
      break;
    
    case 'social':
      // Social media: save post content
      const postContent = document.querySelector('[data-testid="tweetText"], [class*="post-content"], [class*="tweet-text"]')?.innerText ||
                         getMetaDescription();
      text = postContent || getSmartTitle();
      metadata = { isSocial: true };
      break;
    
    case 'qa':
      // Stack Overflow: question + top answer
      const question = document.querySelector('.question-hyperlink, #question-header h1')?.innerText || '';
      const questionBody = document.querySelector('.question .s-prose, #question .post-text')?.innerText || '';
      const topAnswer = document.querySelector('.answer .s-prose, .answer .post-text')?.innerText || '';
      text = `${question}\n\n${questionBody}\n\nTop Answer:\n${topAnswer}`.substring(0, 5000);
      metadata = { isQA: true, questionTitle: question };
      break;
    
    case 'design':
      // Figma: save file context
      text = `Design File: ${getSmartTitle()}`;
      metadata = { isDesign: true, fileName: getSmartTitle() };
      break;
    
    case 'spreadsheet':
      // Google Sheets
      text = `Spreadsheet: ${getSmartTitle()}`;
      metadata = { isSpreadsheet: true, sheetName: getSmartTitle() };
      break;
    
    case 'search':
      // Search results
      const searchQuery = new URLSearchParams(window.location.search).get('q') || '';
      text = `Search: ${searchQuery || getSmartTitle()}`;
      metadata = { isSearch: true, searchQuery };
      break;
    
    default:
      // Generic fallback
      text = getMetaDescription() || document.body?.innerText?.substring(0, 3000) || getSmartTitle();
      metadata = {};
      break;
  }
  
  return {
    text: text.trim(),
    title: getSmartTitle(),
    favicon: getFavicon(),
    url: window.location.href,
    pageType,
    ...metadata
  };
}

export { extractPageContent };
