# Refactoring & Code Cleanup Plan (Completed)

## 1. Executive Summary & Context
Over multiple development phases, prototype features (such as experimental TTS audio narration, legacy image generation, and an initial capybara mascot logo) were introduced alongside older single-call OCR and remediation helpers. The application now runs on an optimized, unified **2-Pass Express pipeline** powered by **Gemini 3.5 Flash-Lite**.

All dead files, obsolete types, and legacy functions in `geminiService.ts` have been removed.

---

## 2. Inventory of Removed Code & Changes

### A. Orphaned Component Files (Deleted)
- `components/CapybaraLogo.tsx`: Removed (superseded by `InkWebLogo.tsx`).

### B. Unimported Prototype Service Files (Deleted)
- `services/imageService.ts`: Removed (unwired prototype).
- `services/ttsService.ts`: Removed (unwired prototype).

### C. Dead Legacy Functions in `services/geminiService.ts` (Pruned ~390 lines)
The 2-pass engine handles OCR, table formatting, figure extraction, bounding boxes, alt text, and LaTeX verification directly. The following unused functions were safely removed:
- `fixTextFormatting`
- `autoFixAccessibilityIssue`
- `autoFixAllAccessibilityIssues`
- `describeFigure`
- `generateSvgDiagramFromImage`

The remaining service contains only the active pipeline:
1. `getSystemInstruction`: WCAG 2.2 AA math transcription guidelines.
2. `callBatchGeminiWithRetry`: Vision OCR and structured extraction via Gemini 3.5 Flash-Lite.
3. `convertBatchToHtml`: Pass 1 batch processing with HTML formatting.
4. `inspectAndPolishPageHtml`: Pass 2 sub-second LaTeX delimiter & tag inspection.

### D. Obsolete Types in `types.ts` (Pruned)
- Removed `NarrationOption` (`'none' | 'transcript' | 'full-audio'`).
- Removed `MultiFileMode` (`'combine' | 'separate'`).
- Cleaned `ModelType` to `'gemini-3.5-flash-lite' | 'gemini-3.1-flash-lite' | 'gemini-3.8-flash' | 'gemini-3.5-flash'`.

---

## 3. Verification
- **Linter (`tsc --noEmit`)**: Passed with 0 errors.
- **Production Build (`vite build`)**: Succeeded cleanly.
