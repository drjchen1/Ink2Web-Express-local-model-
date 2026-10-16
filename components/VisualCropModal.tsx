import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cropImageFromDataUrl } from '../utils/image';
import { X, Crop, Check, RotateCcw } from 'lucide-react';

interface VisualCropModalProps {
  pageImage: string;
  figureId?: string;
  initialAlt?: string;
  initialCaption?: string;
  onSaveCrop: (croppedDataUrl: string, figureId?: string) => void;
  onClose: () => void;
}

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const VisualCropModal: React.FC<VisualCropModalProps> = ({
  pageImage,
  figureId,
  initialAlt = 'Visual diagram',
  initialCaption = '',
  onSaveCrop,
  onClose
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [crop, setCrop] = useState<CropRect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Helper to convert mouse/touch event to normalized percentages on the image
  const getCoordinates = useCallback((e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    if (!imgRef.current) return null;
    const rect = imgRef.current.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { x, y };
  }, []);

  const handlePointerDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;
    setIsDrawing(true);
    setStartPoint(coords);
    setCrop({ x: coords.x, y: coords.y, w: 0, h: 0 });
    setPreviewSrc(null);
  };

  const handlePointerMove = useCallback((e: MouseEvent) => {
    if (!isDrawing || !startPoint) return;
    const current = getCoordinates(e);
    if (!current) return;

    const x = Math.min(startPoint.x, current.x);
    const y = Math.min(startPoint.y, current.y);
    const w = Math.abs(current.x - startPoint.x);
    const h = Math.abs(current.y - startPoint.y);

    setCrop({ x, y, w, h });
  }, [isDrawing, startPoint, getCoordinates]);

  const handlePointerUp = useCallback(async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setStartPoint(null);

    // If crop is large enough (> 10px roughly, or > 1% in both dimensions)
    if (crop && crop.w > 0.02 && crop.h > 0.02) {
      try {
        const box2d: [number, number, number, number] = [
          Math.round(crop.y * 1000),
          Math.round(crop.x * 1000),
          Math.round((crop.y + crop.h) * 1000),
          Math.round((crop.x + crop.w) * 1000)
        ];
        const cropped = await cropImageFromDataUrl(pageImage, box2d, 10);
        setPreviewSrc(cropped);
      } catch (err) {
        console.error('Failed to crop preview:', err);
      }
    }
  }, [isDrawing, crop, pageImage]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => handlePointerMove(e);
    const onUp = () => handlePointerUp();

    if (isDrawing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDrawing, handlePointerMove, handlePointerUp]);

  const handleApplyCrop = () => {
    if (!previewSrc) return;
    setIsSaving(true);
    try {
      onSaveCrop(previewSrc, figureId);
      onClose();
    } catch (err) {
      console.error(err);
      setIsSaving(false);
    }
  };

  const handleResetCrop = () => {
    setCrop(null);
    setPreviewSrc(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-zinc-950/70 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-zinc-200/90 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Crop size={16} />
            </div>
            <div>
              <h2 id="crop-modal-title" className="text-sm sm:text-base font-bold text-zinc-900">
                {figureId ? 'Adjust & Re-crop Figure' : 'Crop Diagram from Page'}
              </h2>
              <p className="text-xs text-zinc-500">
                Click and drag on the original page below to select the exact visual area.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col md:flex-row gap-6 items-start justify-center bg-zinc-100/50">
          {/* Left/Main: Original Page Canvas / Image with Drag Selection */}
          <div className="flex-1 flex flex-col items-center w-full">
            <div 
              ref={containerRef}
              className="relative inline-block border border-zinc-300 rounded-xl overflow-hidden shadow-sm bg-white select-none cursor-crosshair touch-none"
              onMouseDown={handlePointerDown}
            >
              <img
                ref={imgRef}
                src={pageImage}
                alt="Original page to crop from"
                className="max-h-[62vh] max-w-full block pointer-events-none object-contain"
                draggable={false}
              />

              {/* Selection Rectangle Overlay */}
              {crop && crop.w > 0 && crop.h > 0 && (
                <div
                  className="absolute border-2 border-indigo-600 bg-indigo-500/20 shadow-xs pointer-events-none transition-none"
                  style={{
                    left: `${crop.x * 100}%`,
                    top: `${crop.y * 100}%`,
                    width: `${crop.w * 100}%`,
                    height: `${crop.h * 100}%`
                  }}
                >
                  {/* Subtle handles on corners */}
                  <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs" />
                  <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-indigo-600 rounded-xs" />
                </div>
              )}
            </div>

            <div className="mt-2.5 text-[11px] text-zinc-500 flex items-center gap-2">
              <span>💡 Drag a box across axes, curves, or labels you want to include.</span>
            </div>
          </div>

          {/* Right: Live Preview Panel */}
          <div className="w-full md:w-72 shrink-0 flex flex-col gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Crop Preview
            </h3>

            <div className="h-48 sm:h-56 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center p-2 overflow-hidden">
              {previewSrc ? (
                <img
                  src={previewSrc}
                  alt="Cropped visual preview"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                />
              ) : (
                <div className="text-center p-4">
                  <Crop size={24} className="mx-auto text-zinc-300 mb-2" />
                  <p className="text-xs text-zinc-400">
                    Drag a rectangle on the left to see the cropped result.
                  </p>
                </div>
              )}
            </div>

            {crop && (
              <button
                type="button"
                onClick={handleResetCrop}
                className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>Reset Selection</span>
              </button>
            )}

            <div className="pt-2 border-t border-zinc-100 text-xs text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-700">Target:</p>
              <p className="truncate text-zinc-600">{initialAlt || 'Diagram'}</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleApplyCrop}
            disabled={!previewSrc || isSaving}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Check size={14} />
            <span>Apply to Document</span>
          </button>
        </div>
      </div>
    </div>
  );
};
