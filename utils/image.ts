import { Figure } from '../types';

export const cropImage = (originalCanvas: HTMLCanvasElement, figure: Figure): string => {
  const w = originalCanvas.width;
  const h = originalCanvas.height;
  if (!w || !h) return '';

  const coords = figure.box_2d.map(value => Math.max(0, Math.min(1000, Number(value)))) as Figure['box_2d'];
  let [ymin, xmin, ymax, xmax] = coords;
  if (![ymin, xmin, ymax, xmax].every(Number.isFinite)) return '';
  if (ymax < ymin) [ymin, ymax] = [ymax, ymin];
  if (xmax < xmin) [xmin, xmax] = [xmax, xmin];

  const padding = 15;
  const left = Math.max(0, Math.floor((xmin / 1000) * w - padding));
  const top = Math.max(0, Math.floor((ymin / 1000) * h - padding));
  const right = Math.min(w, Math.ceil((xmax / 1000) * w + padding));
  const bottom = Math.min(h, Math.ceil((ymax / 1000) * h + padding));
  const sx = Math.min(w - 1, left);
  const sy = Math.min(h - 1, top);
  const sWidth = Math.max(1, Math.min(w - sx, right - sx));
  const sHeight = Math.max(1, Math.min(h - sy, bottom - sy));

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = sWidth;
  cropCanvas.height = sHeight;
  const ctx = cropCanvas.getContext('2d');
  
  if (!ctx) return '';
  ctx.drawImage(originalCanvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
  return cropCanvas.toDataURL('image/png');
};

/**
 * Crops a bounding box [ymin, xmin, ymax, xmax] (normalized 0..1000)
 * directly from an image Data URL or Image Element.
 */
export const cropImageFromDataUrl = (
  imageDataUrl: string,
  box2d: [number, number, number, number],
  padding: number = 0
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) {
        resolve('');
        return;
      }

      let [ymin, xmin, ymax, xmax] = box2d;
      if (ymax < ymin) [ymin, ymax] = [ymax, ymin];
      if (xmax < xmin) [xmin, xmax] = [xmax, xmin];

      const left = Math.max(0, Math.floor((xmin / 1000) * w - padding));
      const top = Math.max(0, Math.floor((ymin / 1000) * h - padding));
      const right = Math.min(w, Math.ceil((xmax / 1000) * w + padding));
      const bottom = Math.min(h, Math.ceil((ymax / 1000) * h + padding));

      const sx = Math.min(w - 1, left);
      const sy = Math.min(h - 1, top);
      const sWidth = Math.max(1, Math.min(w - sx, right - sx));
      const sHeight = Math.max(1, Math.min(h - sy, bottom - sy));

      const canvas = document.createElement('canvas');
      canvas.width = sWidth;
      canvas.height = sHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('');
        return;
      }

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = imageDataUrl;
  });
};

