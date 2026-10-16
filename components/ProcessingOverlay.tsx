import React from 'react';
import { ModelType } from '../types';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  progress: number;
  currentImages?: string[] | null;
  selectedModel?: ModelType;
  actualModelUsed?: ModelType;
  selectedThinkingLevel?: string;
  statusMessage?: string;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ 
  progress, 
  selectedModel,
  actualModelUsed,
  statusMessage 
}) => {
  const isDone = progress >= 100;
  const clampedProgress = Math.min(100, Math.max(5, Math.round(progress)));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40"
      role="dialog"
      aria-modal="true"
      aria-label="Converting notes to accessible HTML"
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-zinc-200 shadow-lg flex flex-col items-center text-center">
        {/* Simple spinner */}
        <div className="mb-4 text-indigo-600">
          <Loader2 size={32} className="animate-spin" />
        </div>

        {/* Clean status title */}
        <h2 className="text-base font-bold text-zinc-900 mb-1">
          {isDone ? 'Finalizing Document' : 'Converting Document'}
        </h2>

        {/* Concise status message */}
        <p className="text-xs text-zinc-600 mb-4 font-medium truncate max-w-full px-2">
          {statusMessage || 'Processing...'}
        </p>

        {/* Standard Progress Bar */}
        <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden border border-zinc-200 mb-2">
          <div 
            className="h-full bg-indigo-600 rounded-full transition-all duration-300"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* Percentage & model */}
        <div className="flex items-center justify-between w-full px-1 text-xs text-zinc-500 font-medium">
          <span>{actualModelUsed || selectedModel || 'qwen2.5vl:3b'}</span>
          <span className="font-mono font-bold text-indigo-700">{clampedProgress}%</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
