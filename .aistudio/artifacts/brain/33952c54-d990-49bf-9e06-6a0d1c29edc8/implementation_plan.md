# Local Ollama Migration (Qwen2.5-VL 3B) for Offline Transcription

A complete transition of the Ink2Web Express mathematics digitization pipeline from cloud-hosted Google Gemini to a locally hosted Ollama instance running `qwen2.5vl:3b`. This enables 100% private, offline-capable transcription of handwritten math notes into WCAG 2.2 AA accessible HTML with MathJax LaTeX equations.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed during requirements clarification:
> - **Connection Strategy**: Vite dev server proxy (`/api/ollama`) forwarding to `http://localhost:11434` to prevent browser CORS and Private Network Access blocks, with fallback direct fetch and live endpoint test.
> - **Provider Scope**: Fully replace Google Gemini with Ollama throughout the app, stripping cloud dependencies and preparing the app for purely offline local operation.
> - **Model & Prompt Strategy**: Streamlined transcription prompt optimized for `qwen2.5vl:3b` that reliably outputs clean semantic HTML, inline `\( ... \)`, and block `\[ ... \]` LaTeX without overloading the 3B model with massive multi-nested JSON schemas.
> - **Model Identifier**: Defaulting to `qwen2.5vl:3b` with in-app configuration allowing users to adjust the model tag (e.g., `qwen2.5-vl:3b`, `qwen2.5-vl:7b`) and server address.

---

## 1. Overview & Core Concept

- **What It Does**: Transcribes scanned or photographed handwritten math equations, lecture notes, and diagrams directly on the user's local machine using a local vision-language model (`qwen2.5vl:3b` served by Ollama). Converts raw handwriting into accessible semantic HTML with MathJax equations and formatted notes without sending data to external cloud APIs.
- **Target Audience / Persona**: Students, researchers, educators, and privacy-conscious users who want to run note digitization offline on local hardware (Mac, Linux, or PC with GPU or Apple Silicon) with zero API keys or external quotas.
- **Key Value**: 100% data sovereignty, zero ongoing API costs, unlimited local processing, and full offline autonomy.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Ollama Setup & Health Check**: The app header and dashboard display a clean connection status indicator showing whether Ollama is reachable at `http://localhost:11434` and whether `qwen2.5vl:3b` is loaded.
  2. **One-Click Guidance**: If Ollama is not detected, a helpful drawer or modal shows copyable terminal commands: `ollama run qwen2.5vl:3b`.
  3. **Document Ingestion**: User drops or uploads multi-page PDFs or image files (PNG, JPG, HEIC).
  4. **Local Processing State**: Dedicated progress overlay displays the active page, elapsed time, and local model inference phase without claiming fake remote telemetry.
  5. **Review & Interactive Editing**: Rendered MathJax document preview alongside raw HTML editor, with one-click export to standalone accessible HTML.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Refined, clean academic workbench style following the existing zinc and indigo design system.
  - *Color Palette & Mood*: High contrast neutral canvas (`#fafafa` / `#ffffff`), slate typography (`text-zinc-900`), and quiet status indicators (solid green text/border for connected, amber for waiting).
  - *Zero-Pill Restraint*: No pseudo-cockpit telemetry or pill badge sandwiches; clean inline labels (`Ollama · qwen2.5vl:3b · Local`).
- **Interactive Feedback**:
  - Live "Check Connection" button that tests `/api/ollama/api/tags` and lists available local models in a dropdown.
  - Graceful error states explaining when Ollama is offline or when the model needs to be pulled.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Dev Server Proxy vs Direct Client Fetch**
  - *Chosen Approach*: Configure Vite dev server to proxy `/api/ollama/*` to `http://localhost:11434/*` while also supporting configurable direct endpoint URLs in client settings for production builds.
  - *Why*: Browsers enforce strict CORS and Chrome Private Network Access restrictions when a web page calls `localhost:11434`. A proxy completely eliminates CORS errors while developing and running locally via `npm run dev`.
  - *Alternatives Considered*: Requiring the user to launch Ollama with custom environment variables (`OLLAMA_ORIGINS="*"`) is error-prone for non-technical users.
- **Decision 2: 3B Vision Prompt Optimization**
  - *Chosen Approach*: Streamlined prompt directing `qwen2.5vl:3b` to transcribe notes directly into semantic HTML with LaTeX math enclosed in standard tags, with robust regex extraction if the model wraps output in markdown codeblocks (` ```html ... ``` `).
  - *Why*: 3B models frequently fail or hallucinate when forced to output complex deeply nested JSON schemas with pixel bounding boxes. Direct structured HTML generation is significantly faster and higher fidelity on 3B weights.
- **Decision 3: Complete Gemini Removal**
  - *Chosen Approach*: Remove `@google/genai` calls from the primary execution paths, replacing `geminiService.ts` with a dedicated, lightweight `ollamaService.ts`.
  - *Why*: User explicitly requested full replacement to test local offline execution without dual-engine clutter.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser Client                        │
│                                                             │
│   ┌─────────────────────┐       ┌────────────────────────┐  │
│   │   Dropzone / PDF    │  ──>  │  Image Normalization   │  │
│   │   File Ingestion    │       │  (Canvas / HEIC / JPG) │  │
│   └─────────────────────┘       └───────────┬────────────┘  │
│                                             │               │
│                                             ▼               │
│   ┌──────────────────────────────────────────────────────┐  │
│   │               useDocumentProcessing Hook             │  │
│   │   - Page queueing & status messages                  │  │
│   │   - Base64 image payload preparation                 │  │
│   └─────────────────────────┬────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│   ┌──────────────────────────────────────────────────────┐  │
│   │                  ollamaService.ts                    │  │
│   │   - Health check (/api/ollama/api/tags)              │  │
│   │   - Vision chat query (/api/ollama/api/chat)         │  │
│   │   - Streamlined 3B prompt & HTML/LaTeX parser        │  │
│   └─────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼───────────────────────────────┘
                              │ HTTP POST (Base64 + Prompt)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Vite Dev Server (Port 3000)                 │
│                 Proxy: /api/ollama -> localhost:11434       │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│             Local Ollama Server (localhost:11434)           │
│             Model: qwen2.5vl:3b                             │
│             - Local GPU / CPU Vision Inference              │
│             - Streaming / Non-streaming token generation   │
└─────────────────────────────────────────────────────────────┘
```

### Data Model & State Mapping

1. **Ollama Configuration State**:
   - `endpoint`: string (default `/api/ollama` with fallback to `http://localhost:11434`)
   - `model`: string (default `qwen2.5vl:3b`, with support for `qwen2.5-vl:3b`)
   - `status`: `'checking' | 'connected' | 'disconnected' | 'model-not-found'`
   - `availableModels`: list of local model names retrieved from `/api/tags`
2. **Page Transcription Payload**:
   - Transcribes each page image (base64 string without data URL prefix) via Ollama `/api/chat` with `messages: [{ role: 'user', content: prompt, images: [base64] }]`.
   - Cleans response string, extracts HTML structure, normalizes math delimiters (`\( ... \)` and `\[ ... \]`), and populates `GeminiPageResponse` / `PageTranscriptionResult` format for the existing preview and editor UI.
3. **Packaging for Offline Run**:
   - Update `package.json` scripts and clear instructions in the Help/Docs modal for downloading and running offline via `npm run dev`.

---

## 5. Verification & Completion Status

- [x] Vite dev server proxy added for `/api/ollama` pointing to `http://localhost:11434` to prevent browser CORS issues.
- [x] Replaced Google Gemini with dedicated `services/ollamaService.ts`.
- [x] Streamlined vision prompt crafted specifically for `qwen2.5vl:3b` with direct semantic HTML, `\( ... \)` and `\[ ... \]` LaTeX formatting.
- [x] Health check prober integrated into `Dashboard.tsx` with one-click terminal commands (`ollama run qwen2.5vl:3b`), model picker, and connection refresh.
- [x] Updated `types.ts`, `hooks/useDocumentProcessing.ts`, `hooks/useDocumentState.ts`, and `App.tsx` with dynamic model support.
- [x] Documentation in `HelpModal.tsx` and processing badges in `ProcessingOverlay.tsx` updated for offline local execution.
- [x] Verified clean TypeScript compilation and dev server restart.

