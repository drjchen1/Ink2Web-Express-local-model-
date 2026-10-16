/**
 * Optimizes an image for the local vision model (e.g. Qwen 2.5-VL 3B) by resizing it 
 * to a balanced 1024x1024 max bounding box and applying an adaptive contrast/brightness filter.
 * 
 * 1024x1024 keeps handwritten math and text sharp while reducing the model's visual token count 
 * by ~45% compared to 1400px, dramatically lowering KV cache memory usage and accelerating inference.
 */
export const optimizeImageForGemini = async (base64: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions (preserving aspect ratio)
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round(width * (maxHeight / height));
        height = maxHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(base64); // Fallback
        return;
      }

      // Fast contrast & whitening filter (optimized 2D GPU filter)
      try {
        ctx.filter = 'contrast(1.15) brightness(1.02)';
      } catch (_) {
        // Fallback for environments where ctx.filter is unsupported
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Use JPEG with quality 0.82 for sharp text with minimal payload and memory footprint
      const optimizedBase64 = canvas.toDataURL('image/jpeg', 0.82);
      resolve(optimizedBase64.split(',')[1] || optimizedBase64);
    };
    img.onerror = (err) => reject(err);
    img.src = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
  });
};
