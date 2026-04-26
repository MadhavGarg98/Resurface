/**
 * Match a URL against a glob pattern
 * 
 * Patterns support:
 * - Exact match: "github.com"
 * - Wildcard: "github.com/*"
 * - Path wildcard: "github.com/user/repo/*"
 * - Subdomain wildcard: "*.github.com"
 * 
 * @param {string} url - Full URL to test
 * @param {string} pattern - Glob pattern
 * @returns {boolean}
 */
export function matchUrl(url, pattern) {
  if (!url || !pattern) return false;
  
  // Normalize inputs
  const normalizedUrl = url.toLowerCase().trim();
  const normalizedPattern = pattern.toLowerCase().trim();
  
  // Extract hostname + path from URL (ignore protocol)
  let urlHostPath;
  try {
    const urlObj = new URL(normalizedUrl);
    urlHostPath = urlObj.hostname + urlObj.pathname;
    // Remove trailing slash for consistency
    if (urlHostPath.endsWith('/')) {
      urlHostPath = urlHostPath.slice(0, -1);
    }
  } catch {
    // If URL parsing fails, use raw string
    urlHostPath = normalizedUrl.replace(/^https?:\/\//, '');
  }
  
  // Convert glob pattern to regex
  const regexPattern = normalizedPattern
    // Escape special regex characters except *
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    // * matches anything except /
    .replace(/\*/g, '[^/]*')
    // ** matches anything including /
    .replace(/\[^\/\]\*\[^\/\]\*/g, '.*');
  
  const regex = new RegExp('^' + regexPattern + '$', 'i');
  
  return regex.test(urlHostPath) || 
         regex.test(normalizedUrl) || 
         normalizedUrl.includes(normalizedPattern);
}
