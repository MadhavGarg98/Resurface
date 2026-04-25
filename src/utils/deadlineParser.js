import { callLLM } from './llmClient.js';

export async function extractDeadline(text) {
  if (!text) return null;

  // 1. Regex approach (fast fallback)
  // Look for "due by mm/dd", "deadline: mm/dd/yyyy", etc.
  // This is a simplified regex set for demonstration. 
  // An ISO format is expected if we extract it properly, but here we just try to find standard ones.
  const regexPatterns = [
    /(?:due\s+by|deadline:?)\s+(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i,
    /(?:due|deadline)\s+(?:on|by)?\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i,
    /(?:due|deadline)\s+(?:on|by)?\s+([A-Z][a-z]{2,8}\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)/i
  ];

  for (const pattern of regexPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        // Just a basic attempt to parse it locally
        // E.g., if it's "next Friday", this Date constructor might fail or produce invalid date
        const d = new Date(match[1]);
        if (!isNaN(d.getTime())) {
          return d.toISOString();
        }
      } catch (e) {
        // ignore and let fallback to LLM
      }
    }
  }

  // 2. LLM fallback
  try {
    const prompt = `Extract any explicit deadline or due date from this text. Return ONLY the date in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.000Z). If no deadline is mentioned, return exactly 'null'. Do not explain.\n\n${text.substring(0, 1000)}`;
    
    const response = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 50,
      temperature: 0
    });

    const resultText = response.text.trim();
    if (resultText === 'null' || resultText === '"null"') {
      return null;
    }

    // Validate if it is ISO
    const parsedDate = new Date(resultText);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString();
    }
    
    return null;
  } catch (error) {
    console.warn('Deadline extraction failed:', error);
    return null;
  }
}
