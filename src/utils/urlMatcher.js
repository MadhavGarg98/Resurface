/**
 * Match a URL against a glob pattern
 * Returns TRUE if the URL matches the pattern
 */
export function matchUrl(url, pattern) {
  if (!url || !pattern) {
    console.log(`[URLMatcher] Invalid input — url: "${url}", pattern: "${pattern}"`);
    return false;
  }
  
  try {
    const normalizedUrl = url.toLowerCase().trim();
    const normalizedPattern = pattern.toLowerCase().trim();
    
    console.log(`[URLMatcher] Matching: "${normalizedUrl}" against "${normalizedPattern}"`);
    
    // Special case: pattern is just "*" — match everything
    if (normalizedPattern === '*') {
      console.log('[URLMatcher] Wildcard * — matches everything');
      return true;
    }
    
    // Special case: pattern matches the domain exactly
    if (normalizedUrl.includes(normalizedPattern)) {
      console.log('[URLMatcher] Simple includes match');
      return true;
    }
    
    // Parse the URL
    let urlObj;
    try {
      urlObj = new URL(normalizedUrl);
    } catch {
      // If URL parsing fails, do simple includes
      return normalizedUrl.includes(normalizedPattern);
    }
    
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;
    const fullPath = hostname + pathname;
    
    console.log(`[URLMatcher] Parsed URL — hostname: "${hostname}", pathname: "${pathname}"`);
    
    // Try glob matching
    const regexPattern = patternToRegex(normalizedPattern);
    console.log(`[URLMatcher] Regex pattern: ${regexPattern}`);
    
    const regex = new RegExp(regexPattern, 'i');
    
    // Test against hostname+pathname and full URL
    const matchesPath = regex.test(fullPath);
    const matchesUrl = regex.test(normalizedUrl);
    
    console.log(`[URLMatcher] Match result — path: ${matchesPath}, url: ${matchesUrl}`);
    
    return matchesPath || matchesUrl;
    
  } catch (error) {
    console.error('[URLMatcher] Error matching URL:', error);
    // Fallback: simple includes
    return url.toLowerCase().includes(pattern.toLowerCase());
  }
}

/**
 * Convert a glob pattern to regex
 */
function patternToRegex(pattern) {
  return pattern
    // Escape special regex characters
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // ** matches anything including /
    .replace(/\*\*/g, '___DOUBLE_STAR___')
    // * matches anything except /
    .replace(/\*/g, '[^/]*')
    // Restore ** 
    .replace(/___DOUBLE_STAR___/g, '.*');
}

// Export for testing
export { patternToRegex };
