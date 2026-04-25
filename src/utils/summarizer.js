import { callLLM } from './llmClient.js';

/**
 * Summary Types:
 * ┌──────────────┬─────────────────────┬──────────────────────────────────┐
 * │ Type         │ When Used           │ Output                           │
 * ├──────────────┼─────────────────────┼──────────────────────────────────┤
 * │ none         │ Text < 200 chars    │ Text itself (no API call)        │
 * │ short        │ Text 200-2000 chars │ 1 concise sentence (~100 chars)  │
 * │ detailed     │ Text 2000+ chars    │ 4-6 sentence paragraph (~400 ch)  │
 * │ fullpage     │ Full webpage saved  │ 4-6 sentence detailed overview   │
 * │ article      │ Blog/article pages  │ Summary + 5 key takeaways        │
 * └──────────────┴─────────────────────┴──────────────────────────────────┘
 */

/**
 * Generate appropriate summary based on content type and length
 */
export async function generateSummary(text, options = {}) {
  const {
    contentType = 'auto',  // 'selection', 'fullpage', 'article', 'link', 'auto'
    maxLength = 200        // max chars for summary
  } = options;
  
  const textLength = (text || '').length;
  
  // Determine summary type automatically if set to 'auto'
  let summaryType = contentType;
  if (summaryType === 'auto') {
    if (textLength < 200) summaryType = 'none';
    else if (textLength < 2000) summaryType = 'short';
    else summaryType = 'detailed';
  }
  
  // If content is too short for LLM, return the text itself
  if (textLength < 100) {
    return text.trim();
  }
  
  // Truncate input to avoid token waste
  const truncatedText = text.substring(0, 4000);
  
  let prompt;
  let maxTokens;
  
  switch (summaryType) {
    case 'none':
      // No summary needed — text IS the summary
      return text.trim();
    
    case 'short':
      // One concise sentence
      prompt = `Read the following content and write exactly ONE sentence that captures the main point. Be specific — mention what it is about, not just that it exists. Only return the sentence, nothing else.\n\n${truncatedText}`;
      maxTokens = 150;
      break;
    
    case 'fullpage':
      // Detailed paragraph for full webpages
      prompt = `You are summarizing a webpage for someone who saved it and will need to recall it later. Read the content below and write a detailed summary (4-6 sentences) that covers:

1. What is this page about? (main topic)
2. What are the key points or information presented?
3. Why might someone find this useful?
4. Any important facts, numbers, or conclusions?

Write it as a flowing paragraph. Be specific and informative — avoid vague statements like "this article discusses..." — instead say what it actually discusses. Keep it under 500 characters. Only return the summary paragraph, nothing else.\n\n${truncatedText}`;
      maxTokens = 400;
      break;
    
    case 'article':
      // Article-specific: summary + takeaways
      prompt = `You are summarizing an article for someone's knowledge library. Read the article content below and provide:

FIRST: A detailed summary paragraph (4-5 sentences) covering the main topic, key arguments, and conclusions. Be specific.

THEN: Three key takeaways, each on a new line starting with "• "

Keep the total under 600 characters. Make it useful for someone who needs to recall this article quickly before a deadline.\n\n${truncatedText}`;
      maxTokens = 500;
      break;
    
    case 'detailed':
    default:
      // General detailed summary (fallback)
      prompt = `Read the following content carefully and write a detailed summary. Cover the main topic, key points, and any important details. Write 4-6 sentences. Be specific and informative.\n\n${truncatedText}`;
      maxTokens = 400;
      break;
  }
  
  try {
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens,
      temperature: 0.3
    });
    
    // Clean up the response
    let summary = result.text.trim();
    
    // Remove common prefixes like "Summary:" or "Here's a summary:"
    summary = summary.replace(/^(summary:|here's a summary:|in summary:|to summarize:)/i, '').trim();
    
    return summary;
    
  } catch (error) {
    console.error('Summarization failed:', error);
    // Fallback: return first 200 chars of content with ellipsis
    return text.substring(0, 200).trim() + (text.length > 200 ? '...' : '');
  }
}

/**
 * Generate bullet-point summary (3-5 bullets)
 */
export async function generateBulletSummary(text, count = 3) {
  const textLength = (text || '').length;
  
  // Don't generate bullets for very short text
  if (textLength < 500) {
    return [];
  }
  
  const truncatedText = text.substring(0, 4000);
  
  const prompt = `Read the following content and extract the ${count} most important points. Return each point as a bullet on a new line starting with "• ". Each bullet should be one clear, specific sentence. Make them actionable and informative — not vague. Only return the bullets, nothing else.\n\n${truncatedText}`;
  
  try {
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 300,
      temperature: 0.3
    });
    
    const responseText = result.text.trim();
    
    // Parse bullets from response
    const bullets = responseText
      .split('\n')
      .map(line => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(line => line.length > 10);
    
    return bullets.slice(0, count);
    
  } catch (error) {
    console.error('Bullet summary failed:', error);
    return [];
  }
}
