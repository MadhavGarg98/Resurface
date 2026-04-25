import { callLLM } from './llmClient.js';
import { getProjects } from './storage.js';

export async function categorizeResource(title, text) {
  try {
    const projects = await getProjects();
    // Assuming archived status isn't implemented yet, we just take all projects
    const activeProjects = projects;

    if (activeProjects.length === 0) {
      return null;
    }

    const projectList = activeProjects.map(p => 
      `- Project Name: ${p.name || 'Unnamed'}, keywords=[${(p.tags || []).join(', ')}], urls=[${(p.urls || []).join(', ')}] (ID: ${p.id})`
    ).join('\n');

    const truncatedText = text.substring(0, 1000);

    const prompt = `You are categorizing a saved resource. Here are the available projects:
${projectList}

Resource Title: ${title}
Resource Content: ${truncatedText}

Which project does this belong to? Return ONLY a JSON object with:
{ "projectId": "uuid of best match", "confidence": 0.95, "suggestedTags": ["tag1", "tag2"] }
If no project matches, set projectId to null and confidence to 0. Do not wrap in markdown blocks, just return raw JSON.`;

    const response = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 150,
      temperature: 0.1
    });

    let rawText = response.text.trim();
    
    // Handle potential markdown wrapping
    if (rawText.startsWith('```')) {
      rawText = rawText.replace(/^```(json)?\n/, '').replace(/\n```$/, '');
    }

    const parsed = JSON.parse(rawText);

    if (parsed.confidence > 0.6) {
      return {
        projectId: parsed.projectId,
        tags: parsed.suggestedTags || []
      };
    }

    return null;

  } catch (error) {
    console.warn('Categorization failed:', error);
    return null;
  }
}
