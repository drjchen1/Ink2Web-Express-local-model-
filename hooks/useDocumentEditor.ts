import React, { useCallback } from 'react';
import { AppState } from '../types';
import { runAccessibilityAudit, enrichHtmlAccessibility, computeSemanticAccessibilityTags } from '../utils/accessibility';

export const useDocumentEditor = (
  setState: React.Dispatch<React.SetStateAction<AppState>>
) => {
  const updatePageHtml = useCallback((pageIndex: number, rawHtml: string) => {
    setState(prev => {
      const newResults = [...prev.results];
      if (newResults[pageIndex]) {
        const enrichedHtml = enrichHtmlAccessibility(rawHtml);
        const audit = runAccessibilityAudit(enrichedHtml, pageIndex === 0);
        const semanticTags = computeSemanticAccessibilityTags(enrichedHtml, newResults[pageIndex].title);
        
        newResults[pageIndex] = {
          ...newResults[pageIndex],
          html: enrichedHtml,
          audit,
          semanticTags
        };
      }
      return { ...prev, results: newResults };
    });
  }, [setState]);

  const updateFigureImage = useCallback((pageIndex: number, figureId: string, newSrc: string) => {
    setState(prev => {
      const newResults = [...prev.results];
      const pageResult = newResults[pageIndex];
      if (pageResult) {
        // Update figures array
        const updatedFigures = (pageResult.figures || []).map(fig => {
          if (fig.id === figureId) {
            return { ...fig, currentSrc: newSrc };
          }
          return fig;
        });

        // Update HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(pageResult.html, 'text/html');
        let img = doc.querySelector(`img[data-figure-id="${figureId}"]`) || doc.querySelector(`img[id="${figureId}"]`);
        if (!img && (pageResult.figures || []).length === 1) {
          img = doc.querySelector('figure img, img');
        }
        if (img) {
          img.setAttribute('src', newSrc);
        }

        newResults[pageIndex] = {
          ...pageResult,
          html: doc.body.innerHTML,
          figures: updatedFigures
        };
      }
      return { ...prev, results: newResults };
    });
  }, [setState]);

  return { updatePageHtml, updateFigureImage };
};
