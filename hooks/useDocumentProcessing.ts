import React, { useCallback } from 'react';
import { AppState, ConversionResult, ModelType, ThinkingLevelType, MathAnnotationStyle, PageProcessingMode } from '../types';
import { pdfToImageData } from '../services/pdfService';
import { convertBatchToHtml, inspectAndPolishPageHtml } from '../services/geminiService';
import { runAccessibilityAudit, enrichHtmlAccessibility, computeSemanticAccessibilityTags } from '../utils/accessibility';
import { cropImage } from '../utils/image';
import { cleanAltText, fixHeadingOrder, replaceFigureInHtml, formatMathInText, formatFigureTitle, formatFigureCaption, buildFigureCardHtml } from '../utils/dom';
import { optimizeImageForGemini } from '../utils/imageOptimizer';

const DYNAMIC_REASONING_STEPS = [
  "Transcribing handwritten notes & math...",
  "Formatting accessible LaTeX equations...",
  "Structuring semantic headings & tables...",
  "Formatting accessible figures & descriptions...",
  "Generating WCAG 2.2 AA compliant HTML..."
];

const startReasoningStepInterval = (
  pageLabel: string,
  maxSimulatedProgress: number,
  setState: React.Dispatch<React.SetStateAction<AppState>>
) => {
  let stepIndex = 0;
  
  const intervalId = setInterval(() => {
    stepIndex++;
    const nextMsg = DYNAMIC_REASONING_STEPS[stepIndex % DYNAMIC_REASONING_STEPS.length];
    
    setState(prev => {
      const nextProgress = prev.progress < maxSimulatedProgress 
        ? Math.min(maxSimulatedProgress, prev.progress + 1) 
        : prev.progress;
      return {
        ...prev,
        progress: Math.max(prev.progress, nextProgress),
        statusMessage: `${pageLabel}: ${nextMsg}`
      };
    });
  }, 2200);

  return () => clearInterval(intervalId);
};

export const useDocumentProcessing = (
  state: AppState,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
  originalFiles: File[],
  setOriginalFiles: React.Dispatch<React.SetStateAction<File[]>>,
  pageMapping: {fileIndex: number, localPageIndex: number}[],
  setPageMapping: React.Dispatch<React.SetStateAction<{fileIndex: number, localPageIndex: number}[]>>,
  onApiCall?: () => void
) => {

  const handleFileUpload = async (
    files: File[], 
    model: ModelType = 'qwen2.5vl:3b', 
    thinkingLevel: ThinkingLevelType = 'NONE',
    mathAnnotationStyle: MathAnnotationStyle = state.mathAnnotationStyle || 'clean-breakdown',
    pageProcessingMode: PageProcessingMode = state.pageProcessingMode || 'page-by-page'
  ) => {
    if (!files || files.length === 0) return;

    setOriginalFiles(files);
    const startTime = Date.now();

    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      results: [],
      error: null,
      statusMessage: 'Reading files...',
      actualModelUsed: model
    }));

    try {
      let pageData: any[] = [];
      const mapping: {fileIndex: number, localPageIndex: number}[] = [];
      
      for (let i = 0; i < files.length; i++) {
        const data = await pdfToImageData(files[i], true);
        pageData = pageData.concat(data);
        for (let j = 0; j < data.length; j++) {
          mapping.push({ fileIndex: i, localPageIndex: j });
        }
      }

      setPageMapping(mapping);
      
      const totalPages = pageData.length;
      
      setState(prev => ({ 
        ...prev, 
        progress: 10, 
        statusMessage: totalPages > 1 ? `Analyzing ${totalPages} pages...` : 'Analyzing document structure...',
        results: [] // Keep results empty until 100% complete
      }));
      
      // Batch size of 1 page individually at a time for dedicated spatial figure precision & focus
      const BATCH_SIZE = 1;
      const CONCURRENCY_LIMIT = 1;
      const results: ConversionResult[] = new Array(totalPages);
      let completedPages = 0;
      
      // Cumulative milestone tracking per page (0 -> 0.2 -> 0.8 -> 1.0)
      const pageProgressScores = new Array(totalPages).fill(0);
      const calculateOverallProgress = () => {
        const totalScore = pageProgressScores.reduce((sum, score) => sum + score, 0);
        return Math.min(98, Math.round(10 + (totalScore / totalPages) * 88));
      };

      const processBatch = async (batchIndices: number[]) => {
        try {
          const pageLabel = batchIndices.length === 1 
            ? `Page ${batchIndices[0] + 1}` 
            : `Pages ${batchIndices.map(i => i + 1).join(', ')}`;

          setState(prev => {
            const current = prev.currentProcessingImages || [];
            const newImages = batchIndices.map(idx => pageData[idx].base64);
            return {
              ...prev,
              statusMessage: batchIndices.length === 1
                ? `Optimizing image for ${pageLabel}...`
                : `Optimizing images for ${pageLabel}...`,
              currentProcessingImages: [...current, ...newImages]
            };
          });

          const batchImages = await Promise.all(batchIndices.map(async idx => {
            const optimized = await optimizeImageForGemini(pageData[idx].base64);
            return {
              base64: optimized,
              pageNumber: idx + 1
            };
          }));

          batchIndices.forEach(idx => {
            pageProgressScores[idx] = Math.max(pageProgressScores[idx], 0.2);
          });
          const progressAfterOpt = calculateOverallProgress();

          setState(prev => ({
            ...prev, 
            progress: Math.max(prev.progress, progressAfterOpt),
            statusMessage: `${pageLabel}: ${DYNAMIC_REASONING_STEPS[0]}`
          }));

          // Allow the progress bar to smoothly ease forward while waiting for Gemini response
          const hypotheticalScoresSum = pageProgressScores.reduce((sum, score) => sum + score, 0) + (batchIndices.length * 0.6);
          const maxSimulatedForBatch = Math.min(95, Math.round(10 + (hypotheticalScoresSum / totalPages) * 88) - 2);
          const stopReasoningTicker = startReasoningStepInterval(
            pageLabel,
            Math.max(progressAfterOpt, maxSimulatedForBatch),
            setState
          );

          let batchResponses;
          try {
            batchResponses = await convertBatchToHtml(
              batchImages, 
              model, 
              thinkingLevel, 
              (fallbackModel) => {
                setState(prev => ({ ...prev, actualModelUsed: fallbackModel }));
              }, 
              mathAnnotationStyle,
              (charsCount) => {
                setState(prev => ({
                  ...prev,
                  statusMessage: `${pageLabel}: Streaming transcription (${charsCount.toLocaleString()} chars received)...`
                }));
              }
            );
          } finally {
            stopReasoningTicker();
          }

          onApiCall?.();

          // Round 2: Inspection and Polish Pass
          setState(prev => ({ 
            ...prev, 
            statusMessage: `${pageLabel}: Polishing LaTeX & accessible HTML structure...`,
            actualModelUsed: batchResponses.actualModelUsed
          }));

          // Run Round 2 inspection on each page's transcribed HTML
          await Promise.all(
            batchResponses.pages.map(async (pageResp) => {
              if (pageResp && pageResp.html) {
                try {
                  pageResp.html = await inspectAndPolishPageHtml(pageResp.html, model);
                  onApiCall?.();
                } catch (inspectErr) {
                  console.warn('Inspection pass warning:', inspectErr);
                }
              }
            })
          );

          batchIndices.forEach(idx => {
            pageProgressScores[idx] = Math.max(pageProgressScores[idx], 0.85);
          });
          const progressAfterAI = calculateOverallProgress();

          setState(prev => ({ 
            ...prev, 
            progress: Math.max(prev.progress, progressAfterAI),
            statusMessage: `Processing mathematical figures for ${pageLabel}...`
          }));

          for (let k = 0; k < batchIndices.length; k++) {
            const i = batchIndices[k];
            const geminiResponse = batchResponses.pages[k];
            
            if (!geminiResponse) continue;

            let finalHtml = geminiResponse.html;
            
            const figureResults = geminiResponse.figures.map((fig) => {
              const screenshotBase64 = cropImage(pageData[i].canvas, fig);
              return {
                id: fig.id,
                originalSrc: screenshotBase64,
                currentSrc: screenshotBase64,
                alt: fig.alt,
                caption: fig.caption || "Figure"
              };
            });
            
            figureResults.forEach(figResult => {
              const figureHtml = buildFigureCardHtml(
                figResult.id,
                figResult.currentSrc,
                figResult.alt,
                figResult.caption || ""
              );
              finalHtml = replaceFigureInHtml(finalHtml, figResult.id, figureHtml);
            });

            finalHtml = fixHeadingOrder(finalHtml, i === 0);
            finalHtml = enrichHtmlAccessibility(finalHtml);
            const audit = runAccessibilityAudit(finalHtml, i === 0);
            const semanticTags = geminiResponse.semanticTags || computeSemanticAccessibilityTags(finalHtml, geminiResponse.title);

            results[i] = { 
              html: finalHtml, 
              pageNumber: i + 1,
              title: geminiResponse.title || semanticTags.pageTitle,
              width: pageData[i].width,
              height: pageData[i].height,
              audit,
              figures: figureResults,
              semanticTags,
              pageImage: pageData[i].canvas?.toDataURL('image/jpeg', 0.9) || `data:image/jpeg;base64,${pageData[i].base64}`
            };

            pageProgressScores[i] = 1.0;
            completedPages++;
            const progressAfterFigures = calculateOverallProgress();

            setState(prev => {
              const current = prev.currentProcessingImages || [];
              const imgToRemove = pageData[i].base64;
              return {
                ...prev,
                progress: Math.max(prev.progress, progressAfterFigures),
                statusMessage: `Completed page ${completedPages} of ${totalPages}...`,
                currentProcessingImages: current.filter(img => img !== imgToRemove)
              };
            });
          }
        } catch (err: any) {
          console.error(`Error processing batch ${batchIndices}:`, err);
          throw err;
        }
      };

      const batches = [];
      for (let i = 0; i < totalPages; i += BATCH_SIZE) {
        const batch = [];
        for (let j = 0; j < BATCH_SIZE && i + j < totalPages; j++) {
          batch.push(i + j);
        }
        batches.push(batch);
      }

      // Process pages sequentially 1 page at a time for dedicated single-page spatial attention
      let nextBatchIdx = 0;
      const worker = async () => {
        while (nextBatchIdx < batches.length) {
          const currentBatchIdx = nextBatchIdx++;
          await processBatch(batches[currentBatchIdx]);
        }
      };

      const workerCount = Math.min(CONCURRENCY_LIMIT, batches.length);
      const workers = Array.from({ length: workerCount }, () => worker());
      await Promise.all(workers);

      const totalTime = Number(((Date.now() - startTime) / 1000).toFixed(1));
      const finalResults = results.filter(r => r !== undefined).sort((a, b) => a.pageNumber - b.pageNumber);

      setState(prev => ({
        ...prev,
        isProcessing: false,
        progress: 100,
        statusMessage: 'Conversion complete!',
        totalTime,
        results: finalResults,
        currentProcessingImages: null
      }));

    } catch (err: any) {
      console.error("Error processing documents:", err);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        statusMessage: 'Error processing files.',
        error: err.message || 'An unknown error occurred during processing.',
        currentProcessingImages: null
      }));
    }
  };

  const reprocessPage = async (
    pageIndex: number, 
    model: ModelType = 'qwen2.5vl:3b', 
    thinkingLevel: ThinkingLevelType = 'NONE',
    mathAnnotationStyle: MathAnnotationStyle = state.mathAnnotationStyle || 'clean-breakdown'
  ) => {
    if (!originalFiles || originalFiles.length === 0) return;
    
    setState(prev => ({
      ...prev,
      isProcessing: true,
      progress: 0,
      statusMessage: `Reprocessing Page ${pageIndex + 1}...`,
      actualModelUsed: model
    }));

    try {
      let fileIndex = 0;
      let localPageIndex = pageIndex;
      
      const mapping = pageMapping[pageIndex];
      if (mapping) {
        fileIndex = mapping.fileIndex;
        localPageIndex = mapping.localPageIndex;
      }

      const file = originalFiles[fileIndex];
      if (!file) throw new Error("Original file not found");

      const pageData = await pdfToImageData(file, false, [localPageIndex + 1]);
      
      if (!pageData || pageData.length === 0) {
        throw new Error("Failed to extract image for reprocessing");
      }

      setState(prev => ({
        ...prev,
        progress: Math.max(prev.progress, 30),
        statusMessage: `Optimizing image for Page ${pageIndex + 1}...`,
        currentProcessingImages: [pageData[0].base64]
      }));

      const optimizedImage = await optimizeImageForGemini(pageData[0].base64);

      const pageLabel = `Page ${pageIndex + 1}`;
      setState(prev => ({
        ...prev,
        progress: Math.max(prev.progress, 50),
        statusMessage: `${pageLabel}: ${DYNAMIC_REASONING_STEPS[0]}`
      }));

      const batchImages = [{ base64: optimizedImage, pageNumber: pageIndex + 1 }];
      const stopReasoningTicker = startReasoningStepInterval(
        pageLabel,
        78,
        setState
      );

      let batchResponses;
      try {
        batchResponses = await convertBatchToHtml(
          batchImages, 
          model, 
          thinkingLevel, 
          (fallbackModel) => {
            setState(prev => ({ ...prev, actualModelUsed: fallbackModel }));
          }, 
          mathAnnotationStyle,
          (charsCount) => {
            setState(prev => ({
              ...prev,
              statusMessage: `${pageLabel}: Streaming transcription (${charsCount.toLocaleString()} chars received)...`
            }));
          }
        );
      } finally {
        stopReasoningTicker();
      }
      
      onApiCall?.();

      const geminiResponse = batchResponses.pages[0];
      if (!geminiResponse) throw new Error("No response received from AI model");

      // Round 2: Inspection and Polish Pass
      if (geminiResponse.html) {
        setState(prev => ({
          ...prev,
          progress: Math.max(prev.progress, 75),
          statusMessage: `${pageLabel}: Inspecting & polishing LaTeX delimiters...`,
          actualModelUsed: batchResponses.actualModelUsed
        }));

        try {
          geminiResponse.html = await inspectAndPolishPageHtml(geminiResponse.html, model);
          onApiCall?.();
        } catch (inspectErr) {
          console.warn('Reprocess inspection pass warning:', inspectErr);
        }
      }

      setState(prev => ({
        ...prev,
        progress: Math.max(prev.progress, 85),
        statusMessage: `Processing mathematical figures for ${pageLabel}...`,
        actualModelUsed: batchResponses.actualModelUsed
      }));

      let finalHtml = geminiResponse.html;
      
      const figureResults = geminiResponse.figures.map((fig) => {
        const screenshotBase64 = cropImage(pageData[0].canvas, fig);
        return {
          id: fig.id,
          originalSrc: screenshotBase64,
          currentSrc: screenshotBase64,
          alt: fig.alt,
          caption: fig.caption || "Figure"
        };
      });
      
      figureResults.forEach(figResult => {
        const figureHtml = buildFigureCardHtml(
          figResult.id,
          figResult.currentSrc,
          figResult.alt,
          figResult.caption || ""
        );
        finalHtml = replaceFigureInHtml(finalHtml, figResult.id, figureHtml);
      });

      finalHtml = fixHeadingOrder(finalHtml, pageIndex === 0);
      finalHtml = enrichHtmlAccessibility(finalHtml);
      const audit = runAccessibilityAudit(finalHtml, pageIndex === 0);
      const semanticTags = geminiResponse.semanticTags || computeSemanticAccessibilityTags(finalHtml, geminiResponse.title);

      setState(prev => {
        const newResults = [...prev.results];
        const existingIndex = newResults.findIndex(r => r.pageNumber === pageIndex + 1);
        
        const newPageResult = { 
          html: finalHtml, 
          pageNumber: pageIndex + 1,
          title: geminiResponse.title || semanticTags.pageTitle,
          width: pageData[0].width,
          height: pageData[0].height,
          audit,
          figures: figureResults,
          semanticTags,
          pageImage: pageData[0].canvas?.toDataURL('image/jpeg', 0.9) || `data:image/jpeg;base64,${pageData[0].base64}`
        };

        if (existingIndex >= 0) {
          newResults[existingIndex] = newPageResult;
        } else {
          newResults.push(newPageResult);
          newResults.sort((a, b) => a.pageNumber - b.pageNumber);
        }

        return {
          ...prev,
          isProcessing: false,
          progress: 100,
          statusMessage: 'Reprocessing Complete!',
          results: newResults,
          currentProcessingImages: null
        };
      });

    } catch (err: any) {
      console.error("Error reprocessing page:", err);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        statusMessage: 'Error reprocessing page',
        error: `Failed to reprocess page ${pageIndex + 1}.|Please try again.`,
        currentProcessingImages: null
      }));
    }
  };

  return { handleFileUpload, reprocessPage };
};
