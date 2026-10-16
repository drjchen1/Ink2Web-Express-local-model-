import { ConversionResult, LayoutMode, DocumentMetadata } from '../types';

/**
 * Generates a clean, semantic HTML document designed for WCAG 2.2 AA compliance.
 * - Semantic HTML5 elements (<article>, <header>, <main>, <section>, <table>, <figure>)
 * - Native MathJax 3 with support for LaTeX math (inline \\( ... \\) and block \\[ ... \\])
 * - High-contrast default styles
 * - Accessible tables with scope attributes and captions
 * - Standalone images with descriptive alt text and captions
 * - Fully responsive with horizontal scrolling for wide equations
 * - Zero drawing tools, zero margin note clutter, zero external heavy dependencies
 */
export const generateHtmlDocument = (
  results: ConversionResult[],
  originalFileName: string = '',
  layoutMode: LayoutMode = 'paginated',
  _isReadingMode: boolean = false,
  _highContrastTheme: string = 'default',
  _textSize: number = 100,
  _fontPreference: string = 'inter',
  _lineHeight: string = 'normal',
  metadata?: DocumentMetadata
): string => {
  const firstPageHtml = results[0]?.html || '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(firstPageHtml, 'text/html');
  const cleanWhitespace = (str: string = '') => str.replace(/\s+/g, ' ').trim();

  const firstHeading = doc.querySelector('h1, h2, h3');
  const extractedTitle = firstHeading ? cleanWhitespace(firstHeading.textContent || '') : 'Mathematics Document';

  const escapeXml = (str: string = '') => cleanWhitespace(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m] || m));

  const effectiveTitle = cleanWhitespace(metadata?.title || extractedTitle || 'Mathematics Notes');
  const effectiveAuthor = cleanWhitespace(metadata?.author || '');
  const effectiveSubject = cleanWhitespace(metadata?.subject || 'Mathematics & STEM Notes');
  const effectiveDescription = cleanWhitespace(metadata?.description || `Accessible digitized mathematical notes on ${effectiveTitle}`);
  const effectiveKeywords = cleanWhitespace(metadata?.keywords || 'mathematics, STEM, lecture notes, LaTeX, MathJax, accessible math, WCAG');
  const effectiveDate = cleanWhitespace(metadata?.creationDate || new Date().toISOString().split('T')[0]);

  const cleanResults = results.map((r, pageIndex) => {
    let processedHtml = r.html || '';
    const pageDoc = parser.parseFromString(processedHtml, 'text/html');

    // Remove any editor/drawing buttons if present
    pageDoc.querySelectorAll('.edit-figure-btn, button').forEach(el => {
      if (el.classList.contains('edit-figure-btn') || el.getAttribute('title')?.includes('Edit')) {
        el.remove();
      }
    });

    // Remove any margin annotations / auto-annotations if present
    pageDoc.querySelectorAll('.auto-annotation, .margin-note').forEach(el => el.remove());

    // Deduplicate title: If the document header already renders <h1 id="document-title">,
    // remove the duplicate title heading from the first page's body so it isn't repeated.
    if (pageIndex === 0) {
      const firstHeadingOnPage = pageDoc.querySelector('h1, h2');
      if (firstHeadingOnPage) {
        const headingText = (firstHeadingOnPage.textContent || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const docTitleText = effectiveTitle.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (headingText && docTitleText && (headingText === docTitleText || headingText.includes(docTitleText) || docTitleText.includes(headingText))) {
          const parent = firstHeadingOnPage.parentElement;
          firstHeadingOnPage.remove();
          // Remove empty parent <header> if leaving it creates an empty bordered bar
          if (parent && parent.tagName.toLowerCase() === 'header' && !parent.textContent?.trim()) {
            parent.remove();
          }
        }
      }
    }

    // WCAG 1.3.1 Heading Normalization: Subsequent pages should not introduce new <h1> tags
    // Any <h1> on pages > 0 is transformed into <h2> to preserve a single root <h1> hierarchy.
    if (pageIndex > 0) {
      pageDoc.querySelectorAll('h1').forEach(h1 => {
        const h2 = pageDoc.createElement('h2');
        Array.from(h1.attributes).forEach(attr => h2.setAttribute(attr.name, attr.value));
        h2.innerHTML = h1.innerHTML;
        h1.parentNode?.replaceChild(h2, h1);
      });
    }

    // Unwrap nested redundant <article> tags to avoid double-article announcements in screen readers
    const bodyChildren = Array.from(pageDoc.body.children);
    if (bodyChildren.length === 1 && bodyChildren[0].tagName.toLowerCase() === 'article') {
      const innerArticle = bodyChildren[0];
      pageDoc.body.innerHTML = innerArticle.innerHTML;
    }

    // Clean up MathJax alignment tabs (&amp; -> &) inside LaTeX environments
    let cleanedHtml = pageDoc.body.innerHTML.replace(/(\\\([\s\S]*?\\\)|\\[[\s\S]*?\\])/g, (mathMatch) => {
      return mathMatch.replace(/&amp;/g, '&');
    });

    return {
      ...r,
      html: cleanedHtml,
      pageIndex
    };
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(effectiveTitle)} - Accessible Math Notes</title>
  ${effectiveAuthor ? `<meta name="author" content="${escapeXml(effectiveAuthor)}">` : ''}
  <meta name="description" content="${escapeXml(effectiveDescription)}">
  <meta name="keywords" content="${escapeXml(effectiveKeywords)}">
  <meta property="og:title" content="${escapeXml(effectiveTitle)}">
  <meta property="og:description" content="${escapeXml(effectiveDescription)}">
  <meta property="og:type" content="article">

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "ScholarlyArticle",
    "headline": ${JSON.stringify(effectiveTitle)},
    ${effectiveAuthor ? `"author": { "@type": "Person", "name": ${JSON.stringify(effectiveAuthor)} },` : ''}
    "description": ${JSON.stringify(effectiveDescription)},
    "datePublished": ${JSON.stringify(effectiveDate)},
    "inLanguage": "en"
  }
  </script>

  <!-- MathJax 3 LaTeX Rendering with Accessibility -->
  <script>
    window.MathJax = {
      loader: { load: ['[tex]/mathtools', '[tex]/ams'] },
      tex: {
        packages: { '[+]': ['mathtools', 'ams'] },
        inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
        displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      },
      startup: {
        pageReady: function() {
          return MathJax.startup.defaultPageReady().then(function() {
            document.querySelectorAll('mjx-container[display="true"]').forEach(function(el) {
              el.setAttribute('tabindex', '0');
              el.setAttribute('role', 'group');
              el.setAttribute('aria-label', 'Mathematical equation');
            });
          });
        }
      }
    };
  </script>
  <script defer src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" id="MathJax-script"></script>

  <style>
    /* Accessible document styling */
    :root {
      --bg: #ffffff;
      --card-bg: #ffffff;
      --ink-primary: #0f172a;    /* High contrast > 15:1 */
      --ink-secondary: #334155;  /* High contrast > 7:1 */
      --ink-muted: #475569;      /* Contrast > 4.5:1 */
      --border: #e2e8f0;
      --border-subtle: #cbd5e1;
      --accent: #4338ca;         /* Indigo 700, high contrast */
      --accent-bg: #f8fafc;
      --notebox-border: #4f46e5;
      --notebox-bg: #faf5ff;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: #f1f5f9;
      color: var(--ink-primary);
      margin: 0;
      padding: clamp(1rem, 0.75rem + 1.5vw, 2.5rem) clamp(0.5rem, 0.25rem + 1vw, 1.5rem);
      line-height: 1.75;
      font-size: clamp(1rem, 0.95rem + 0.35vw, 1.125rem);
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    /* Physically Separate Document Pages Container */
    .document-stream {
      max-width: 52rem;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 2.5rem;
    }

    /* Individual Physical Sheet Card */
    .document-page {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: clamp(0.75rem, 0.5rem + 1vw, 1.25rem);
      padding: clamp(1.25rem, 1rem + 2.5vw, 3.25rem);
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03);
      position: relative;
    }

    /* Page Header Bar */
    .page-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.75rem;
      margin-bottom: 2rem;
    }

    .page-badge {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-muted);
      background: #f1f5f9;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      border: 1px solid var(--border);
    }

    .document-author {
      margin: 0.5rem 0 0 0;
      color: var(--ink-secondary);
      font-size: 0.95rem;
      font-weight: 500;
    }

    /* Screen Reader Only Utility (WCAG A11y) */
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* Layout Grids & Comparison Columns */
    .grid {
      display: grid;
    }
    .grid-cols-1 {
      grid-template-columns: repeat(1, minmax(0, 1fr));
    }
    @media (min-width: 768px) {
      .md\:grid-cols-2 {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    .gap-4 { gap: 1rem; }
    .gap-6 { gap: 1.5rem; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }

    /* Document Header */
    .document-header {
      border-bottom: 2px solid var(--border);
      padding-bottom: 1.5rem;
      margin-bottom: 2.5rem;
    }

    .document-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      background: #eef2ff;
      border: 1px solid #c7d2fe;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      margin-bottom: 0.75rem;
    }

    /* Typography & Hierarchy */
    h1, h2, h3, h4, h5, h6 {
      color: #020617;
      font-weight: 800;
      line-height: 1.3;
      margin-top: 2rem;
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
    }

    h1 {
      font-size: 2.25rem;
      margin-top: 0;
    }

    h2 {
      font-size: 1.625rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 0.5rem;
      margin-top: 2.5rem;
    }

    h3 {
      font-size: 1.25rem;
    }

    p {
      margin: 1.25rem 0;
      color: var(--ink-primary);
    }

    ul, ol {
      margin: 1.25rem 0;
      padding-left: 2rem;
      color: var(--ink-primary);
    }

    li {
      margin-bottom: 0.5rem;
    }

    /* Math Equations (LaTeX) */
    mjx-container[display="true"] {
      max-width: 100% !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      padding: 0.75rem 0.5rem !important;
      margin: 1.75rem 0 !important;
      border-radius: 0.5rem;
      outline: none;
    }

    mjx-container[display="true"]:focus-visible {
      outline: 2px solid var(--accent);
      background: #f1f5f9;
    }

    /* Formula & Definition Callout Boxes */
    .notebox {
      border-left: 4px solid var(--notebox-border);
      background-color: var(--accent-bg);
      padding: 1.25rem 1.75rem;
      margin: 2rem 0;
      border-radius: 0 0.75rem 0.75rem 0;
      border-top: 1px solid var(--border);
      border-right: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      color: var(--ink-primary);
    }

    /* Accessible Tables */
    .table-container, .overflow-x-auto {
      width: 100%;
      overflow-x: auto;
      margin: 1.75rem 0;
      border-radius: 0.75rem;
      border: 1px solid var(--border-subtle);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.975rem;
      background: #ffffff;
    }

    caption {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--ink-secondary);
      text-align: left;
      padding: 0.75rem 1rem;
      background: #f1f5f9;
      border-bottom: 1px solid var(--border-subtle);
    }

    th, td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
    }

    th {
      background-color: #f8fafc;
      color: #0f172a;
      font-weight: 700;
    }

    tr:last-child td {
      border-bottom: none;
    }

    /* Figures & Visual Diagrams */
    figure {
      margin: 2rem 0;
      border: 1px solid var(--border);
      border-radius: 1rem;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    figure img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 0 auto;
    }

    figcaption {
      width: 100%;
      padding: 0.875rem 1.25rem;
      background-color: var(--accent-bg);
      border-top: 1px solid var(--border);
      font-size: 0.9rem;
      color: var(--ink-secondary);
      text-align: left;
    }

    figcaption .figure-title,
    figcaption div.font-bold {
      font-weight: 700;
      color: var(--ink-primary);
      font-size: 0.95rem;
      margin-bottom: 0.25rem;
      display: block;
      text-align: left;
    }

    figcaption .figure-title span,
    figcaption div.font-bold span {
      color: var(--ink-muted);
      font-weight: 600;
      margin-right: 0.25rem;
    }

    details summary {
      cursor: pointer;
      font-weight: 600;
      color: var(--accent);
      outline: none;
      list-style: none;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      user-select: none;
      font-size: 0.825rem;
    }

    details summary::-webkit-details-marker {
      display: none;
    }

    details summary svg {
      width: 0.875rem;
      height: 0.875rem;
      transition: transform 0.2s ease;
      stroke: currentColor;
    }

    details[open] summary svg {
      transform: rotate(90deg);
    }

    details summary:focus-visible {
      text-decoration: underline;
    }

    .details-content {
      margin-top: 0.5rem;
      padding: 0.75rem 1rem;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      color: var(--ink-primary);
      line-height: 1.6;
    }

    /* Small Screen Adjustments */
    @media (max-width: 640px) {
      .document-stream {
        gap: 1.5rem;
      }
      .page-header-bar {
        margin-bottom: 1.25rem;
      }
      .document-header {
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
      }
    }

    /* ==========================================================================
       Print-Specific CSS: Highly Accessible, Clean Page Breaks, Crisp Typography
       ========================================================================== */
    @media print {
      @page {
        size: letter portrait;
        margin: 1.5cm 1.5cm 2cm 1.5cm;
      }

      *, *::before, *::after {
        background: transparent !important;
        color: #000000 !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }

      html, body {
        background: #ffffff !important;
        color: #000000 !important;
        padding: 0 !important;
        margin: 0 !important;
        font-size: 10.5pt !important;
        line-height: 1.5 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* Hide interactive buttons, download links, controls */
      button,
      .no-print,
      nav,
      [role="toolbar"],
      [role="dialog"],
      [aria-label*="download" i],
      [title*="Download" i],
      [title*="Print" i],
      .edit-figure-btn {
        display: none !important;
      }

      /* Physical page stream turns into distinct printed sheets */
      .document-stream {
        max-width: 100% !important;
        gap: 0 !important;
        display: block !important;
      }

      .document-page {
        border: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        padding: 0 !important;
        margin: 0 0 2cm 0 !important;
        max-width: 100% !important;
        background: #ffffff !important;
        break-after: page !important;
        page-break-after: always !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .document-page:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
        margin-bottom: 0 !important;
      }

      .page-header-bar {
        border-bottom: 0.5pt solid #cbd5e1 !important;
        margin-bottom: 12pt !important;
        padding-bottom: 4pt !important;
      }

      .page-badge {
        font-size: 8.5pt !important;
        color: #475569 !important;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
      }

      /* Headings in Print */
      h1, h2, h3, h4, h5, h6 {
        break-after: avoid !important;
        page-break-after: avoid !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        color: #000000 !important;
      }

      h1 {
        font-size: 18pt !important;
        line-height: 1.2 !important;
        margin-top: 0 !important;
        margin-bottom: 10pt !important;
      }

      h2 {
        font-size: 13.5pt !important;
        line-height: 1.25 !important;
        margin-top: 14pt !important;
        margin-bottom: 6pt !important;
        border-bottom: 1pt solid #cbd5e1 !important;
        padding-bottom: 3pt !important;
      }

      h3 {
        font-size: 11.5pt !important;
        line-height: 1.3 !important;
        margin-top: 10pt !important;
        margin-bottom: 4pt !important;
      }

      p, li, td, th {
        font-size: 10.5pt !important;
        line-height: 1.5 !important;
        color: #000000 !important;
      }

      /* Keep complex structures together across page breaks */
      figure, table, .notebox, mjx-container[display="true"] {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      mjx-container[display="true"] {
        overflow-x: visible !important;
        margin: 10pt 0 !important;
        text-align: center !important;
      }

      .notebox {
        border-left: 3pt solid #4338ca !important;
        border-top: 1pt solid #cbd5e1 !important;
        border-right: 1pt solid #cbd5e1 !important;
        border-bottom: 1pt solid #cbd5e1 !important;
        background-color: #f8fafc !important;
        padding: 8pt 12pt !important;
        margin: 10pt 0 !important;
      }

      figure {
        border: 1pt solid #cbd5e1 !important;
        margin: 12pt 0 !important;
      }

      figcaption {
        background-color: #f8fafc !important;
        border-top: 1pt solid #cbd5e1 !important;
        padding: 6pt 10pt !important;
        font-size: 9pt !important;
      }

      details summary {
        display: none !important;
      }

      .details-content {
        display: block !important;
        margin-top: 4pt !important;
        padding: 4pt 6pt !important;
        background: #ffffff !important;
        border: 0.5pt solid #cbd5e1 !important;
        font-size: 8.5pt !important;
        line-height: 1.4 !important;
      }

      table {
        border-collapse: collapse !important;
        width: 100% !important;
        margin: 10pt 0 !important;
      }

      th, td {
        border: 1pt solid #cbd5e1 !important;
        padding: 5pt 7pt !important;
        font-size: 9.5pt !important;
      }

      th {
        background-color: #f1f5f9 !important;
      }
    }
  </style>
</head>
<body>
  <main class="document-stream" role="main">
    ${cleanResults.map((r, i) => `
      <section class="document-page" id="page-sheet-${r.pageNumber}" aria-label="Page ${r.pageNumber} of ${cleanResults.length}">
        <div class="page-header-bar" aria-hidden="true">
          <span class="page-badge">Page ${r.pageNumber} of ${cleanResults.length}</span>
        </div>

        ${i === 0 ? `
          <header class="document-header">
            <h1 id="document-title">${escapeXml(effectiveTitle)}</h1>
            ${effectiveAuthor ? `<p class="document-author">Author: ${escapeXml(effectiveAuthor)}</p>` : ''}
          </header>
        ` : ''}

        <article class="math-content" id="page-content-${r.pageNumber}">
          ${r.html}
        </article>
      </section>
    `).join('\n')}
  </main>
</body>
</html>`;
};
