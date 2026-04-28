import { getProjects } from './storage.js';
import { callLLM } from './llmClient.js';

/**
 * AI-POWERED SEMANTIC PROJECT MATCHER
 * Uses LLM to understand topic relationships, not just string matching
 */

/**
 * Find the best matching project for a resource
 * Uses fast local matching first, then AI for ambiguous cases
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
  
  // If we have a VERY strong local match, use it immediately (save API call)
  const bestLocal = localMatches[0];
  if (bestLocal && bestLocal.score >= 80) {
    console.log(`[ProjectMatcher] Fast match: "${bestLocal.projectName}" (${bestLocal.score}%)`);
    return {
      projectId: bestLocal.projectId,
      confidence: bestLocal.score,
      isNew: false,
      matchReason: bestLocal.matchReason,
      projectName: bestLocal.projectName,
      suggestCreate: false
    };
  }
  
  // Step 2: AI semantic matching for better accuracy
  try {
    const aiResult = await aiSemanticMatch(resource, projects, localMatches);
    return aiResult;
  } catch (error) {
    console.error('[ProjectMatcher] AI matching failed, using local results:', error);
    // Fallback to local matching
    if (bestLocal && bestLocal.score >= 30) {
      return {
        projectId: bestLocal.projectId,
        confidence: bestLocal.score,
        isNew: false,
        matchReason: bestLocal.matchReason,
        projectName: bestLocal.projectName,
        suggestCreate: bestLocal.score < 60
      };
    }
    
    // No good match
    return {
      projectId: null,
      confidence: 0,
      isNew: true,
      matchReason: 'No matching project found',
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource)
    };
  }
}

/**
 * Fast local matching based on URL and exact keywords
 * Returns scored projects sorted by score
 */
function fastLocalMatch(resource, projects) {
  const url = resource.url || '';
  const title = (resource.title || '').toLowerCase();
  const content = (resource.textContent || '').toLowerCase();
  
  let domain = '';
  try {
    domain = new URL(url).hostname.replace('www.', '');
  } catch(e) {}
  
  const matches = [];
  
  for (const project of projects) {
    if (project.archived) continue;
    
    let score = 0;
    let reasons = [];
    
    // URL pattern match (strong signal)
    const relatedUrls = project.relatedUrls || [];
    for (const pattern of relatedUrls) {
      const clean = pattern.toLowerCase().replace(/\*/g, '').trim();
      if (clean && (domain.includes(clean) || url.toLowerCase().includes(clean))) {
        score += 40;
        reasons.push('URL pattern match');
        break;
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
 * AI-powered semantic matching
 * Asks the LLM to determine which project a resource belongs to
 */
async function aiSemanticMatch(resource, projects, localMatches) {
  
  // Build a concise project list for the AI
  const projectList = projects
    .filter(p => !p.archived)
    .map(p => ({
      id: p.id,
      name: p.name,
      keywords: p.keywords || []
    }));
  
  // Build local match hints
  const localHints = localMatches.slice(0, 3).map(m => 
    `- "${m.projectName}" (local score: ${m.score}%, reason: ${m.matchReason})`
  ).join('\n');
  
  const prompt = `You are matching a saved web resource to the CORRECT project. Think carefully about TOPIC RELATIONSHIPS — not just exact word matches.

RESOURCE:
Title: "${resource.title || 'Untitled'}"
URL: ${resource.url || 'N/A'}
Content Preview: "${(resource.textContent || '').substring(0, 600)}"

AVAILABLE PROJECTS:
${projectList.map(p => `- ID: "${p.id}", Name: "${p.name}", Keywords: [${p.keywords.join(', ')}]`).join('\n')}

LOCAL MATCH HINTS (from basic URL/keyword matching):
${localHints || 'No strong local matches'}

YOUR TASK:
1. Consider the MEANING and TOPIC of the resource
2. Consider the MEANING of each project (from name + keywords)
3. Find the BEST semantic match — even if words are different but topics are related
   - Example: "Food" article → "Indian Cuisine" project (food ↔ cuisine are related)
   - Example: "Python tutorial" → "Programming" project (Python ↔ programming)
   - Example: "Champions League" → "Sports" project (Champions League ↔ sports)
4. If multiple projects could match, rank them and explain why
5. If no project matches well, be honest

Return ONLY JSON (no markdown):
{
  "bestMatch": {
    "projectId": "id of best project or null",
    "projectName": "name of best project",
    "confidence": 85,
    "reasoning": "Explain the semantic connection. E.g., 'Food is a core topic within Indian Cuisine' or 'Champions League is a sports tournament, matching the Sports project'"
  },
  "alternatives": [
    { "projectId": "id", "projectName": "name", "confidence": 60, "reasoning": "..." }
  ],
  "noGoodMatch": false,
  "suggestedTags": ["tag1", "tag2", "tag3"]
}`;

  const result = await callLLM({
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 500,
    temperature: 0.1
  });
  
  // Parse response
  const parsed = parseAIResponse(result.text);
  
  console.log('[ProjectMatcher] AI decision:', {
    bestMatch: parsed.bestMatch?.projectName,
    confidence: parsed.bestMatch?.confidence,
    reasoning: parsed.bestMatch?.reasoning
  });
  
  // Determine action based on confidence
  const confidence = parsed.bestMatch?.confidence || 0;
  const projectId = parsed.bestMatch?.projectId || null;
  
  if (confidence >= 70 && projectId) {
    // Good match - auto assign
    return {
      projectId: projectId,
      confidence: confidence,
      isNew: false,
      matchReason: parsed.bestMatch.reasoning,
      projectName: parsed.bestMatch.projectName,
      suggestCreate: false,
      suggestedTags: parsed.suggestedTags || [],
      alternatives: parsed.alternatives || []
    };
  } else if (confidence >= 40 && projectId) {
    // Weak match - suggest but ask user
    return {
      projectId: projectId,
      confidence: confidence,
      isNew: false,
      matchReason: parsed.bestMatch.reasoning,
      projectName: parsed.bestMatch.projectName,
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource),
      suggestedTags: parsed.suggestedTags || [],
      alternatives: parsed.alternatives || []
    };
  } else {
    // No match - suggest new project
    return {
      projectId: null,
      confidence: 0,
      isNew: true,
      matchReason: 'No semantic match found',
      suggestCreate: true,
      suggestedProject: await generateProjectSuggestion(resource)
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
 * Get all project matches with scores (for popup display)
 */
export async function getAllProjectMatches(resource) {
  const result = await findMatchingProject(resource);
  
  const matches = [];
  
  if (result.projectId && result.confidence > 0) {
    matches.push({
      projectId: result.projectId,
      projectName: result.projectName,
      score: result.confidence,
      matchReason: result.matchReason
    });
  }
  
  if (result.alternatives) {
    for (const alt of result.alternatives) {
      if (alt.projectId !== result.projectId) {
        matches.push({
          projectId: alt.projectId,
          projectName: alt.projectName,
          score: alt.confidence,
          matchReason: alt.reasoning
        });
      }
    }
  }
  
  return matches.sort((a, b) => b.score - a.score);
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
      relatedUrls: getDomainUrls(resource.url)
    };
  } catch (e) {
    // Fallback
    const words = (resource.title || '').split(' ').slice(0, 3);
    return {
      name: words.join(' ') || 'New Project',
      keywords: words,
      description: '',
      color: getRandomColor(),
      relatedUrls: getDomainUrls(resource.url)
    };
  }
}

function getRandomColor() {
  const colors = ['#F5A623', '#4CAF50', '#2196F3', '#9C27B0', '#E57373', '#FF9800', '#00BCD4'];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getDomainUrls(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return [`${domain}/*`];
  } catch {
    return [];
  }
}

// Legacy support
export async function matchProject(url, projects, resources) {
  const result = await findMatchingProject({ url });
  return result;
}
