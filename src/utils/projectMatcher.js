import { getProjects } from './storage.js';
import { callLLM } from './llmClient.js';

/**
 * AI-POWERED SEMANTIC PROJECT MATCHER v4
 * 
 * Key fixes in v4:
 *   - Content aggregator domains (wikipedia, youtube, github, etc.) are EXCLUDED
 *     from URL pattern matching. "wikipedia.org/*" on a project does NOT mean every
 *     Wikipedia article belongs to that project.
 *   - AI fallback when rate-limited always caps confidence at 40 → forces popup
 *   - Stricter AI prompt with explicit "DO NOT" rules
 */

// Content aggregator domains — the domain alone tells us NOTHING about the topic
const GENERIC_DOMAINS = [
  'wikipedia.org', 'en.wikipedia.org',
  'youtube.com', 'youtu.be',
  'github.com', 'gitlab.com',
  'medium.com', 'dev.to',
  'reddit.com', 'twitter.com', 'x.com',
  'stackoverflow.com', 'stackexchange.com',
  'quora.com', 'linkedin.com',
  'docs.google.com', 'drive.google.com',
  'notion.so', 'figma.com',
  'amazon.com', 'ebay.com'
];

/**
 * Check if a domain is a generic content aggregator
 */
function isGenericDomain(domain) {
  const d = domain.toLowerCase();
  return GENERIC_DOMAINS.some(gd => d === gd || d.endsWith('.' + gd));
}

/**
 * Find the best matching project for a resource.
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
      suggestedProject: await generateProjectSuggestion(resource)
    };
  }

  // Step 1: Fast local pre-filter (domain/URL matching)
  const localMatches = fastLocalMatch(resource, projects);
  const bestLocal = localMatches[0];

  // Only skip AI if local score is 90+ (specific URL match, NOT generic domain)
  if (bestLocal && bestLocal.score >= 90) {
    console.log(`[ProjectMatcher] ⚡ Exact URL match: "${bestLocal.projectName}" (${bestLocal.score}%)`);
    return {
      projectId: bestLocal.projectId,
      confidence: bestLocal.score,
      isNew: false,
      matchReason: bestLocal.matchReason,
      projectName: bestLocal.projectName,
      suggestCreate: false
    };
  }

  // Step 2: ALWAYS run AI semantic matching for accuracy
  console.log('[ProjectMatcher] Running AI semantic matching...');
  try {
    const aiResult = await aiSemanticMatch(resource, projects, localMatches);
    console.log('[ProjectMatcher] AI result:', {
      projectName: aiResult.projectName,
      confidence: aiResult.confidence
    });
    return aiResult;
  } catch (error) {
    console.error('[ProjectMatcher] AI matching failed:', error);
    
    // CRITICAL: When AI fails, NEVER auto-assign. Cap confidence at 40 → forces popup.
    if (bestLocal && bestLocal.score >= 30) {
      return {
        projectId: bestLocal.projectId,
        confidence: Math.min(bestLocal.score, 40), // CAP at 40 — always show popup
        isNew: false,
        matchReason: bestLocal.matchReason + ' (unverified — AI unavailable)',
        projectName: bestLocal.projectName,
        suggestCreate: true
      };
    }
    
    return {
      projectId: null,
      confidence: 0,
      isNew: true,
      matchReason: 'AI matching failed, no strong local match',
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource)
    };
  }
}

/**
 * Fast local matching based on URL patterns and exact keywords.
 * 
 * IMPORTANT: Generic content aggregator domains (wikipedia.org, youtube.com, etc.)
 * are EXCLUDED from URL matching because the domain tells us nothing about the topic.
 * "Indian Cuisine" project having "wikipedia.org/*" should NOT match a Wikipedia
 * article about "Artificial Intelligence in Healthcare".
 */
function fastLocalMatch(resource, projects) {
  const url = resource.url || '';
  const title = (resource.title || '').toLowerCase();
  
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch(e) {}
  
  const isGeneric = isGenericDomain(domain);
  const matches = [];
  
  for (const project of projects) {
    if (project.archived) continue;
    
    let score = 0;
    let reasons = [];
    
    // URL pattern match — BUT skip for generic domains
    if (!isGeneric) {
      const relatedUrls = project.relatedUrls || [];
      for (const pattern of relatedUrls) {
        const clean = pattern.toLowerCase().replace(/\*/g, '').trim();
        // Skip generic domain patterns
        if (clean && clean.length > 3 && !GENERIC_DOMAINS.some(gd => clean.includes(gd))) {
          if (domain.includes(clean) || url.toLowerCase().includes(clean)) {
            score += 40;
            reasons.push('URL pattern match');
            break;
          }
        }
      }
    }
    
    // Exact keyword matches in title (medium signal)
    const keywords = project.keywords || [];
    let keywordHits = 0;
    for (const kw of keywords) {
      if (kw.length < 3) continue;
      if (title.includes(kw.toLowerCase())) {
        keywordHits++;
        score += 10;
      }
    }
    if (keywordHits > 0) {
      reasons.push(`${keywordHits} keyword(s) in title`);
    }
    
    if (score > 0) {
      matches.push({
        projectId: project.id,
        projectName: project.name,
        score: Math.min(score, 90),
        matchReason: reasons.join(', '),
        projectKeywords: project.keywords
      });
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
}

/**
 * AI-powered semantic matching.
 * The prompt is STRICT about not matching on weak/vague connections.
 */
async function aiSemanticMatch(resource, projects, localMatches) {
  
  const projectList = projects
    .filter(p => !p.archived)
    .map(p => ({
      id: p.id,
      name: p.name,
      keywords: p.keywords || []
    }));
  
  // Build local match hints (but warn AI they may be wrong)
  const localHints = localMatches.slice(0, 3).map(m => 
    `- "${m.projectName}" (local score: ${m.score}%, reason: ${m.matchReason})`
  ).join('\n');
  
  const prompt = `You are matching a saved web resource to the CORRECT project.

CRITICAL RULES:
1. Only match if the resource's MAIN TOPIC clearly belongs to the project.
2. If unsure, set confidence LOW (<40) and set noGoodMatch to true.
3. NEVER match just because both items come from the same website (e.g. Wikipedia).

DO NOT match based on:
- Same website (e.g., two Wikipedia articles about DIFFERENT topics are NOT related)
- Minor/vague keyword overlap
- Broad category connections (e.g., "healthcare" ≠ "language and culture")

DO match based on:
- Clear topic relationship (e.g., "Food" → "Indian Cuisine" because cuisine IS food)
- Direct subject overlap (e.g., "Python tutorial" → "Programming")

RESOURCE:
Title: "${resource.title || 'Untitled'}"
URL: ${resource.url || 'N/A'}
Content Preview: "${(resource.textContent || '').substring(0, 600)}"

AVAILABLE PROJECTS:
${projectList.map(p => `- ID: "${p.id}", Name: "${p.name}", Keywords: [${p.keywords.join(', ')}]`).join('\n')}

${localHints ? `LOCAL HINTS (may be WRONG — verify semantically):\n${localHints}` : ''}

Return ONLY valid JSON:
{
  "bestMatch": {
    "projectId": "id or null if no match",
    "projectName": "name or null",
    "confidence": 0-100,
    "reasoning": "Explain WHY this topic belongs (or doesn't) to the project"
  },
  "alternatives": [],
  "noGoodMatch": true,
  "suggestedTags": ["tag1", "tag2"]
}`;

  const result = await callLLM({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 500,
    temperature: 0.1
  });
  
  const parsed = parseAIResponse(result.text);
  
  console.log('[ProjectMatcher] AI decision:', {
    bestMatch: parsed.bestMatch?.projectName,
    confidence: parsed.bestMatch?.confidence,
    noGoodMatch: parsed.noGoodMatch,
    reasoning: parsed.bestMatch?.reasoning
  });
  
  // If AI explicitly says no good match, respect that
  if (parsed.noGoodMatch) {
    return {
      projectId: null,
      confidence: 0,
      isNew: true,
      matchReason: parsed.bestMatch?.reasoning || 'AI found no good match',
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource),
      alternatives: parsed.alternatives || []
    };
  }
  
  const confidence = parsed.bestMatch?.confidence || 0;
  const projectId = parsed.bestMatch?.projectId || null;
  
  if (confidence >= 75 && projectId) {
    return {
      projectId,
      confidence,
      isNew: false,
      matchReason: parsed.bestMatch.reasoning,
      projectName: parsed.bestMatch.projectName,
      suggestCreate: false,
      suggestedTags: parsed.suggestedTags || [],
      alternatives: parsed.alternatives || []
    };
  } else if (confidence >= 40 && projectId) {
    return {
      projectId,
      confidence,
      isNew: false,
      matchReason: parsed.bestMatch.reasoning,
      projectName: parsed.bestMatch.projectName,
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource),
      suggestedTags: parsed.suggestedTags || [],
      alternatives: parsed.alternatives || []
    };
  } else {
    return {
      projectId: null,
      confidence: 0,
      isNew: true,
      matchReason: parsed.bestMatch?.reasoning || 'No semantic match found',
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource),
      alternatives: parsed.alternatives || []
    };
  }
}

/**
 * Parse AI response safely
 */
function parseAIResponse(text) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      bestMatch: parsed.bestMatch || { projectId: null, projectName: null, confidence: 0, reasoning: '' },
      alternatives: parsed.alternatives || [],
      noGoodMatch: parsed.noGoodMatch || false,
      suggestedTags: parsed.suggestedTags || []
    };
  } catch (e) {
    console.error('[ProjectMatcher] Failed to parse AI response:', e);
    return {
      bestMatch: { projectId: null, projectName: null, confidence: 0, reasoning: 'Parse error' },
      alternatives: [],
      noGoodMatch: true,
      suggestedTags: []
    };
  }
}

/**
 * Get all project matches with scores (for popup display).
 * Uses cheap local matching only — does NOT call AI again.
 */
export async function getAllProjectMatches(resource) {
  const projects = await getProjects();
  if (!projects || projects.length === 0) return [];
  
  const localMatches = fastLocalMatch(resource, projects);
  return localMatches.map(m => ({
    projectId: m.projectId,
    projectName: m.projectName,
    score: m.score,
    matchReason: m.matchReason
  }));
}

/**
 * Generate project suggestion using AI
 */
export async function generateProjectSuggestion(resource) {
  try {
    const prompt = `Based on this web resource, suggest a project name and keywords.

Resource Title: "${resource.title || 'Untitled'}"
Content: "${(resource.textContent || '').substring(0, 500)}"
URL: ${resource.url || 'N/A'}

Suggest a descriptive project name (2-4 words) and 4-6 relevant keywords.
The name should be broad enough to include similar future resources.
Good examples: "Indian Cuisine", "Web Development", "Machine Learning Research", "European History"

Return ONLY JSON:
{
  "name": "Project Name Here",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
  "description": "Brief one-line description"
}`;

    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 200,
      temperature: 0.3
    });
    
    const parsed = JSON.parse(result.text.replace(/```json|```/g, '').trim());
    
    return {
      name: parsed.name || 'New Project',
      keywords: parsed.keywords || [],
      description: parsed.description || '',
      color: getRandomColor(),
      relatedUrls: getSpecificUrls(resource.url)
    };
  } catch (e) {
    const words = (resource.title || '').split(' ').slice(0, 3);
    return {
      name: words.join(' ') || 'New Project',
      keywords: words,
      description: '',
      color: getRandomColor(),
      relatedUrls: getSpecificUrls(resource.url)
    };
  }
}

/**
 * Get relatedUrls — but NEVER for generic content platforms.
 * "wikipedia.org/*" is useless. Only specific domains are meaningful.
 */
function getSpecificUrls(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    if (isGenericDomain(domain)) {
      return []; // Don't suggest generic domains
    }
    return [`${domain}/*`];
  } catch {
    return [];
  }
}

function getRandomColor() {
  const colors = ['#F5A623', '#4CAF50', '#2196F3', '#9C27B0', '#E57373', '#FF9800', '#00BCD4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Legacy support
export async function matchProject(url, projects, resources) {
  const result = await findMatchingProject({ url });
  return result;
}
