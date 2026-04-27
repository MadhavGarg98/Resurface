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
    maxLength = 200,       // max chars for summary
    fileType = null,
    metadata = {}
  } = options;
  
  // Route PDF content to specialized summarizer
  if (fileType === 'pdf' || metadata?.isPDF) {
    return generatePDFSummary(text, metadata);
  }
  
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

// ============================================
// PDF-SPECIFIC SUMMARIZATION
// ============================================

/**
 * Generate summary for PDF content with depth based on page count
 * 
 * Summary Depth:
 * ┌──────────────┬──────────────────────────────────────┐
 * │ 1-3 pages    │ Concise summary (3-4 sentences)      │
 * │ 4-10 pages   │ Summary + 5 key takeaways            │
 * │ 11+ pages    │ Executive summary + 7 takeaways      │
 * └──────────────┴──────────────────────────────────────┘
 */
export async function generatePDFSummary(text, metadata = {}) {
  const pageCount = metadata.pageCount || 1;
  const textLength = (text || '').length;
  
  // Too short for summary
  if (textLength < 200) {
    return text.trim();
  }
  
  // PDFs are denser — capture more context
  const truncatedText = text.substring(0, 6000);
  
  let prompt;
  let maxTokens;
  
  if (pageCount <= 3) {
    // 1-3 pages: Full summary (4-6 sentences)
    prompt = `You are summarizing a short PDF document (${pageCount} page${pageCount > 1 ? 's' : ''}). Write a clear, comprehensive summary (4-6 sentences) covering the main topic and key points. Be specific and informative — mention actual content.

PDF Content:
${truncatedText}`;
    maxTokens = 300;
  } else if (pageCount <= 10) {
    // 4-10 pages: Summary + 5 key takeaways
    prompt = `You are summarizing a ${pageCount}-page PDF document. Provide:

1. A detailed summary paragraph (4-6 sentences) covering the main topic, purpose, and key findings
2. Then list the 5 most important takeaways as bullet points (• )

Be thorough and specific.

PDF Content:
${truncatedText}`;
    maxTokens = 500;
  } else if (pageCount <= 25) {
    // 11-25 pages: Executive summary + 7 takeaways
    prompt = `You are creating an executive summary of a ${pageCount}-page PDF document. Provide:

1. Document overview: what this document is about and its purpose (1-2 sentences)
2. Executive summary (5-8 sentences covering major sections and conclusions)
3. 7 key takeaways as bullet points (• )

Make it comprehensive but scannable.

PDF Content:
${truncatedText}`;
    maxTokens = 700;
  } else if (pageCount <= 50) {
    // 26-50 pages: Section-by-section overview + 10 key takeaways
    prompt = `You are creating a comprehensive summary of a ${pageCount}-page PDF document. Provide:

1. Document overview (2-3 sentences)
2. Section-by-section overview (summarize the flow and major parts of the document in 2-3 paragraphs)
3. 10 key takeaways as bullet points (• )

PDF Content:
${truncatedText}`;
    maxTokens = 1000;
  } else {
    // 50+ pages: Sampling based summary
    prompt = `You are summarizing a massive ${pageCount}-page PDF document based on sampled pages. Provide:

1. Executive Document Overview (what this is and why it exists)
2. Major findings or themes based on the provided excerpts (2-3 paragraphs)
3. 10 major takeaways as bullet points (• )
4. A concluding sentence on the document's overall value or purpose

PDF Content Excerpts:
${truncatedText}`;
    maxTokens = 1200;
  }
  
  try {
    const result = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens,
      temperature: 0.3
    });
    
    let summary = result.text.trim();
    summary = summary.replace(/^(summary:|here's a summary:|in summary:|to summarize:)/i, '').trim();
    return summary;
  } catch (error) {
    console.error('[Summarizer] PDF summary failed:', error);
    return text.substring(0, 300).trim() + (textLength > 300 ? '...' : '');
  }
}
