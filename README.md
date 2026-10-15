# Ink2Web Express (Local Offline Math Digitizer)

Converts handwritten math notes and PDF documents into accessible HTML with MathJax LaTeX equations, using local Ollama.

## Quick Start (Offline Setup)

### 1. Install Dependencies
Make sure you install the project dependencies first:
```bash
npm install
```
*(or `bun install` if using Bun)*

### 2. Start Local Ollama with Vision Model
In a separate terminal window, launch your local Ollama model:
```bash
ollama run qwen2.5vl:3b
```
*(If you haven't pulled the model yet, Ollama will automatically download it on first run).*

### 3. Start the Web App
```bash
npm run dev
```

Open `http://localhost:3000` in your web browser. The app connects to your local Ollama instance through the built-in Vite dev proxy at `/api/ollama` (forwarded to `http://127.0.0.1:11434`), avoiding any browser CORS blocks.
