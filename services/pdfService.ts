
/**
 * Result of the file processing: images for Gemini AND the original canvases for cropping.
 */
export interface PdfImageData {
  base64: string;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
}

let pdfJsPromise: Promise<any> | null = null;

const loadPdfJs = async (): Promise<any> => {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  if (!pdfJsPromise) {
    pdfJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => resolve((window as any).pdfjsLib);
      script.onerror = () => reject(new Error('Unable to load the PDF reader.'));
      document.head.appendChild(script);
    });
  }
  return pdfJsPromise;
};

export const pdfToImageData = async (file: File, optimize: boolean = false, targetPageIndices?: number[]): Promise<PdfImageData[]> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  const scale = optimize ? 1.6 : 2.5;
  const quality = optimize ? 0.7 : 0.85;

  // Handle PDF
  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await loadPdfJs();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    const pageIndices = targetPageIndices || Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    
    // Render pages sequentially to avoid allocating multiple large DOM canvases concurrently in RAM
    const data: PdfImageData[] = [];
    for (const pageNum of pageIndices) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale }); 
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Could not create canvas context');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      
      const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
      data.push({ 
        base64, 
        canvas, 
        width: viewport.width, 
        height: viewport.height,
        orientation: (viewport.width > viewport.height ? 'landscape' : 'portrait') as 'landscape' | 'portrait'
      });
      // Release PDF page resources
      page.cleanup();
    }

    return data;
  }

  // Handle Images (JPG, PNG, HEIC)
  if (fileType.startsWith('image/') || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
    let imageBlob: Blob = file;

    // Convert HEIC to PNG if needed
    if (fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
      const heic2any = (await import('heic2any')).default;
      const converted = await heic2any({ blob: file, toType: 'image/png' });
      imageBlob = Array.isArray(converted) ? converted[0] : converted;
    }

    const url = URL.createObjectURL(imageBlob);
    const img = new Image();
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create canvas context');

    // Scale image to a reasonable size if it's too large
    const maxDim = optimize ? 1600 : 2000;
    let width = img.width;
    let height = img.height;
    if (width > maxDim || height > maxDim) {
      const ratio = Math.min(maxDim / width, maxDim / height);
      width *= ratio;
      height *= ratio;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);

    const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    return [{
      base64,
      canvas,
      width,
      height,
      orientation: (width > height ? 'landscape' : 'portrait') as 'landscape' | 'portrait'
    }];
  }

  // Handle Text Files (.txt)
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    const text = await file.text();
    
    // Render text to a canvas to keep the pipeline consistent
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not create canvas context');

    const width = 1200;
    const padding = 60;
    const fontSize = 24;
    const lineHeight = 32;
    
    context.font = `${fontSize}px "Inter", sans-serif`;
    const lines = text.split('\n');
    
    // Measure total height needed
    const height = Math.max(800, lines.length * lineHeight + padding * 2);
    canvas.width = width;
    canvas.height = height;

    // Background
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);

    // Text
    context.fillStyle = '#1e293b';
    context.textBaseline = 'top';
    lines.forEach((line, i) => {
      context.fillText(line, padding, padding + i * lineHeight);
    });

    const base64 = canvas.toDataURL('image/jpeg', quality).split(',')[1];
    return [{
      base64,
      canvas,
      width,
      height,
      orientation: (width > height ? 'landscape' : 'portrait') as 'landscape' | 'portrait'
    }];
  }

  throw new Error('Unsupported file type. Please upload a PDF, image (JPG, PNG, HEIC), or a text file.');
};

