import { updateResource, saveProject, getResources, getProjects, getSettings } from '../utils/storage.js';
import { callLLM } from '../utils/llmClient.js';

export const init = () => {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, data } = message;

    if (action === 'CONFIRM_CLASSIFICATION') {
      handleConfirm(data).then(() => sendResponse({ success: true }));
      return true;
    }

    if (action === 'DISMISS_CLASSIFICATION') {
      handleDismiss(data).then(() => sendResponse({ success: true }));
      return true;
    }

    if (action === 'CREATE_PROJECT_AND_ASSIGN') {
      handleCreateAndAssign(data).then(() => sendResponse({ success: true }));
      return true;
    }

    if (action === 'CHAT_QUERY') {
      handleChatQuery(data.query, data.history || [])
        .then(result => sendResponse(result))
        .catch(err => sendResponse({ error: err.message }));
      return true;
    }
  });
};

async function handleConfirm({ resourceId, projectId, tags }) {
  await updateResource(resourceId, {
    projectId,
    tags: [...new Set([...(tags || [])])],
    _needsConfirmation: false,
    _pendingClassification: null
  });
  
  // Clear pending classification from storage
  await chrome.storage.local.remove(['_pendingClassification']);
}

async function handleDismiss({ resourceId }) {
  await updateResource(resourceId, {
    _needsConfirmation: false,
    _pendingClassification: null
  });
  
  await chrome.storage.local.remove(['_pendingClassification']);
}

async function handleCreateAndAssign({ name, keywords, resourceId, tags, relatedUrls, color }) {
  const project = {
    name,
    keywords,
    relatedUrls: relatedUrls || [],
    color: color || '#F5A623',
    createdAt: new Date().toISOString()
  };
  
  const savedProject = await saveProject(project);
  
  await updateResource(resourceId, {
    projectId: savedProject.id,
    tags: [...new Set([...(tags || [])])],
    _needsConfirmation: false,
    _pendingClassification: null
  });
  
  await chrome.storage.local.remove(['_pendingClassification']);
}

// ============================================
// CHAT BOT HANDLER
// ============================================

function localSearch(query, resources) {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter(w => w.length > 2);
  
  return resources.map(r => {
    let score = 0;
    const title = (r.title || '').toLowerCase();
    const summary = (r.summary || '').toLowerCase();
    const tags = (r.tags || []).map(t => t.toLowerCase());
    const text = (r.textContent || '').toLowerCase().substring(0, 500);
    
    // Exact phrase match (highest)
    if (title.includes(q)) score += 20;
    if (summary.includes(q)) score += 10;
    
    // Word-level matching
    for (const word of words) {
      if (title.includes(word)) score += 6;
      if (summary.includes(word)) score += 3;
      if (tags.some(t => t.includes(word))) score += 5;
      if (text.includes(word)) score += 1;
    }
    
    return { ...r, _score: score };
  })
  .filter(r => r._score > 0)
  .sort((a, b) => b._score - a._score);
}

async function handleChatQuery(query, history) {
  const startTime = Date.now();
  
  try {
    const [resources, projects, settings] = await Promise.all([
      getResources(),
      getProjects(),
      getSettings()
    ]);
    
    // Build project lookup
    const projectMap = {};
    for (const p of projects) {
      projectMap[p.id] = p.name;
    }
    
    // Fast local search
    const matches = localSearch(query, resources);
    const topMatches = matches.slice(0, 8);
    
    // Check if LLM is available
    const hasLLM = settings.groqApiKey || settings.geminiApiKey;
    
    if (!hasLLM) {
      // No API keys — return formatted local results
      return buildLocalResponse(query, topMatches, projectMap, resources.length);
    }
    
    // Build context for LLM
    const resourceContext = topMatches.map((r, i) => {
      const proj = r.projectId ? projectMap[r.projectId] : 'Uncategorized';
      const saved = r.savedAt ? new Date(r.savedAt).toLocaleDateString() : 'Unknown';
      return `[${i + 1}] "${r.title || 'Untitled'}" — Project: ${proj} — Tags: ${(r.tags || []).join(', ') || 'none'} — Saved: ${saved}\n    Summary: ${(r.summary || r.textContent || '').substring(0, 150)}`;
    }).join('\n\n');
    
    const statsContext = `Total saved: ${resources.length} resources across ${projects.length} projects.`;
    
    // Build conversation messages
    const messages = [
      {
        role: 'system',
        content: `You are a helpful assistant for Resurface, a bookmarking/knowledge management app. The user has ${resources.length} saved resources across ${projects.length} projects. Answer their questions about their saved library. Be concise (2-4 sentences max). If you reference resources, mention them by their title. If no matches are relevant, say so honestly. Don't make up resources that aren't listed. Use a friendly, helpful tone.`
      }
    ];
    
    // Add last 3 history messages for context
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      messages.push({ role: h.role, content: h.content });
    }
    
    // Add the current query with search context
    let userPrompt = query;
    if (topMatches.length > 0) {
      userPrompt = `User query: "${query}"\n\n${statsContext}\n\nMost relevant saved resources:\n${resourceContext}\n\nRespond to the user's query based on these resources. Be specific — reference actual titles.`;
    } else {
      userPrompt = `User query: "${query}"\n\n${statsContext}\n\nNo saved resources matched this query. Let the user know and suggest they try different keywords or save some relevant pages first.`;
    }
    
    messages.push({ role: 'user', content: userPrompt });
    
    const result = await callLLM({
      messages,
      maxTokens: 300,
      temperature: 0.4
    });
    
    const elapsed = Date.now() - startTime;
    
    return {
      text: result.text.trim(),
      matchCount: topMatches.length,
      totalResources: resources.length,
      provider: result.provider,
      elapsed,
      matches: topMatches.slice(0, 3).map(r => ({
        title: r.title,
        url: r.url,
        project: r.projectId ? projectMap[r.projectId] : null
      }))
    };
    
  } catch (error) {
    console.error('[ChatBot] Error:', error);
    
    // Fallback: try local-only response
    try {
      const resources = await getResources();
      const projects = await getProjects();
      const projectMap = {};
      for (const p of projects) projectMap[p.id] = p.name;
      
      const matches = localSearch(query, resources);
      return buildLocalResponse(query, matches.slice(0, 5), projectMap, resources.length);
    } catch (fallbackErr) {
      return { 
        text: "Sorry, I'm having trouble accessing your library right now. Please try again in a moment.",
        error: true 
      };
    }
  }
}

function buildLocalResponse(query, matches, projectMap, totalCount) {
  if (matches.length === 0) {
    return {
      text: `I couldn't find any resources matching "${query}" in your library of ${totalCount} items. Try different keywords or save some relevant pages first!`,
      matchCount: 0,
      totalResources: totalCount,
      provider: 'local',
      matches: []
    };
  }
  
  let text = `Found ${matches.length} resource${matches.length > 1 ? 's' : ''} matching your query:\n\n`;
  matches.slice(0, 5).forEach((r, i) => {
    const proj = r.projectId ? projectMap[r.projectId] : null;
    text += `**${i + 1}. ${r.title || 'Untitled'}**`;
    if (proj) text += ` (${proj})`;
    text += `\n${(r.summary || '').substring(0, 80)}${(r.summary || '').length > 80 ? '...' : ''}\n\n`;
  });
  
  if (!totalCount || totalCount === 0) {
    text += `\n💡 _Tip: Add API keys in Settings for smarter AI-powered search._`;
  }
  
  return {
    text,
    matchCount: matches.length,
    totalResources: totalCount,
    provider: 'local',
    matches: matches.slice(0, 3).map(r => ({
      title: r.title,
      url: r.url,
      project: r.projectId ? projectMap[r.projectId] : null
    }))
  };
}
