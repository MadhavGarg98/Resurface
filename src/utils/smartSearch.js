import { callLLM } from './llmClient.js';
import { getResources } from './storage.js';

export async function smartSearch(query, resources) {
  // 1. Local search logic
  const q = query.toLowerCase();
  
  const scoredResources = resources.map(res => {
    let score = 0;
    if (res.title.toLowerCase().includes(q)) score += 10;
    if (res.summary && res.summary.toLowerCase().includes(q)) score += 5;
    if (res.tags && res.tags.some(tag => tag.toLowerCase().includes(q))) score += 8;
    if (res.textContent && res.textContent.toLowerCase().includes(q)) score += 2;
    return { ...res, score };
  }).filter(res => res.score > 0);

  // 2. Check for NL query
  const nlWords = ['what', 'how', 'find', 'search', 'where', 'when', 'who', 'which', 'article', 'link', 'saved', 'week', 'month', 'yesterday', 'today'];
  const isNL = nlWords.some(word => q.includes(word));

  if (!isNL || resources.length === 0) {
    return scoredResources.sort((a, b) => b.score - a.score);
  }

  // 3. LLM Enhanced Search
  try {
    const resourceSnapshots = resources.map(r => ({
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      tags: r.tags || [],
      savedAt: r.savedAt
    })).slice(0, 20); // Keep prompt size reasonable

    const prompt = `A user asked: "${query}". Which of these saved resources best match? Return ONLY a JSON object with a list of IDs in order of relevance: { "ids": ["id1", "id2"], "explanation": "brief reason" }. 

Resources:
${JSON.stringify(resourceSnapshots, null, 2)}`;

    const response = await callLLM({
      messages: [{ role: 'system', content: 'You are a semantic search engine for a bookmarking app.' }, { role: 'user', content: prompt }],
      maxTokens: 200,
      temperature: 0.1
    });

    let rawText = response.text.trim();
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
    }

    const { ids } = JSON.parse(rawText);
    
    const llmResults = ids
      .map(id => resources.find(r => r.id === id))
      .filter(Boolean);
    
    const localIds = new Set(llmResults.map(r => r.id));
    const otherLocalResults = scoredResources
      .filter(r => !localIds.has(r.id))
      .sort((a, b) => b.score - a.score);

    return [...llmResults, ...otherLocalResults];

  } catch (error) {
    console.warn('Smart search LLM failed, using local results:', error);
    return scoredResources.sort((a, b) => b.score - a.score);
  }
}

export async function performSmartSearch(query) {
  const resources = await getResources();
  return smartSearch(query, resources);
}
