# Ink2Web Express

**Ink2Web Express** is a privacy-first web application that turns handwritten math notes, lecture sheets, scanned documents, and PDFs into clean, accessible HTML with beautifully formatted MathJax LaTeX equations and visual diagram extractions.

Everything runs **100% locally and offline** on your computer using [Ollama](https://ollama.com/) with compact vision-language models (e.g. `qwen2.5vl:3b`), meaning:
- 🔒 **Zero cloud uploads** — your private documents never leave your machine.
- ⚡ **No API keys or recurring subscriptions needed**.
- 💻 **Runs comfortably on everyday hardware**, including Apple Silicon (M1/M2/M3/M4 with 8 GB RAM) and mid-range PC/Linux laptops.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [macOS](#macos-setup)
   - [Windows (WSL or Native)](#windows-setup)
   - [Linux (Ubuntu / Debian / Fedora)](#linux-setup)
3. [Installing the Vision Model](#installing-the-vision-model)
4. [Running the Application](#running-the-application)
5. [How to Use the App](#how-to-use-the-app)
   - [Uploading Documents](#1-uploading-documents)
   - [Live Conversion Progress](#2-live-conversion-progress)
   - [Previewing & Inspecting HTML](#3-previewing--inspecting-html)
   - [Adjusting Diagram Crops](#4-adjusting-diagram-crops-interactive-crop-tool)
   - [Exporting Your Work](#5-exporting-your-work)
6. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Prerequisites

Before starting, you only need two free tools installed on your computer:
1. **Node.js** (version 18 or newer) — includes `npm` to run the web frontend.
2. **Ollama** — the local engine that downloads and runs the AI vision model offline.

---

## Step-by-Step Setup Guide

Follow the instructions below for your operating system.

### macOS Setup

1. **Install Node.js:**
   - Download the macOS installer from [nodejs.org](https://nodejs.org/) (select the **LTS** version) and run the installer.
   - *Or via Homebrew:*
     ```bash
     brew install node
     ```
   - Verify installation in Terminal:
     ```bash
     node -v
     npm -v
     ```

2. **Install Ollama:**
   - Download Ollama for Mac directly from [ollama.com/download/mac](https://ollama.com/download/mac) and drag it to your `Applications` folder.
   - Open Ollama from Applications. You will see an Ollama icon in your top menu bar showing that the local server is running.

---

### Windows Setup

1. **Install Node.js:**
   - Download the Windows installer (`.msi`) from [nodejs.org](https://nodejs.org/) (select the **LTS** version).
   - Follow the setup wizard (make sure the box for *"Automatically install the necessary tools"* or adding Node to PATH is checked).
   - Open **Command Prompt** (cmd) or **PowerShell** and verify:
     ```powershell
     node -v
     npm -v
     ```

2. **Install Ollama:**
   - Download Ollama for Windows from [ollama.com/download/windows](https://ollama.com/download/windows).
   - Run the installer. Once installed, Ollama runs in the background and places an icon in your system tray.

---

### Linux Setup

1. **Install Node.js (Ubuntu / Debian):**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
   Verify:
   ```bash
   node -v
   npm -v
   ```

2. **Install Ollama:**
   ```bash
   curl -fsSL https://ollama.com/install.sh | sh
   ```
   Start the Ollama service:
   ```bash
   ollama serve
   ```

---

## Installing the Vision Model

Ink2Web Express is optimized for the compact, highly capable **`qwen2.5vl:3b`** model (Qwen 2.5 Vision-Language, 3 Billion parameters). It requires only ~2.5 GB of disk space and under 4 GB of RAM, making it fast and lightweight.

Open your Terminal (macOS/Linux) or PowerShell (Windows) and run:

```bash
ollama run qwen2.5vl:3b
```

- If you don't have the model yet, Ollama will automatically download it.
- Once you see a prompt like `>>> Send a message (/? for help)`, the model is ready! You can type `/bye` and press Enter to exit the interactive prompt; the Ollama background service remains running and ready to handle requests from the app.

> **Tip:** You can check that Ollama is responding anytime by visiting [http://localhost:11434](http://localhost:11434) in your browser. It should say: `Ollama is running`.

---

## Running the Application

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/drjchen1/Ink2Web-Express-local-model-.git
   cd Ink2Web-Express-local-model-
   ```

2. **Install Project Dependencies:**
   ```bash
   npm install
   ```

3. **Start the Web App:**
   ```bash
   npm run dev
   ```

4. **Open in Browser:**
   Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

The app connects to your local Ollama instance through Vite's built-in backend proxy (`/api/ollama` $\rightarrow$ `http://127.0.0.1:11434`), eliminating any browser CORS restrictions without needing any extra configuration.

---

## How to Use the App

### 1. Uploading Documents
- Drag and drop any **PDF**, **PNG**, **JPG/JPEG**, or **HEIC** file into the upload dropzone, or click **"Browse Files"**.
- You can upload single-page notes or multi-page PDF documents.
- In the top-right model selector, make sure **Local Ollama (qwen2.5vl:3b)** is selected (it is the default).

### 2. Live Conversion Progress
- The conversion starts automatically upon file selection.
- An animated overlay displays:
  - Current processing stage (image preparation, streaming transcription, LaTeX verification, figure detection).
  - A real-time character ticker as Ollama streams back output.
  - Overall document progress percentage.

### 3. Previewing & Inspecting HTML
Once conversion finishes, you are taken to the **Results Screen**:
- **Rendered Preview:** Displays the complete digitized document with rendered LaTeX equations (using MathJax 3) and extracted visual diagrams.
- **HTML Source:** Click the **"HTML Source"** tab in the top toolbar to inspect or directly edit the raw HTML with syntax highlighting.
- **Pagination Controls:** For multi-page PDFs, navigate between pages or switch to **"Continuous / All Pages"** mode to view the entire document seamlessly.

### 4. Adjusting Diagram Crops (Interactive Crop Tool)
Handwritten math diagrams, coordinate axes, and curves can sometimes have complex shapes or slight coordinate offsets.
- On each page sheet, click the **"Adjust Diagram Crop"** button located on the top bar.
- An interactive modal will open showing the original, full-resolution page.
- **Click and drag a box** across the exact diagram, curves, and labels you want.
- Preview the cropped result in the side panel, then click **"Apply to Document"**.
- The preview and exported HTML will update immediately without needing to re-transcribe the text or stress your local AI model.

### 5. Exporting Your Work
- **Copy HTML:** Click **"Copy HTML"** in the top toolbar to copy the clean, self-contained HTML to your clipboard for pasting into Notion, Canvas, Google Sites, or a blog.
- **Download Accessible HTML:** Click **"Download HTML"** to save a standalone `.html` file. The exported file has embedded styles, MathJax scripts, and base64-encoded images so it opens and renders equations in any web browser without needing any internet connection or external server.

---

## Troubleshooting & FAQs

### "Cannot connect to Ollama" or "Ollama offline"
1. Verify that Ollama is actually running on your computer:
   - macOS: Look for the Ollama llama icon in your top menu bar.
   - Windows: Check your bottom-right system tray.
   - Linux: Run `curl http://127.0.0.1:11434` in your terminal; it should return `"Ollama is running"`.
2. If it's not running, launch it from your applications or run `ollama serve` in a terminal window.

### "Model not found: qwen2.5vl:3b"
Pull the vision model manually by opening your terminal and typing:
```bash
ollama pull qwen2.5vl:3b
```

### Can I run a larger or smaller model?
Yes. If your system has more memory (e.g. 16 GB+ RAM or dedicated GPU), you can pull and use larger models like `qwen2.5vl:7b` with:
```bash
ollama run qwen2.5vl:7b
```
The app will detect any installed vision model in your Ollama library.

### Port 3000 is already in use
If another application is using port 3000, you can specify a different port in `vite.config.ts` or run:
```bash
npm run dev -- --port 3001
```

---

## License

This project is licensed under the [MIT License](LICENSE).
