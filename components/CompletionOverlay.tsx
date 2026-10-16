import React, { useEffect } from 'react';
import { CheckCircle2, Server, ArrowRight, X } from 'lucide-react';

interface CompletionOverlayProps {
  totalSeconds: number;
  pageCount: number;
  onDismiss: () => void;
}

const CompletionOverlay: React.FC<CompletionOverlayProps> = ({
  totalSeconds,
  pageCount,
  onDismiss
}) => {
  // Allow dismissing with Escape or Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const formattedSeconds = totalSeconds % 1 === 0 ? totalSeconds.toString() : totalSeconds.toFixed(1);
  const perPageSeconds = pageCount > 1 
    ? (totalSeconds / pageCount).toFixed(1)
    : null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40"
      role="dialog"
      aria-modal="true"
      aria-label="Conversion completed"
      onClick={onDismiss}
    >
      <div 
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-xl flex flex-col items-center text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dismiss X button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          aria-label="Dismiss completion message"
        >
          <X size={18} />
        </button>

        {/* Success Icon */}
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mb-4 shadow-xs">
          <CheckCircle2 size={32} className="stroke-[2.5]" />
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mb-2">
          Done. Conversion completed in{' '}
          <span className="text-indigo-600 font-extrabold underline decoration-indigo-200 decoration-4 underline-offset-2">
            {formattedSeconds}
          </span>{' '}
          {totalSeconds === 1 ? 'second' : 'seconds'}
        </h2>

        {/* Speed / Page breakdown */}
        <p className="text-xs sm:text-sm text-zinc-600 mb-6 font-medium leading-relaxed max-w-xs">
          {pageCount > 1 
            ? `Successfully converted ${pageCount} pages (~${perPageSeconds}s per page) with 2-Pass Express quality.`
            : 'Successfully converted 1 page with 2-Pass Express quality.'}
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 font-semibold text-zinc-700 border border-zinc-200/80">
            <Server size={13} className="text-indigo-600" />
            Local Ollama
          </span>
        </div>

        {/* Dismiss Button */}
        <button
          type="button"
          onClick={onDismiss}
          autoFocus
          className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer group focus:outline-none focus:ring-3 focus:ring-indigo-500/40"
        >
          <span>View Document</span>
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </button>

        <p className="text-[11px] text-zinc-400 mt-3 font-medium">
          Click anywhere or press Enter or Esc to dismiss
        </p>
      </div>
    </div>
  );
};

export default CompletionOverlay;
