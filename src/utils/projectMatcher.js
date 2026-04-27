import { getProjects, getResources } from './storage';

/**
 * Find the best matching project for a resource
 * Returns { projectId, confidence, isNew, matchReason }
 * HIGH confidence (>70) = use existing project
 * LOW confidence (<70) = should create new project
 */
export async function findMatchingProject(resource) {
  const projects = await getProjects();
  
  if (!projects || projects.length === 0) {
    return {
      projectId: null,
      confidence: 0,
      isNew: true,
      matchReason: 'No projects exist',
      suggestCreate: true,
      suggestedProject: generateProjectSuggestion(resource)
    };
  }

  const url = resource.url || '';
  const title = (resource.title || '').toLowerCase();
  const content = (resource.textContent || '').toLowerCase();
  
  let bestMatch = null;
  let bestScore = 0;
  let matchReason = '';
  
  // Extract domain from URL
  let domain = '';
  let baseDomain = '';
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace('www.', '');
    baseDomain = domain.split('.')[0]; // e.g., "wikipedia" from "wikipedia.org"
  } catch(e) {}

  console.log('[ProjectMatcher] Matching resource:', {
    title: title.substring(0, 50),
    domain: domain,
    baseDomain: baseDomain,
    url: url.substring(0, 50)
  });

  for (const project of projects) {
    if (project.archived) continue;
    
    let score = 0;
    let reasons = [];
    
    const projectName = (project.name || '').toLowerCase();
    const keywords = (project.keywords || []).map(k => k.toLowerCase());
    const relatedUrls = project.relatedUrls || [];
    
    // ==========================================
    // LAYER 1: Domain match (score: 0-40)
    // ==========================================
    for (const pattern of relatedUrls) {
      const cleanPattern = pattern.toLowerCase().replace(/\*/g, '').trim();
      
      if (cleanPattern && domain.includes(cleanPattern)) {
        score += 15; // Lowered to prevent over-matching on Wikipedia
        reasons.push(`URL pattern "${pattern}" matches domain "${domain}"`);
        break;
      }
      
      if (cleanPattern && url.toLowerCase().includes(cleanPattern)) {
        score += 10;
        reasons.push(`URL contains "${cleanPattern}"`);
        break;
      }
    }
    
    // Direct domain match (even if no relatedUrls set)
    if (baseDomain && (
      projectName.includes(baseDomain) || 
      baseDomain.includes(projectName)
    )) {
      score += 10;
      reasons.push(`Domain "${baseDomain}" matches project "${projectName}"`);
    }
    
    // ==========================================
    // LAYER 2: Keyword match (score: 0-30)
    // ==========================================
    let keywordMatches = 0;
    for (const keyword of keywords) {
      if (title.includes(keyword)) {
        keywordMatches += 3;
      }
      if (content.includes(keyword)) {
        keywordMatches += 2;
      }
      if (domain.includes(keyword)) {
        keywordMatches += 2;
      }
    }
    
    if (keywordMatches > 0) {
      score += Math.min(keywordMatches * 5, 30);
      reasons.push(`${keywordMatches} keyword matches found`);
    }
    
    // ==========================================
    // LAYER 3: Title/Name similarity (score: 0-20)
    // ==========================================
    const titleWords = title.split(/\s+/);
    const projectWords = projectName.split(/\s+/);
    
    let commonWords = 0;
    for (const word of titleWords) {
      if (word.length > 3 && projectWords.some(pw => pw.includes(word) || word.includes(pw))) {
        commonWords++;
      }
    }
    
    if (commonWords > 0) {
      score += commonWords * 5;
      reasons.push(`${commonWords} common words with project name`);
    }
    
    // ==========================================
    // LAYER 4: Previously saved to this project (score: +10)
    // ==========================================
    // Check if same URL was previously saved to this project
    try {
      const existingResources = await getResources(project.id);
      const sameUrl = existingResources.some(r => r.url === url);
      
      if (sameUrl) {
        score += 10;
        reasons.push('Same URL previously saved to this project');
      }
    } catch (e) {}
    
    // ==========================================
    // UPDATE BEST MATCH
    // ==========================================
    console.log(`[ProjectMatcher] Project "${project.name}": score=${score}, reasons=[${reasons.join(', ')}]`);
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = project;
      matchReason = reasons.join('; ');
    }
  }
  
  // ==========================================
  // DECISION
  // ==========================================
  if (bestMatch && bestScore >= 25) {
    // Good match found — use existing project
    console.log(`[ProjectMatcher] ✅ MATCHED: "${bestMatch.name}" (score: ${bestScore})`);
    return {
      projectId: bestMatch.id,
      confidence: Math.min(bestScore, 95),
      isNew: false,
      matchReason: matchReason,
      projectName: bestMatch.name,
      suggestCreate: false
    };
  }
  
  if (bestMatch && bestScore >= 10) {
    // Weak match — suggest but ask user
    console.log(`[ProjectMatcher] ⚠️ WEAK MATCH: "${bestMatch.name}" (score: ${bestScore})`);
    return {
      projectId: bestMatch.id,
      confidence: 40,
      isNew: false,
      matchReason: `Weak match: ${matchReason}`,
      projectName: bestMatch.name,
      suggestCreate: true,
      suggestedProject: generateProjectSuggestion(resource)
    };
  }
  
  // No match — suggest new project
  console.log('[ProjectMatcher] ❌ NO MATCH — suggesting new project');
  return {
    projectId: null,
    confidence: 0,
    isNew: true,
    matchReason: 'No matching project found',
    suggestCreate: true,
    suggestedProject: generateProjectSuggestion(resource)
  };
}

/**
 * Generate a smart project suggestion from the resource
 */
function generateProjectSuggestion(resource) {
  let domain = '';
  let baseDomain = '';
  let siteName = '';
  
  try {
    if (resource.url) {
      const urlObj = new URL(resource.url);
      domain = urlObj.hostname.replace('www.', '');
      baseDomain = domain.split('.')[0];
      // Capitalize: "wikipedia" → "Wikipedia"
      siteName = baseDomain.charAt(0).toUpperCase() + baseDomain.slice(1);
    }
  } catch(e) {}
  
  // Get keywords from title
  const titleWords = (resource.title || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['this', 'that', 'with', 'from', 'about', 'what', 'when', 'where'].includes(w))
    .slice(0, 5);
  
  // Get existing tags
  const tags = resource.tags || [];
  
  return {
    name: siteName || titleWords.slice(0, 3).join(' ') || 'New Project',
    keywords: [...new Set([...titleWords, ...tags, baseDomain, domain].filter(Boolean))].slice(0, 8),
    relatedUrls: domain ? [`${domain}/*`] : [],
    description: `Resources from ${siteName || 'various sources'}`,
    color: getRandomColor()
  };
}

function getRandomColor() {
  const colors = ['#F5A623', '#4CAF50', '#2196F3', '#9C27B0', '#E57373', '#FF9800', '#00BCD4', '#607D8B'];
  return colors[Math.floor(Math.random() * colors.length)];
}
/**
 * Legacy support for tabListener.js
 */
export async function matchProject(url, projects, resources) {
  const result = await findMatchingProject({ url });
  return result;
}
