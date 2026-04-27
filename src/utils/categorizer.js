import { callLLM } from './llmClient.js';
import { getProjects } from './storage.js';

/**
 * Categorize a resource to the correct project
 * 
 * @param {Object} resource - The resource being saved { title, textContent, url, tags }
 * @param {Array} projects - Available projects
 * @returns {Object} {
 *   projectId: string | null,
 *   confidence: number (0-100),
 *   suggestedTags: string[],
 *   matchedKeywords: string[],
 *   reasoning: string,
 *   alternatives: [{ projectId, projectName, confidence }],
 *   shouldAskUser: boolean,
 *   suggestedNewProject: { name, keywords, color } | null
 * }
 */
export async function categorizeResource(resource, projects = null) {
  
  // Get projects if not provided
  if (!projects) {
    projects = await getProjects();
  }
  
  // If no projects exist, suggest creating one
  if (!projects || projects.length === 0) {
    return {
      projectId: null,
      confidence: 0,
      suggestedTags: [],
      matchedKeywords: [],
      reasoning: 'No projects exist yet',
      alternatives: [],
      shouldAskUser: true,
      suggestedNewProject: await generateProjectSuggestion(resource)
    };
  }
  
  // Build the prompt for AI classification
  const prompt = buildClassificationPrompt(resource, projects);
  
  try {
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 400,
      temperature: 0.1 // Low temperature for consistent results
    });
    
    // Parse the AI response
    const classification = parseClassificationResponse(result.text, projects);
    
    // Validate the classification
    return validateClassification(classification, resource, projects);
    
  } catch (error) {
    console.error('[Categorizer] AI classification failed:', error);
    // Fallback: return low confidence, ask user
    return {
      projectId: null,
      confidence: 0,
      suggestedTags: [],
      matchedKeywords: [],
      reasoning: 'AI classification failed, needs manual assignment',
      alternatives: projects.slice(0, 3).map(p => ({
        projectId: p.id,
        projectName: p.name,
        confidence: 0
      })),
      shouldAskUser: true,
      suggestedNewProject: null
    };
  }
}

/**
 * Build the classification prompt for the LLM
 */
function buildClassificationPrompt(resource, projects) {
  const projectList = projects.map((p, i) => {
    return `Project ${i + 1}:
  ID: "${p.id}"
  Name: "${p.name}"
  Keywords: [${(p.keywords || []).join(', ')}]
  Related URLs: [${(p.relatedUrls || []).join(', ')}]
  Description: "${p.description || 'No description'}"`;
  }).join('\n\n');

  return `You are a precise resource classifier. Your job is to match a saved resource to the CORRECT project with high accuracy.

RESOURCE TO CLASSIFY:
Title: "${resource.title || 'Untitled'}"
URL: ${resource.url || 'N/A'}
Content: "${(resource.textContent || '').substring(0, 1500)}"
Existing Tags: [${(resource.tags || []).join(', ')}]

AVAILABLE PROJECTS:
${projectList}

INSTRUCTIONS:
1. Carefully analyze the resource content and title
2. Compare against each project's keywords, URLs, and name
3. Find the BEST matching project — ONLY if there's a clear match
4. If multiple projects could match, rank them by relevance
5. If no project clearly matches, say so honestly

CRITICAL RULES:
- A resource about "cricket" should ONLY go to a cricket-related project
- A resource about "football" should NOT go to a cricket project
- If keywords overlap (e.g., "sports" matches multiple), look deeper at the actual content
- If the resource is about a SPECIFIC topic, prefer the most specific project
- Do NOT force a match if none exists — it's better to ask the user

Return ONLY a JSON object (no markdown, no extra text):
{
  "bestMatch": {
    "projectId": "id of best project or null",
    "projectName": "name of best project",
    "confidence": 85,
    "reasoning": "Brief explanation of why this matches"
  },
  "alternatives": [
    { "projectId": "id", "projectName": "name", "confidence": 60 }
  ],
  "suggestedTags": ["tag1", "tag2", "tag3"],
  "matchedKeywords": ["keyword1", "keyword2"],
  "noGoodMatch": false,
  "suggestNewProject": false,
  "newProjectSuggestion": {
    "name": "Suggested project name",
    "keywords": ["keyword1", "keyword2"],
    "description": "Brief description"
  }
}`;
}

/**
 * Parse and validate the AI response
 */
function parseClassificationResponse(responseText, projects) {
  try {
    // Clean the response — remove markdown code blocks if present
    let jsonStr = responseText.trim();
    
    // Remove ```json and ``` markers
    jsonStr = jsonStr.replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
    // Remove any leading/trailing single backticks
    jsonStr = jsonStr.replace(/^`|`$/g, '');
    
    const parsed = JSON.parse(jsonStr);
    
    return {
      projectId: parsed.bestMatch?.projectId || null,
      projectName: parsed.bestMatch?.projectName || '',
      confidence: parsed.bestMatch?.confidence || 0,
      reasoning: parsed.bestMatch?.reasoning || '',
      alternatives: (parsed.alternatives || []).map(alt => ({
        projectId: alt.projectId,
        projectName: alt.projectName,
        confidence: alt.confidence || 0
      })),
      suggestedTags: parsed.suggestedTags || [],
      matchedKeywords: parsed.matchedKeywords || [],
      noGoodMatch: parsed.noGoodMatch || false,
      shouldAskUser: false, // Will be determined by validateClassification
      suggestedNewProject: parsed.suggestNewProject ? {
        name: parsed.newProjectSuggestion?.name || '',
        keywords: parsed.newProjectSuggestion?.keywords || [],
        description: parsed.newProjectSuggestion?.description || ''
      } : null
    };
    
  } catch (error) {
    console.error('[Categorizer] Failed to parse AI response:', error);
    console.error('[Categorizer] Raw response:', responseText);
    
    return {
      projectId: null,
      confidence: 0,
      reasoning: 'Failed to parse classification',
      alternatives: [],
      suggestedTags: [],
      matchedKeywords: [],
      noGoodMatch: true,
      shouldAskUser: true,
      suggestedNewProject: null
    };
  }
}

/**
 * Validate classification and determine if we should ask the user
 */
function validateClassification(classification, resource, projects) {
  
  // Find the matched project
  const matchedProject = projects.find(p => p.id === classification.projectId);
  
  // ==========================================
  // RULE 1: Confidence too low → Ask user
  // ==========================================
  if (classification.confidence < 60) {
    classification.shouldAskUser = true;
    classification.reasoning += ' (Low confidence — needs confirmation)';
    return classification;
  }
  
  // ==========================================
  // RULE 2: Very high confidence → Auto-assign
  // ==========================================
  if (classification.confidence >= 90 && matchedProject) {
    classification.shouldAskUser = false;
    return classification;
  }
  
  // ==========================================
  // RULE 3: Medium confidence (60-90%) → Quick confirm
  // ==========================================
  if (classification.confidence >= 60 && classification.confidence < 90) {
    // Check if there's a close second choice
    if (classification.alternatives.length > 0 && 
        classification.alternatives[0].confidence >= classification.confidence - 15) {
      // Close competition — ask user
      classification.shouldAskUser = true;
      classification.reasoning += ' (Multiple close matches — needs user choice)';
    } else {
      // Clear winner but not 100% sure — quick confirm
      classification.shouldAskUser = true;
      classification.reasoning += ' (Good match — quick confirmation recommended)';
    }
    return classification;
  }
  
  // ==========================================
  // RULE 4: No good match → Offer to create project
  // ==========================================
  if (classification.noGoodMatch || !matchedProject) {
    classification.shouldAskUser = true;
    classification.suggestedNewProject = classification.suggestedNewProject || 
      generateBasicSuggestion(resource);
    return classification;
  }
  
  // Default: ask user if unsure
  classification.shouldAskUser = true;
  return classification;
}

/**
 * Generate a project suggestion from resource content
 */
export async function generateProjectSuggestion(resource) {
  const prompt = `Based on this resource, suggest a project name and keywords:

Title: "${resource.title || 'Untitled'}"
Content: "${(resource.textContent || '').substring(0, 1000)}"

Return JSON:
{
  "name": "Suggested project name (short, 2-4 words)",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "description": "One sentence describing the project scope",
  "color": "#hexcolor"
}`;

  try {
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 200,
      temperature: 0.3
    });
    
    const jsonStr = result.text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonStr);
    
    return {
      name: parsed.name || 'New Project',
      keywords: parsed.keywords || [],
      description: parsed.description || '',
      color: parsed.color || '#F5A623'
    };
  } catch (error) {
    return {
      name: resource.title?.substring(0, 30) || 'New Project',
      keywords: resource.tags || [],
      description: '',
      color: '#F5A623'
    };
  }
}

function generateBasicSuggestion(resource) {
  const words = (resource.title || '').split(' ');
  const name = words.slice(0, 3).join(' ') || 'New Project';
  
  return {
    name: name.substring(0, 40),
    keywords: resource.tags || [],
    description: `Project for: ${name}`,
    color: '#F5A623'
  };
}
