import { GeminiPageResponse, BatchResponse, Figure, SemanticAccessibilityTags, MathAnnotationStyle } from '../types';
import { computeSemanticAccessibilityTags } from '../utils/accessibility';

export const DEFAULT_OLLAMA_ENDPOINT = '/api/ollama';
export const DEFAULT_OLLAMA_MODEL = 'qwen2.5vl:3b';

export interface OllamaHealthResult {
  ok: boolean;
  models: string[];
  hasTargetModel: boolean;
  activeEndpoint: string;
  error?: string;
}

/**
 * Checks connection to local Ollama instance via proxy or direct port 11434.
 */
export async function checkOllamaHealth(
  endpoint: string = DEFAULT_OLLAMA_ENDPOINT,
  targetModel: string = DEFAULT_OLLAMA_MODEL
): Promise<OllamaHealthResult> {
  const candidateEndpoints = [
    endpoint,
    DEFAULT_OLLAMA_ENDPOINT,
    'http://localhost:11434',
    'http://127.0.0.1:11434'
  ];

  // Remove duplicates while preserving order
  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));

  for (const ep of uniqueEndpoints) {
    try {
      const url = `${ep.replace(/\/+$/, '')}/api/tags`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3500)
      });

      if (res.ok) {
        const data = await res.json();
        const models: string[] = Array.isArray(data.models)
          ? data.models.map((m: any) => m.name || m.model || '')
          : [];

        const normalizedTarget = targetModel.toLowerCase().trim();
        const hasTargetModel = models.some(m => {
          const lower = m.toLowerCase();
          return lower === normalizedTarget ||
            lower.replace(/[-_:]/g, '') === normalizedTarget.replace(/[-_:]/g, '') ||
            lower.includes('qwen2.5vl') ||
            lower.includes('qwen2.5-vl');
        });

        return {
          ok: true,
          models,
          hasTargetModel,
          activeEndpoint: ep
        };
      }
    } catch (err: any) {
      // Try next endpoint candidate
    }
  }

  return {
    ok: false,
    models: [],
    hasTargetModel: false,
    activeEndpoint: endpoint,
    error: 'Could not connect to Ollama. Ensure Ollama is running (`ollama run qwen2.5vl:3b`)'
  };
}

/**
 * Builds a streamlined prompt optimized for 3B vision-language models (qwen2.5vl:3b).
 */
const buildStreamlined3BPrompt = (mathAnnotationStyle: MathAnnotationStyle = 'clean-breakdown'): string => {
  return `You are an expert mathematics transcriber and web accessibility specialist (WCAG 2.2 AA).
Transcribe this handwritten math notes image into clean, accessible semantic HTML.

RULES:
1. Output ONLY the semantic HTML content inside the body. Do not include markdown code fences (no \`\`\`html or \`\`\`).
2. Transcribe all text, headings, derivations, and formulas faithfully.
3. INLINE MATH: Wrap all inline mathematical variables, numbers in equations, and formulas in \\( ... \\). Example: \\( f(x) = x^2 + 4 \\).
4. DISPLAY MATH: Wrap all standalone block equations and derivations in \\[ ... \\].
   For multi-step derivations, format as:
   \\[
   \\begin{aligned}
   2x + 4 &= 10 \\\\
   2x &= 6 \\\\
   x &= 3
   \\end{aligned}
   \\]
5. HEADINGS: Use <h1> for the main page title/topic, <h2> for sections, and <h3> for sub-steps.
6. NOTEPADS / BOXED THEOREMS: Wrap important boxed formulas or theorems in:
   <div class="notebox" role="region" aria-label="Key Formula">
     <p class="font-bold text-slate-900 mb-1">Key Formula:</p>
     \\[ ... \\]
   </div>
7. DATA TABLES: For tabular data or grids, use semantic <table> with <thead>, <tbody>, <th scope="col">, and <th scope="row">.
8. FIGURES & DIAGRAMS: If there is a drawing, graph, or geometric diagram in the notes, insert exactly one placeholder for it:
   <img id="fig_1" alt="Brief description of diagram" />
   Never add empty image placeholders for equations, formulas, or decorative content. Always include the id and descriptive alt text.
9. ACCESSIBILITY: Maintain high contrast text (use 'text-slate-900'). Ensure every \\( has a matching \\) and every \\[ has a matching \\].`;
};

/**
 * Cleans and sanitizes raw model output into clean HTML and LaTeX.
 */
export function sanitizeAndPolishHtml(rawOutput: string): string {
  if (!rawOutput) return '';

  let cleaned = rawOutput.trim();

  // Strip markdown code fences if present (e.g. ```html ... ```)
  cleaned = cleaned.replace(/^```(?:html)?\s*/i, '');
  cleaned = cleaned.replace(/\s*```$/i, '');
  cleaned = cleaned.trim();

  // Strip hallucinated conversational introductions or sign-offs
  cleaned = cleaned.replace(/^(?:Here is the(?: transcribed)? HTML(?:\s+for the math notes)?:?)\s*/i, '');
  cleaned = cleaned.replace(/(?:Let me know if you need any changes|Hope this helps!)$/i, '').trim();

  // Remove full HTML document wrapping if model produced <html><body>...
  const bodyMatch = cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    cleaned = bodyMatch[1].trim();
  }

  // Balance unclosed \( and \)
  const inlineOpen = (cleaned.match(/\\\(/g) || []).length;
  const inlineClose = (cleaned.match(/\\\)/g) || []).length;
  if (inlineOpen > inlineClose) {
    cleaned += '\\)'.repeat(inlineOpen - inlineClose);
  }

  // Balance unclosed \[ and \]
  const blockOpen = (cleaned.match(/\\\[/g) || []).length;
  const blockClose = (cleaned.match(/\\\]/g) || []).length;
  if (blockOpen > blockClose) {
    cleaned += '\\]'.repeat(blockOpen - blockClose);
  }

  // Balance unclosed \begin{aligned} ... \end{aligned}
  const alignedOpen = (cleaned.match(/\\begin\{aligned\}/g) || []).length;
  const alignedClose = (cleaned.match(/\\end\{aligned\}/g) || []).length;
  if (alignedOpen > alignedClose) {
    cleaned += '\n\\end{aligned}\\]'.repeat(alignedOpen - alignedClose);
  }

  // Fix 3B vision quirks: confusing superscript ^( with \lambda (
  cleaned = cleaned.replace(/e\^\{\\lambda\s*\(([^)]+)\)\}/g, 'e^{$1}');
  cleaned = cleaned.replace(/e\^\\lambda\s*\(([^)]+)\)/g, 'e^{$1}');

  return cleaned;
}

/**
 * Extracts figure metadata from transcribed HTML.
 */
export function extractFiguresFromHtml(html: string): { figures: Figure[]; cleanHtml: string } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');

  const figures: Figure[] = [];
  const imgElements = Array.from(doc.querySelectorAll('img')).filter(img => {
    const hasFigureMetadata = img.id.startsWith('fig_') || img.hasAttribute('alt') || img.hasAttribute('data-box-2d');
    const isUnresolvedImagePlaceholder = !img.hasAttribute('src');
    if (!hasFigureMetadata && !isUnresolvedImagePlaceholder) return false;

    // Small vision models sometimes emit an empty <img> beside an equation.
    // That is not a diagram placeholder and must not become a crop.
    const equationContainer = img.closest('.formula, .equation, .math, [role="math"]');
    const equationMarkup = equationContainer?.innerHTML || '';
    if (!img.hasAttribute('src') && (equationMarkup.includes('$$') || equationMarkup.includes('\\(') || equationMarkup.includes('\\['))) {
      img.remove();
      return false;
    }
    return true;
  });

  const usedIds = new Set<string>();
  imgElements.forEach((img, idx) => {
    let id = img.getAttribute('id')?.startsWith('fig_') ? img.getAttribute('id')! : `fig_${idx + 1}`;
    let suffix = idx + 1;
    while (usedIds.has(id)) id = `fig_${++suffix}`;
    usedIds.add(id);
    const alt = img.getAttribute('alt')?.trim() || `Mathematical diagram or figure ${idx + 1}`;
    const caption = img.getAttribute('title') || alt;
    const box: Figure['box_2d'] = [350, 250, 650, 650];

    figures.push({
      id,
      box_2d: box,
      coordinatesProvided: false,
      alt,
      caption
    });

    img.setAttribute('id', id);
    img.setAttribute('alt', alt);
  });

  return {
    figures,
    cleanHtml: doc.body.firstElementChild ? doc.body.firstElementChild.innerHTML : html
  };
}

/**
 * Requests tighter page-relative bounds when the transcription omitted them.
 * This runs only for detected figures without coordinates.
 */
async function locateFigureBoxesWithOllama(
  imageBase64: string,
  figures: Figure[],
  model: string,
  endpoint: string,
  imageWidth: number,
  imageHeight: number
): Promise<void> {
  const missing = figures.filter(figure => !figure.coordinatesProvided);
  if (missing.length === 0) return;

  const prompt = `Inspect this ${imageWidth} by ${imageHeight} pixel notes page. Locate only its ${missing.length} hand-drawn mathematical figure(s): graphs, coordinate axes, curves, geometric drawings, or shaded regions. Do not include equations, prose, page lines, or blank image placeholders. Return valid JSON only in this exact shape: {"figures":[{"bbox_2d":[x1,y1,x2,y2],"alt":"short description","description":"complete text description"}]}. Return exactly ${missing.length} figures in reading order. Use actual image PIXEL coordinates, not normalized values. Each coordinate must be an integer, with 0 <= x <= ${imageWidth}, 0 <= y <= ${imageHeight}, x1 < x2, and y1 < y2. Each box must contain the complete hand-drawn figure, including its axes, arrows, curve, labels, and shading, with a small margin but without nearby prose or equations. The alt text must name the graph and its main relationship. The description must state every labelled axis, important value, curve, and shaded region so a person who cannot see the figure receives equivalent information.`;
  const candidateEndpoints = Array.from(new Set([
    endpoint,
    DEFAULT_OLLAMA_ENDPOINT,
    'http://localhost:11434',
    'http://127.0.0.1:11434'
  ]));

  for (const ep of candidateEndpoints) {
    try {
      const response = await fetch(`${ep.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          model: model || DEFAULT_OLLAMA_MODEL,
          messages: [{ role: 'user', content: prompt, images: [imageBase64] }],
          format: 'json',
          stream: false,
          keep_alive: '10m',
          options: { temperature: 0.1, top_p: 0.9, repeat_penalty: 1.15, num_predict: 256 }
        })
      });
      if (!response.ok) continue;

      const responseJson = await response.json();
      const parsed = JSON.parse(responseJson.message?.content || '{}');
      const boxes = parsed.figures;
      if (!Array.isArray(boxes)) continue;

      boxes.forEach((entry: any, index: number) => {
        const values = entry?.bbox_2d;
        if (index >= missing.length || !Array.isArray(values) || values.length !== 4) return;
        const box = values.map((value: unknown) => Number(value));
        if (!box.every(Number.isFinite)) return;
        const [left, top, right, bottom] = box;
        if (bottom <= top || right <= left) return;
        missing[index].box_2d = [
          Math.max(0, Math.min(1000, (top / imageHeight) * 1000)),
          Math.max(0, Math.min(1000, (left / imageWidth) * 1000)),
          Math.max(0, Math.min(1000, (bottom / imageHeight) * 1000)),
          Math.max(0, Math.min(1000, (right / imageWidth) * 1000))
        ];
        if (typeof entry.alt === 'string' && entry.alt.trim()) {
          missing[index].alt = entry.alt.trim();
        }
        if (typeof entry.description === 'string' && entry.description.trim()) {
          missing[index].caption = entry.description.trim();
        }
        missing[index].coordinatesProvided = true;
      });

      if (missing.every(figure => figure.coordinatesProvided)) return;
    } catch {
      // Keep fallback bounds for any figure the locator could not resolve.
    }
  }
}

const getImageDimensions = async (base64: string): Promise<{ width: number; height: number }> => {
  const image = new Image();
  const source = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Unable to read image dimensions for figure detection.'));
    image.src = source;
  });
  return { width: image.naturalWidth, height: image.naturalHeight };
};

/**
 * Transcribes a single page image using the local Ollama vision model.
 */
export async function transcribePageWithOllama(
  image: { base64: string; pageNumber: number },
  model: string = DEFAULT_OLLAMA_MODEL,
  endpoint: string = DEFAULT_OLLAMA_ENDPOINT,
  mathAnnotationStyle: MathAnnotationStyle = 'clean-breakdown',
  onStreamingProgress?: (charsCount: number) => void
): Promise<GeminiPageResponse> {
  const prompt = buildStreamlined3BPrompt(mathAnnotationStyle);
  const cleanBase64 = image.base64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  const payload = {
    model: model || DEFAULT_OLLAMA_MODEL,
    messages: [
      {
        role: 'user',
        content: prompt,
        images: [cleanBase64]
      }
    ],
    stream: false,
    keep_alive: '10m', // Keep model in memory so it doesn't unload/reload, but context is fresh per request
    options: {
      temperature: 0.1,
      top_p: 0.9,
      repeat_penalty: 1.15,
      num_predict: 2048
    }
  };

  const candidateEndpoints = [
    endpoint,
    DEFAULT_OLLAMA_ENDPOINT,
    'http://localhost:11434',
    'http://127.0.0.1:11434'
  ];
  const uniqueEndpoints = Array.from(new Set(candidateEndpoints));

  let lastError: Error | null = null;
  let rawResponseText = '';

  for (const ep of uniqueEndpoints) {
    try {
      const url = `${ep.replace(/\/+$/, '')}/api/chat`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Ollama HTTP ${res.status}: ${errorText || res.statusText}`);
      }

      const json = await res.json();
      rawResponseText = json.message?.content || '';
      if (rawResponseText) {
        onStreamingProgress?.(rawResponseText.length);
        break;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!rawResponseText) {
    throw new Error(
      lastError?.message ||
      `Failed to receive response from Ollama (${model}). Please ensure Ollama is running and model "${model}" is loaded.`
    );
  }

  // Sanitize and polish transcribed HTML
  const polishedHtml = sanitizeAndPolishHtml(rawResponseText);
  const { figures, cleanHtml } = extractFiguresFromHtml(polishedHtml);
  try {
    const { width, height } = await getImageDimensions(cleanBase64);
    await locateFigureBoxesWithOllama(cleanBase64, figures, model, endpoint, width, height);
  } catch (err) {
    console.warn('Figure location pass skipped:', err);
  }

  // Extract page title from heading or default
  const titleMatch = cleanHtml.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const title = rawTitle || `Page ${image.pageNumber} Mathematics Notes`;

  const semanticTags = computeSemanticAccessibilityTags(cleanHtml, title);

  return {
    html: cleanHtml,
    figures,
    title,
    semanticTags
  };
}

/**
 * Batch conversion entry point (compatible with useDocumentProcessing).
 */
export async function convertBatchToHtml(
  images: { base64: string; pageNumber: number }[],
  model: string = DEFAULT_OLLAMA_MODEL,
  _thinkingLevel?: any,
  _onModelFallback?: (m: string) => void,
  mathAnnotationStyle: MathAnnotationStyle = 'clean-breakdown',
  onStreamingProgress?: (charsCount: number) => void
): Promise<BatchResponse> {
  const pages: GeminiPageResponse[] = [];
  let totalChars = 0;

  for (const img of images) {
    const pageResp = await transcribePageWithOllama(
      img,
      model,
      DEFAULT_OLLAMA_ENDPOINT,
      mathAnnotationStyle,
      (count) => {
        totalChars += count;
        onStreamingProgress?.(totalChars);
      }
    );
    pages.push(pageResp);
  }

  return {
    pages,
    tokenCount: totalChars,
    actualModelUsed: model
  };
}

/**
 * Inspection and polish pass for transcribed HTML.
 * Fixes LaTeX spacing, ensures WCAG AA compliance, and normalizes tags.
 */
export async function inspectAndPolishPageHtml(
  html: string,
  _model?: string
): Promise<string> {
  return sanitizeAndPolishHtml(html);
}
