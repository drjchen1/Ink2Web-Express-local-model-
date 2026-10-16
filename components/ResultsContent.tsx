import React, { RefObject } from 'react';
import { ConversionResult, LayoutMode } from '../types';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup';
import 'prismjs/themes/prism-tomorrow.css';

import { Crop } from 'lucide-react';

interface ResultsContentProps {
  viewMode: 'preview' | 'source';
  layoutMode: LayoutMode;
  results: ConversionResult[];
  activeTab: number;
  onUpdateHtml: (pageIndex: number, html: string) => void;
  onOpenCropModal?: (pageIndex: number, figureId?: string, currentAlt?: string, currentCaption?: string) => void;
  contentRef: RefObject<HTMLDivElement | null>;
}

export const ResultsContent: React.FC<ResultsContentProps> = ({
  viewMode,
  layoutMode,
  results,
  activeTab,
  onUpdateHtml,
  onOpenCropModal,
  contentRef
}) => {
  return (
    <div className="w-full">
      {viewMode === 'preview' ? (
        <div 
          ref={contentRef} 
          className="w-full transition-all duration-200"
        >
          {layoutMode === 'continuous' ? (
            <div className="space-y-10 max-w-4xl mx-auto">
              {results.map((r, i) => (
                <article 
                  key={i} 
                  id={`page-sheet-${r.pageNumber}`}
                  className="document-page math-content overflow-x-auto bg-white p-6 sm:p-10 md:p-14 rounded-3xl shadow-sm border border-zinc-200/90 text-zinc-900 transition-shadow hover:shadow-md"
                  aria-label={`Page ${r.pageNumber} of ${results.length}`}
                >
                  <div className="page-top-bar flex items-center justify-between pb-3.5 mb-6 border-b border-zinc-100 text-xs text-zinc-500 font-semibold" aria-hidden="true">
                    <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider text-[11px]">
                      Page {r.pageNumber} of {results.length}
                    </span>
                    {r.pageImage && onOpenCropModal && (
                      <button
                        type="button"
                        onClick={() => onOpenCropModal(i, r.figures?.[0]?.id, r.figures?.[0]?.alt, r.figures?.[0]?.caption)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 hover:border-indigo-200 transition-all cursor-pointer"
                        title="Adjust or re-crop diagrams from original page"
                      >
                        <Crop size={13} className="text-indigo-500" />
                        <span>Adjust Diagram Crop</span>
                      </button>
                    )}
                  </div>
                  
                  <div dangerouslySetInnerHTML={{ __html: r.html }} />
                </article>
              ))}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <article 
                className="document-page math-content overflow-x-auto bg-white p-6 sm:p-10 md:p-14 rounded-3xl shadow-sm border border-zinc-200/90 text-zinc-900"
                aria-label={`Page ${results[activeTab]?.pageNumber || 1} of ${results.length}`}
              >
                <div className="page-top-bar flex items-center justify-between pb-3.5 mb-6 border-b border-zinc-100 text-xs text-zinc-500 font-semibold" aria-hidden="true">
                  <span className="px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 font-bold uppercase tracking-wider text-[11px]">
                    Page {results[activeTab]?.pageNumber || 1} of {results.length}
                  </span>
                  {results[activeTab]?.pageImage && onOpenCropModal && (
                    <button
                      type="button"
                      onClick={() => onOpenCropModal(
                        activeTab, 
                        results[activeTab]?.figures?.[0]?.id, 
                        results[activeTab]?.figures?.[0]?.alt, 
                        results[activeTab]?.figures?.[0]?.caption
                      )}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50 border border-zinc-200 hover:border-indigo-200 transition-all cursor-pointer"
                      title="Adjust or re-crop diagrams from original page"
                    >
                      <Crop size={13} className="text-indigo-500" />
                      <span>Adjust Diagram Crop</span>
                    </button>
                  )}
                </div>
                <div dangerouslySetInnerHTML={{ __html: results[activeTab]?.html || '' }} />
              </article>
            </div>
          )}
        </div>
      ) : (
        /* Source Mode: Code Editor with Prism Markup */
        <div className="max-w-4xl mx-auto w-full">
          {layoutMode === 'continuous' ? (
            <div className="space-y-6">
              {results.map((r, i) => (
                <div key={i} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700 shadow-md">
                  <div className="px-4 py-2.5 bg-zinc-800/90 border-b border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-between">
                    <span>Page {r.pageNumber} HTML</span>
                    <span className="text-[11px] font-mono text-zinc-400">Accessible HTML</span>
                  </div>
                  <div className="p-2 sm:p-4">
                    <Editor
                      value={r.html}
                      onValueChange={(code) => onUpdateHtml(i, code)}
                      highlight={(code) => Prism.highlight(code, Prism.languages.markup, 'markup')}
                      padding={16}
                      className="font-mono text-xs text-white min-h-[300px]"
                      style={{
                        fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                        lineHeight: 1.6
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-700 shadow-md">
              <div className="px-4 py-2.5 bg-zinc-800/90 border-b border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Page {results[activeTab]?.pageNumber || 1} HTML</span>
                <span className="text-[11px] font-mono text-zinc-400">Accessible HTML</span>
              </div>
              <div className="p-2 sm:p-4">
                <Editor
                  value={results[activeTab]?.html || ''}
                  onValueChange={(code) => onUpdateHtml(activeTab, code)}
                  highlight={(code) => Prism.highlight(code, Prism.languages.markup, 'markup')}
                  padding={20}
                  className="font-mono text-xs text-white min-h-[500px]"
                  style={{
                    fontFamily: '"Fira Code", "JetBrains Mono", monospace',
                    lineHeight: 1.6
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
