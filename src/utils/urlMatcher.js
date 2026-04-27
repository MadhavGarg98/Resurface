/**
 * Match a URL against a glob pattern
 * Very permissive fuzzy matching for proactively surfacing resources.
 */
export function matchUrl(url, pattern) {
  if (!url || !pattern) return false;
  
  const nUrl = url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const nPattern = pattern.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\*$/, '').replace(/\/$/, '');
  
  // 1. Direct inclusion (fuzzy)
  if (nUrl.includes(nPattern) || nPattern.includes(nUrl)) {
    return true;
  }
  
  // 2. Fallback to regex
  try {
    const regexStr = nPattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(regexStr, 'i');
    return regex.test(nUrl);
  } catch (e) {
    return false;
  }
}
