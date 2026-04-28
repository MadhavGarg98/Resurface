import { callLLM } from './llmClient.js';
import { getProjects } from './storage.js';

/**
 * Intelligent Categorizer v2
 * Determines if a resource should go to an existing project, a new project, or ask the user.
 */
export async function categorizeResource(resource, projects = null) {
  if (!projects) {
    projects = await getProjects();
  }
  
  // If no projects exist, we definitely want to suggest a new one
  if (!projects || projects.length === 0) {
    return await finalizeDecision({
      decision: 'CREATE',
      confidence: 100,
      projectId: null,
      reasoning: 'Initial project creation'
    }, resource);
  }
  
  const prompt = buildCategorizationPrompt(resource, projects);
  
  try {
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 500,
      temperature: 0.1
    });
    
    const classification = parseCategorizationResponse(result.text, projects);
    return await finalizeDecision(classification, resource);
    
  } catch (error) {
    console.error('[Categorizer] AI failed:', error);
    return { decision: 'ASK', confidence: 0, projectId: null };
  }
}

function buildCategorizationPrompt(resource, projects) {
  const projectList = projects.map(p => 
    `- ID: ${p.id}, Name: "${p.name}", Keywords: [${(p.keywords || []).join(', ')}]`
  ).join('\n');

  return `You are a precision AI librarian for the Resurface extension. 
TASK: Decide where this web resource belongs.

RESOURCE:
Title: "${resource.title}"
URL: ${resource.url}
Content Snippet: "${(resource.textContent || '').substring(0, 1000)}"

EXISTING PROJECTS:
${projectList}

DECISION RULES:
1. MATCH: ONLY if the resource clearly and directly belongs to an existing project (90%+ confidence).
2. CREATE: If no project matches, but you can confidently suggest a new, specific project name (e.g. "Mobile Technology").
3. ASK: If you are confused, there are multiple matches, or the confidence is below 90%.

MANDATORY: If you choose CREATE or ASK, you MUST provide a "suggestedNewProject" object with a specific name and 3-5 relevant keywords.

Return ONLY JSON:
{
  "decision": "MATCH" | "CREATE" | "ASK",
  "confidence": 0-100,
  "projectId": "matched_project_id_or_null",
  "reasoning": "Explain exactly why this matches or why a new project is needed",
  "suggestedResourceTitle": "A better, concise title for this resource (max 60 chars)",
  "suggestedNewProject": {
    "name": "Specific Name (NOT 'New Project', use something like 'Mobile Tech')",
    "keywords": ["tag1", "tag2", "tag3"],
    "description": "Short purpose"
  },
  "suggestedTags": ["tag1", "tag2"]
}`;
}

function parseCategorizationResponse(text, projects) {
  try {
    const jsonStr = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      decision: parsed.decision || 'ASK',
      confidence: parsed.confidence || 0,
      projectId: parsed.projectId,
      reasoning: parsed.reasoning || '',
      suggestedResourceTitle: parsed.suggestedResourceTitle || null,
      suggestedNewProject: parsed.suggestedNewProject,
      suggestedTags: parsed.suggestedTags || []
    };
  } catch (e) {
    return { decision: 'ASK', confidence: 0 };
  }
}

async function finalizeDecision(c, resource) {
  // Add safety buffer: if AI says MATCH but confidence < 90, switch to ASK
  if (c.decision === 'MATCH' && c.confidence < 90) {
    c.decision = 'ASK';
  }
  
  // If AI says CREATE but confidence < 85, switch to ASK
  if (c.decision === 'CREATE' && c.confidence < 85) {
    c.decision = 'ASK';
  }

  // MANDATORY FALLBACK: Ensure suggestedNewProject exists and has a VALID name
  if ((c.decision === 'ASK' || c.decision === 'CREATE')) {
    if (!c.suggestedNewProject || !c.suggestedNewProject.name || c.suggestedNewProject.name.length < 2) {
      console.log('[Categorizer] AI suggestion was weak/missing, generating fallback...');
      c.suggestedNewProject = await generateProjectSuggestion(resource);
    }
  }

  return c;
}

export async function generateProjectSuggestion(resource) {
  // Try AI first for a really good suggestion
  try {
    const prompt = `Suggest a specific project name (2-3 words) and 5 keywords for this:
    Title: "${resource.title}"
    Snippet: "${(resource.textContent || '').substring(0, 500)}"
    
    Return JSON: { "name": "...", "keywords": ["...", "..."] }`;
    
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 150
    });
    
    const parsed = JSON.parse(result.text.replace(/```json|```/g, '').trim());
    return {
      name: parsed.name || resource.title.substring(0, 20),
      keywords: parsed.keywords || [],
      description: `Resources related to ${parsed.name || resource.title}`,
      color: '#F5A623'
    };
  } catch (e) {
    // Basic fallback
    const words = (resource.title || '').split(' ');
    const name = words.slice(0, 3).join(' ') || 'New Topic';
    return {
      name: name.substring(0, 40),
      keywords: resource.tags || [],
      description: `Project for: ${name}`,
      color: '#F5A623'
    };
  }
}
