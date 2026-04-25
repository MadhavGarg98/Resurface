import { getSettings } from './storage.js';

async function getAvailableProviders() {
  const settings = await getSettings();
  const providers = [];

  const groq = { name: 'groq', key: settings.groqApiKey, fn: callGroq };
  const gemini = { name: 'gemini', key: settings.geminiApiKey, fn: callGemini };

  if (settings.preferredOrder === 'Gemini first') {
    if (gemini.key) providers.push(gemini);
    if (groq.key) providers.push(groq);
  } else {
    // Default to Groq first
    if (groq.key) providers.push(groq);
    if (gemini.key) providers.push(gemini);
  }

  return providers;
}

function convertToGeminiFormat(messages) {
  const converted = [];
  for (const msg of messages) {
    if (msg.role === 'system') {
      converted.push({
        role: 'user',
        parts: [{ text: `[Instruction]: ${msg.content}` }]
      });
      converted.push({
        role: 'model',
        parts: [{ text: 'Understood.' }]
      });
    } else if (msg.role === 'user') {
      converted.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === 'assistant') {
      converted.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  }
  return converted;
}

async function callGroq(apiKey, messages, maxTokens, temperature) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: maxTokens,
        temperature
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.error?.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return {
      text: data.choices[0].message.content,
      usage: data.usage
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function callGemini(apiKey, messages, maxTokens, temperature) {
  const convertedMessages = convertToGeminiFormat(messages);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: convertedMessages,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature
        }
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      let errorMsg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        errorMsg = errData.error?.message || errorMsg;
      } catch (e) {}
      throw new Error(errorMsg);
    }

    const data = await response.json();
    return {
      text: data.candidates[0].content.parts[0].text,
      usage: data.usageMetadata
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function callLLM({ messages, maxTokens = 200, temperature = 0.2 }) {
  const providers = await getAvailableProviders();
  
  if (providers.length === 0) {
    throw new Error('No AI providers configured. Please add an API key in settings.');
  }

  const errors = [];

  for (const provider of providers) {
    try {
      const result = await provider.fn(provider.key, messages, maxTokens, temperature);
      return { ...result, provider: provider.name };
    } catch (error) {
      console.warn(`Provider ${provider.name} failed:`, error);
      errors.push(`${provider.name}: ${error.message}`);
    }
  }

  throw new Error(`All configured providers failed.\n${errors.join('\n')}`);
}

export async function checkProviderStatus() {
  const settings = await getSettings();
  const status = {
    groq: { available: false },
    gemini: { available: false }
  };

  const testMessages = [{ role: 'user', content: 'Hi' }];

  if (settings.groqApiKey) {
    const start = Date.now();
    try {
      await callGroq(settings.groqApiKey, testMessages, 10, 0);
      const latency = ((Date.now() - start) / 1000).toFixed(2) + 's';
      status.groq = { available: true, latency, model: 'llama-3.1-8b-instant' };
    } catch (error) {
      status.groq = { available: false, error: error.message };
    }
  }

  if (settings.geminiApiKey) {
    const start = Date.now();
    try {
      await callGemini(settings.geminiApiKey, testMessages, 10, 0);
      const latency = ((Date.now() - start) / 1000).toFixed(2) + 's';
      status.gemini = { available: true, latency, model: 'gemini-2.0-flash' };
    } catch (error) {
      status.gemini = { available: false, error: error.message };
    }
  }

  return status;
}

export async function testConnection() {
  const status = await checkProviderStatus();
  return status.groq.available || status.gemini.available;
}
