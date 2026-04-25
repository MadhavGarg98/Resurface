import { callLLM } from './llmClient.js';

export async function generateSummary(text) {
  try {
    const truncatedText = text.substring(0, 2000);
    const messages = [{
      role: 'user',
      content: `Summarize the following content in exactly one concise sentence. Only return the sentence, nothing else.\n\n${truncatedText}`
    }];

    const response = await callLLM({
      messages,
      maxTokens: 100,
      temperature: 0.2
    });

    return response.text.trim();
  } catch (error) {
    console.warn('Summary generation failed:', error);
    return 'Summary unavailable';
  }
}

export async function generateBulletSummary(text) {
  try {
    const truncatedText = text.substring(0, 2000);
    const messages = [{
      role: 'user',
      content: `Summarize the following content in exactly 3 bullet points. Each bullet should start with a dash (-). Keep each bullet to one line. Only return the bullets, nothing else.\n\n${truncatedText}`
    }];

    const response = await callLLM({
      messages,
      maxTokens: 200,
      temperature: 0.2
    });

    const lines = response.text.split('\n');
    const bullets = lines
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-+\s*/, '').trim())
      .slice(0, 3);

    if (bullets.length === 0) {
      return ['Summary unavailable'];
    }

    return bullets;
  } catch (error) {
    console.warn('Bullet summary generation failed:', error);
    return ['Summary unavailable'];
  }
}
