import React, { useRef, useEffect, useState } from 'react';
import { ConversionResult, LayoutMode } from '../types';
import { ResultsToolbar } from './ResultsToolbar';
import { ResultsContent } from './ResultsContent';
import { generateHtmlDocument } from '../utils/exportHtml';
import { VisualCropModal } from './VisualCropModal';

interface ResultsViewProps {
  results: ConversionResult[];
  activeTab: number;
  setActiveTab: (index: number) => void;
  viewMode: 'preview' | 'source';
  setViewMode: (mode: 'preview' | 'source') => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  onDownloadHtml: () => void;
  onReset: () => void;
  onUpdateHtml: (pageIndex: number, html: string) => void;
  onUpdateFigureImage?: (pageIndex: number, figureId: string, newSrc: string) => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({
  results,
  activeTab,
  setActiveTab,
  viewMode,
  setViewMode,
  layoutMode,
  setLayoutMode,
  onDownloadHtml,
  onReset,
  onUpdateHtml,
  onUpdateFigureImage
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Crop Modal state
  const [cropModalData, setCropModalData] = useState<{
    pageIndex: number;
    figureId?: string;
    pageImage: string;
    alt?: string;
    caption?: string;
  } | null>(null);

  const handleOpenCropModal = (
    pageIndex: number, 
    figureId?: string, 
    alt?: string, 
    caption?: string
  ) => {
    const pageImage = results[pageIndex]?.pageImage;
    if (!pageImage) return;
    setCropModalData({
      pageIndex,
      figureId: figureId || results[pageIndex]?.figures?.[0]?.id || 'fig_1',
      pageImage,
      alt,
      caption
    });
  };

  const handleSaveCrop = (croppedDataUrl: string, figureId?: string) => {
    if (!cropModalData) return;
    const targetId = figureId || cropModalData.figureId || 'fig_1';
    
    if (onUpdateFigureImage) {
      onUpdateFigureImage(cropModalData.pageIndex, targetId, croppedDataUrl);
    } else {
      // Fallback: update HTML directly using onUpdateHtml
      const currentHtml = results[cropModalData.pageIndex]?.html || '';
      const parser = new DOMParser();
      const doc = parser.parseFromString(currentHtml, 'text/html');
      let img = doc.querySelector(`img[data-figure-id="${targetId}"]`) || doc.querySelector(`img[id="${targetId}"]`) || doc.querySelector('figure img, img');
      if (img) {
        img.setAttribute('src', croppedDataUrl);
        onUpdateHtml(cropModalData.pageIndex, doc.body.innerHTML);
      }
    }
    setCropModalData(null);
  };

  // Trigger MathJax re-typesetting whenever results, active page, or view mode changes
  useEffect(() => {
    if (results.length === 0 || viewMode !== 'preview') return;

    let isCancelled = false;

    const runTypeset = () => {
      if (isCancelled || !contentRef.current) return;
      const el = contentRef.current;

      if (window.MathJax && window.MathJax.typesetPromise) {
        try {
          const startup = window.MathJax.startup?.promise || Promise.resolve();
          startup.then(() => {
            if (isCancelled || !contentRef.current) return;
            try {
              window.MathJax.typesetClear([el]);
              return window.MathJax.typesetPromise([el]);
            } catch (err) {
              console.warn('MathJax scoped typeset warning:', err);
              return window.MathJax.typesetPromise();
            }
          }).catch(err => {
            console.warn('MathJax execution error:', err);
          });
        } catch (err) {
          console.warn('MathJax trigger error:', err);
        }
      }
    };

    // Staggered execution ensures MathJax runs after DOM injection and layout settle
    const timer1 = setTimeout(runTypeset, 40);
    const timer2 = setTimeout(runTypeset, 200);

    // Re-typeset math if a user opens a <details> element
    const element = contentRef.current;
    const detailsList = element ? element.querySelectorAll('details') : [];
    const handleDetailsToggle = (e: Event) => {
      const detailsEl = e.currentTarget as HTMLDetailsElement;
      if (detailsEl && detailsEl.open && window.MathJax) {
        try {
          window.MathJax.typesetClear([detailsEl]);
          window.MathJax.typesetPromise([detailsEl]);
        } catch (_) {}
      }
    };
    detailsList.forEach(details => {
      details.addEventListener('toggle', handleDetailsToggle);
    });

    return () => {
      isCancelled = true;
      clearTimeout(timer1);
      clearTimeout(timer2);
      detailsList.forEach(details => {
        details.removeEventListener('toggle', handleDetailsToggle);
      });
    };
  }, [results, activeTab, viewMode, layoutMode]);

  // Handle 1-click Copy HTML
  const handleCopyHtml = async () => {
    try {
      const htmlToCopy = generateHtmlDocument(results, '', layoutMode);
      await navigator.clipboard.writeText(htmlToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy HTML to clipboard:', err);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
      {/* Streamlined Top Results Toolbar (No sidebar) */}
      <ResultsToolbar
        viewMode={viewMode}
        setViewMode={setViewMode}
        layoutMode={layoutMode}
        setLayoutMode={setLayoutMode}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        resultsLength={results.length}
        onDownloadHtml={onDownloadHtml}
        onReset={onReset}
        onCopyHtml={handleCopyHtml}
        isCopied={isCopied}
      />

      {/* Main Document Content */}
      <div className="w-full min-h-[600px] pb-16">
        <ResultsContent
          viewMode={viewMode}
          layoutMode={layoutMode}
          results={results}
          activeTab={activeTab}
          onUpdateHtml={onUpdateHtml}
          onOpenCropModal={handleOpenCropModal}
          contentRef={contentRef}
        />
      </div>

      {/* Visual Crop Modal for Instant Visual Adjustments */}
      {cropModalData && (
        <VisualCropModal
          pageImage={cropModalData.pageImage}
          figureId={cropModalData.figureId}
          initialAlt={cropModalData.alt}
          initialCaption={cropModalData.caption}
          onSaveCrop={handleSaveCrop}
          onClose={() => setCropModalData(null)}
        />
      )}
    </div>
  );
};

export default ResultsView;

