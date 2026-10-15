import React, { useState, useRef, useEffect, useCallback } from 'react';
import InkWebLogo from './InkWebLogo';
import { 
  Zap, 
  UploadCloud, 
  Camera,
  BookOpen,
  Waves,
  Grid3X3,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Settings2
} from 'lucide-react';
import { createSampleMathNoteFile } from '../utils/sampleData';
import { checkOllamaHealth, DEFAULT_OLLAMA_MODEL, DEFAULT_OLLAMA_ENDPOINT } from '../services/ollamaService';
import { OllamaStatus } from '../types';

interface DashboardProps {
  onFileUpload: (files: File[]) => void;
  isProcessing: boolean;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
  onShowDocs?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  onFileUpload, 
  isProcessing,
  selectedModel = DEFAULT_OLLAMA_MODEL,
  onModelChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [pasteShortcut, setPasteShortcut] = useState('⌘V');
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('checking');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState<string>(DEFAULT_OLLAMA_ENDPOINT);
  const [copied, setCopied] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [statusDetail, setStatusDetail] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const verifyOllama = useCallback(async () => {
    setOllamaStatus('checking');
    setStatusDetail('Checking local Ollama connection...');
    try {
      const health = await checkOllamaHealth(endpoint, selectedModel);
      setAvailableModels(health.models);
      if (health.ok) {
        if (health.hasTargetModel || health.models.length === 0) {
          setOllamaStatus('connected');
          setStatusDetail(`Connected to Ollama (${health.activeEndpoint})`);
        } else {
          setOllamaStatus('model-missing');
          setStatusDetail(`Ollama is running, but model "${selectedModel}" was not found.`);
        }
      } else {
        setOllamaStatus('offline');
        setStatusDetail('Ollama server is not detected on localhost:11434.');
      }
    } catch {
      setOllamaStatus('offline');
      setStatusDetail('Could not connect to Ollama.');
    }
  }, [endpoint, selectedModel]);

  useEffect(() => {
    verifyOllama();
  }, [verifyOllama]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      setPasteShortcut(isMac ? '⌘V' : 'Ctrl+V');
    }
  }, []);

  // Global paste handler for instant screenshot/image paste
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            const renamedFile = new File([file], `math_note_${Date.now()}.png`, { type: file.type });
            pastedFiles.push(renamedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        onFileUpload(pastedFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isProcessing, onFileUpload]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onFileUpload(files);
    }
    if (event.target) event.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isProcessing) return;

    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      onFileUpload(files);
    }
  };

  const triggerSampleNote = (topic: 'calculus' | 'fourier' | 'linear_algebra') => {
    if (isProcessing) return;
    const sampleFile = createSampleMathNoteFile(topic);
    onFileUpload([sampleFile]);
  };

  const copyRunCommand = () => {
    navigator.clipboard.writeText(`ollama run ${selectedModel}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[72vh] w-full px-4 py-6">
      {/* Hidden File Inputs */}
      <input 
        ref={fileInputRef}
        type="file" 
        multiple 
        className="sr-only" 
        accept="application/pdf,image/*,.heic,.heif,.txt" 
        onChange={handleFileChange} 
        disabled={isProcessing} 
        id="file-upload-input"
      />
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*"
        capture="environment"
        className="sr-only" 
        onChange={handleFileChange} 
        disabled={isProcessing} 
        id="camera-upload-input"
      />

      <div className="w-full max-w-lg mx-auto flex flex-col items-center text-center">
        
        {/* Streamlined Brand Header */}
        <div className="flex flex-col items-center mb-5">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center rounded-2xl mb-3 shadow-xs bg-white border border-zinc-200/90 transition-transform duration-200 hover:scale-105 cursor-pointer"
            onClick={() => fileInputRef.current?.click()} 
            title="Click to browse files"
          >
            <InkWebLogo size={54} glow={true} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-950 flex items-center justify-center">
            <span>Ink<span className="text-indigo-600 font-bold">2Web</span></span>
            <span className="ml-2 px-2 py-0.5 text-xs font-black italic tracking-wider uppercase bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-md shadow-xs transform -skew-x-6 inline-flex items-center gap-1 select-none">
              <Zap size={11} className="fill-white text-white" /> Express
            </span>
          </h1>

          <p className="text-zinc-500 text-xs sm:text-sm font-medium mt-1.5 max-w-sm">
            Convert handwritten math notes into accessible HTML using local Ollama.
          </p>
        </div>

        {/* Local Ollama Status & Connection Card */}
        <div className="w-full mb-5 bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-xs text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                ollamaStatus === 'connected' 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                  : ollamaStatus === 'checking'
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                {ollamaStatus === 'connected' ? (
                  <CheckCircle2 size={16} />
                ) : ollamaStatus === 'checking' ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Server size={15} />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900">Local Ollama</span>
                  <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                    {selectedModel}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                  {statusDetail}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={verifyOllama}
                disabled={ollamaStatus === 'checking'}
                className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                title="Refresh connection status"
                aria-label="Refresh connection"
              >
                <RefreshCw size={13} className={ollamaStatus === 'checking' ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  showConfig ? 'bg-indigo-50 text-indigo-700' : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                }`}
                title="Model & connection settings"
                aria-label="Toggle settings"
              >
                <Settings2 size={14} />
              </button>
            </div>
          </div>

          {/* Offline Quick-Start Helper */}
          {ollamaStatus === 'offline' && (
            <div className="mt-3 pt-3 border-t border-zinc-100 text-xs">
              <div className="flex items-center justify-between bg-zinc-50 rounded-xl p-2.5 border border-zinc-200">
                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-800 truncate select-all">
                  <span className="text-zinc-400">$</span>
                  <span>ollama run {selectedModel}</span>
                </div>
                <button
                  type="button"
                  onClick={copyRunCommand}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                >
                  {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 mt-1.5 px-0.5">
                Run this command in your terminal to start Ollama with the Qwen2.5-VL 3B model.
              </p>
            </div>
          )}

          {/* Model Missing Helper */}
          {ollamaStatus === 'model-missing' && (
            <div className="mt-3 pt-3 border-t border-zinc-100 text-xs">
              <div className="flex items-center justify-between bg-amber-50/60 rounded-xl p-2.5 border border-amber-200">
                <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-800 truncate select-all">
                  <span className="text-amber-600 font-bold">$</span>
                  <span>ollama pull {selectedModel}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`ollama pull ${selectedModel}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg transition-colors cursor-pointer shrink-0 ml-2"
                >
                  {copied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Collapsible Config Drawer */}
          {showConfig && (
            <div className="mt-3 pt-3 border-t border-zinc-100 space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Model Identifier
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedModel}
                    onChange={(e) => onModelChange?.(e.target.value)}
                    placeholder="qwen2.5vl:3b"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {availableModels.length > 0 && (
                    <select
                      value={selectedModel}
                      onChange={(e) => onModelChange?.(e.target.value)}
                      className="px-2 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 text-xs bg-white cursor-pointer"
                    >
                      <option value="qwen2.5vl:3b">qwen2.5vl:3b (default)</option>
                      {availableModels
                        .filter(m => m !== 'qwen2.5vl:3b')
                        .map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))
                      }
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                  Ollama Endpoint
                </label>
                <input
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/ollama or http://localhost:11434"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 text-zinc-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[10px] text-zinc-400 mt-1">
                  Default <code>/api/ollama</code> routes through Vite proxy to avoid browser CORS restrictions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Single, Unified Interactive Dropzone Card */}
        <div 
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !isProcessing) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`w-full relative text-center p-8 sm:p-10 border-2 border-dashed rounded-3xl bg-white transition-all duration-200 shadow-xs cursor-pointer select-none group focus:outline-none focus:ring-3 focus:ring-indigo-600/20 ${
            isDragging 
              ? 'border-indigo-600 bg-indigo-50/60 scale-[1.01] shadow-lg shadow-indigo-600/10' 
              : 'border-zinc-300/90 hover:border-indigo-500 hover:bg-zinc-50/50 hover:shadow-sm'
          }`}
          id="main-dropzone-card"
        >
          <div className="flex flex-col items-center pointer-events-none">
            {/* Upload Icon */}
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-200 ${
              isDragging 
                ? 'bg-indigo-600 text-white scale-110 shadow-md' 
                : 'bg-indigo-50 text-indigo-600 border border-indigo-100 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white'
            }`}>
              <UploadCloud size={28} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
            </div>

            <h2 className="text-base sm:text-lg font-bold text-zinc-900 tracking-tight mb-1">
              Drop notes here, or <span className="text-indigo-600 underline decoration-indigo-300 underline-offset-2">browse files</span>
            </h2>
            
            <p className="text-zinc-500 text-xs mb-3.5 font-medium">
              Upload PDF or images, or paste directly with <kbd className="font-mono text-[10px] bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200 text-zinc-700 font-bold">{pasteShortcut}</kbd>
            </p>

            <span className="text-[11px] font-semibold text-zinc-400">
              PDF · PNG · JPG · WebP · HEIC
            </span>
          </div>

          {/* Quick camera trigger on mobile */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              cameraInputRef.current?.click();
            }}
            disabled={isProcessing}
            className="sm:hidden absolute top-3 right-3 p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl border border-zinc-200 transition-colors"
            title="Take photo with camera"
            aria-label="Take photo with camera"
          >
            <Camera size={14} />
          </button>
        </div>

        {/* Lightweight Inline Sample Notes */}
        <div className="mt-5 flex items-center justify-center gap-1.5 sm:gap-2 text-xs text-zinc-500 flex-wrap">
          <span>Or try a sample:</span>
          <button
            type="button"
            onClick={() => triggerSampleNote('calculus')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-zinc-700 font-semibold border border-zinc-200/80 transition-colors cursor-pointer"
            title="Differential Equations: Malthusian Growth Model with diagram"
          >
            <BookOpen size={12} className="text-indigo-600" />
            <span>Calculus</span>
          </button>

          <button
            type="button"
            onClick={() => triggerSampleNote('fourier')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-zinc-700 font-semibold border border-zinc-200/80 transition-colors cursor-pointer"
            title="Fourier Series: Orthogonal expansions & square wave summation"
          >
            <Waves size={12} className="text-violet-600" />
            <span>Fourier</span>
          </button>

          <button
            type="button"
            onClick={() => triggerSampleNote('linear_algebra')}
            disabled={isProcessing}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-zinc-700 font-semibold border border-zinc-200/80 transition-colors cursor-pointer"
            title="Linear Algebra: Characteristic polynomial, eigenvalues & diagonalization"
          >
            <Grid3X3 size={12} className="text-indigo-600" />
            <span>Matrices</span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
