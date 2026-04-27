/**
 * Resurface PDF Extractor — powered by PDF.js
 * 
 * Loads PDF.js from CDN lazily (only when a PDF is saved).
 * Extracts clean, structured text with exact page counts.
 * Falls back to Chrome's PDF viewer DOM if CDN is unreachable.
 */

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib = null;
let pdfjsLoaded = false;

/**
 * Load PDF.js library dynamically — only when needed
 */
async function loadPDFJS() {
  if (pdfjsLoaded && pdfjsLib) return pdfjsLib;

  if (window.pdfjsLib) {
    pdfjsLib = window.pdfjsLib;
    pdfjsLoaded = true;
    return pdfjsLib;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      pdfjsLib = window.pdfjsLib;
      pdfjsLoaded = true;
      console.log('[PDFExtractor] PDF.js loaded successfully');
      resolve(pdfjsLib);
    };
    script.onerror = () => {
      console.error('[PDFExtractor] Failed to load PDF.js from CDN');
      reject(new Error('Failed to load PDF.js'));
    };
    document.head.appendChild(script);
  });
}

/**
 * Get PDF source URL from the current page
 */
function getPDFSource() {
  // Direct PDF URL
  const href = window.location.href;
  if (href.toLowerCase().match(/\.pdf(\?.*)?$/)) {
    return { type: 'url', source: href };
  }

  // Embedded PDFs
  const embeds = document.querySelectorAll(
    'embed[type="application/pdf"], object[type="application/pdf"]'
  );
  for (const el of embeds) {
    const src = el.src || el.data;
    if (src) {
      return {
        type: 'url',
        source: src.startsWith('http') ? src : new URL(src, href).href
      };
    }
  }

  // PDF in iframe
  for (const iframe of document.querySelectorAll('iframe')) {
    if (iframe.src?.toLowerCase().match(/\.pdf(\?.*)?$/)) {
      return { type: 'url', source: iframe.src };
    }
  }

  return null;
}

/**
 * Extract full text from PDF using PDF.js
 */
export async function extractPDFWithPDFJS() {
  try {
    await loadPDFJS();

    const pdfSource = getPDFSource();
    if (!pdfSource) {
      throw new Error('No PDF source found on this page');
    }

    console.log('[PDFExtractor] Loading PDF from:', pdfSource.source);

    const loadingTask = pdfjsLib.getDocument({
      url: pdfSource.source,
      disableAutoFetch: true,
      disableStream: true
    });
    const pdf = await loadingTask.promise;

    console.log('[PDFExtractor] PDF loaded:', pdf.numPages, 'pages');

    const fullText = [];
    const pageTexts = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Combine text items with proper spacing
      let lastY = null;
      const parts = [];
      for (const item of textContent.items) {
        // Detect line breaks by Y position change
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 2) {
          parts.push('\n');
        }
        parts.push(item.str);
        lastY = item.transform[5];
      }

      const pageText = parts.join(' ').replace(/ \n /g, '\n');

      pageTexts.push({ pageNumber: pageNum, text: pageText });
      fullText.push(pageText);
    }

    const combinedText = fullText.join('\n\n');
    const metadata = await getPDFMetadataFromDoc(pdf);

    return {
      success: true,
      text: cleanExtractedText(combinedText),
      pageCount: pdf.numPages,
      pageTexts,
      title: metadata.title || extractPDFTitle(pdfSource.source),
      metadata,
      extractionMethod: 'pdfjs'
    };
  } catch (error) {
    console.error('[PDFExtractor] PDF.js extraction failed:', error);
    return fallbackExtraction();
  }
}

/**
 * Clean extracted text — fix common PDF artifacts
 */
function cleanExtractedText(text) {
  if (!text) return '';
  return text
    .replace(/\0/g, '')
    .replace(/\f/g, '\n')
    .replace(/(\w)-\n\s*(\w)/g, '$1$2')  // Fix hyphenated line breaks
    .replace(/\n{3,}/g, '\n\n')           // Collapse excessive newlines
    .replace(/[ \t]{2,}/g, ' ')           // Collapse spaces
    .trim();
}

/**
 * Extract title from PDF URL
 */
function extractPDFTitle(url) {
  try {
    const fileName = decodeURIComponent(
      url.split('/').pop()?.split('?')[0] || ''
    );
    return fileName
      .replace(/\.pdf$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/%20/g, ' ')
      .trim() || 'Untitled PDF';
  } catch {
    return 'PDF Document';
  }
}

/**
 * Get PDF metadata from the document object
 */
async function getPDFMetadataFromDoc(pdf) {
  try {
    const meta = await pdf.getMetadata();
    return {
      title: meta?.info?.Title || null,
      author: meta?.info?.Author || null,
      subject: meta?.info?.Subject || null,
      keywords: meta?.info?.Keywords || null,
      creator: meta?.info?.Creator || null,
      pageCount: pdf.numPages
    };
  } catch {
    return { pageCount: pdf.numPages };
  }
}

/**
 * Fallback extraction using Chrome's PDF viewer DOM
 */
function fallbackExtraction() {
  console.log('[PDFExtractor] Attempting DOM fallback...');

  const viewer = document.querySelector('#viewer, .pdfViewer, [id*="viewer"]');
  if (viewer) {
    const textParts = [];
    for (const el of viewer.querySelectorAll('div, span')) {
      if (el.children.length > 0) continue;
      const t = el.innerText?.trim();
      if (t && t.length > 1) textParts.push(t);
    }
    const text = textParts.join(' ');
    if (text.length > 50) {
      return {
        success: true,
        text: cleanExtractedText(text),
        pageCount: estimatePageCount(),
        pageTexts: [],
        title: extractPDFTitle(window.location.href),
        metadata: { pageCount: estimatePageCount() },
        extractionMethod: 'fallback-dom'
      };
    }
  }

  // Last resort: body text
  const bodyText = document.body?.innerText || '';
  if (bodyText.length > 50) {
    return {
      success: true,
      text: cleanExtractedText(bodyText),
      pageCount: estimatePageCount(),
      pageTexts: [],
      title: extractPDFTitle(window.location.href),
      metadata: { pageCount: estimatePageCount() },
      extractionMethod: 'fallback-body'
    };
  }

  return {
    success: false,
    text: '',
    pageCount: 1,
    pageTexts: [],
    title: extractPDFTitle(window.location.href),
    metadata: {},
    extractionMethod: 'none',
    error: 'Could not extract text from PDF'
  };
}

function estimatePageCount() {
  const indicator = document.querySelector('[aria-label*="page"], #pageNumber');
  if (indicator) {
    const match = indicator.textContent?.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) return parseInt(match[2]);
  }
  return Math.max(1, Math.ceil((document.body?.innerText || '').length / 3000));
}

/**
 * Check if current page is a PDF
 */
export function isPDFPage() {
  if (window.location.href.toLowerCase().match(/\.pdf(\?.*)?$/)) return true;

  for (const el of document.querySelectorAll('embed, object, iframe')) {
    const src = el.src || el.data || '';
    if (src.toLowerCase().match(/\.pdf(\?.*)?$/)) return true;
    if (el.type?.includes('pdf')) return true;
  }

  return false;
}

export { loadPDFJS, getPDFSource };
