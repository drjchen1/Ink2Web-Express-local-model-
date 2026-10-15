import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Zap, 
  FileText, 
  Download, 
  ShieldCheck, 
  Copy,
  Eye,
  Code,
  Image as ImageIcon,
  ChevronRight
} from 'lucide-react';
import InkWebLogo from './InkWebLogo';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col relative overflow-hidden border border-zinc-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl overflow-hidden shrink-0 shadow-xs border border-zinc-200">
              <InkWebLogo size={36} />
            </div>
            <div>
              <h2 id="help-modal-title" className="text-lg font-black text-zinc-950 tracking-tight flex items-center">
                Ink<span className="text-indigo-600 font-bold">2Web</span>
                <span className="ml-1.5 px-2 py-0.5 text-[10px] font-black italic tracking-wider uppercase bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-md shadow-xs transform -skew-x-6 inline-flex items-center gap-1 select-none">
                  <Zap size={10} className="fill-white text-white" /> Express
                </span>
              </h2>
              <p className="text-xs text-zinc-500 font-medium">
                Fast 2-pass accessible mathematical transcription
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-zinc-700">
          
          {/* Step 1: Upload */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
              1
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 mb-1 flex items-center gap-1.5">
                <FileText size={15} className="text-indigo-600" />
                Upload or Paste Notes
              </h3>
              <p className="text-zinc-600 leading-relaxed text-xs">
                Drag and drop your math lecture notes, problem sets, or multi-page scanned PDF documents. You can also paste screenshots directly from your clipboard with <kbd className="font-mono bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300 text-zinc-800 text-[11px]">Ctrl+V</kbd> / <kbd className="font-mono bg-zinc-100 px-1 py-0.5 rounded border border-zinc-300 text-zinc-800 text-[11px]">⌘V</kbd>, or try one of the instant sample notes.
              </p>
            </div>
          </div>

          {/* Step 2: Local Ollama Model */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-200">
              2
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 mb-1 flex items-center gap-1.5">
                <Zap size={15} className="text-amber-500 fill-amber-500" />
                Local Ollama Engine (qwen2.5vl:3b)
              </h3>
              <p className="text-zinc-600 leading-relaxed text-xs">
                Your notes are processed locally and privately on your machine with zero external cloud API dependencies:
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-zinc-600 list-disc list-inside">
                <li><strong className="text-zinc-800">100% Offline &amp; Private:</strong> No notes or images leave your machine. Everything runs through your local Ollama server at <code className="bg-zinc-100 px-1 rounded text-zinc-800 font-mono text-[11px]">localhost:11434</code>.</li>
                <li><strong className="text-zinc-800">Qwen2.5-VL 3B:</strong> A compact vision-language model tailored for optical character recognition, LaTeX equation transcribing, and tabular markdown structure.</li>
                <li><strong className="text-zinc-800">Quick Start:</strong> Run <code className="bg-zinc-100 px-1 rounded text-zinc-800 font-mono text-[11px]">ollama run qwen2.5vl:3b</code> in your terminal and then launch the app with <code className="bg-zinc-100 px-1 rounded text-zinc-800 font-mono text-[11px]">npm run dev</code>.</li>
              </ul>
            </div>
          </div>

          {/* Step 3: Smart Figures & Collapsible Descriptions */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 border border-indigo-200">
              3
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 mb-1 flex items-center gap-1.5">
                <ImageIcon size={15} className="text-indigo-600" />
                Smart Figures &amp; Collapsible Descriptions
              </h3>
              <p className="text-zinc-600 leading-relaxed text-xs">
                Graphs and diagrams are cropped from your notes into clean visual figures. Each figure includes a concise title and a clickable right arrow (<strong className="text-indigo-600 font-semibold">› Detailed description</strong>) that smoothly expands to reveal an in-depth, accessible visual breakdown.
              </p>
            </div>
          </div>

          {/* Step 4: Accessible Output & Standalone Export */}
          <div className="flex gap-3.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200">
              4
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck size={15} className="text-emerald-600" />
                WCAG 2.2 AA Export
              </h3>
              <p className="text-zinc-600 leading-relaxed text-xs">
                Enjoy high-contrast typography, screen-reader-friendly LaTeX MathJax, and semantic landmarks. Switch between <strong>Rendered Preview</strong> and <strong>HTML Source</strong>, or click <strong>Download HTML</strong> for a 100% self-contained file that runs offline in any browser.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs">
          <a 
            href="https://www.w3.org/WAI/standards-guidelines/wcag/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-zinc-500 hover:text-indigo-700 transition-colors flex items-center gap-1 font-medium"
          >
            <ShieldCheck size={13} className="text-emerald-600" />
            W3C WCAG 2.2 Standards
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl font-semibold transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>

      </div>
    </div>
  );
};

export default HelpModal;
