// Image utility functions for thumbnail generation and optimization

export interface ThumbnailOptions {
  width: number;
  height: number;
  quality: number; // 0-1
}

/**
 * Create a thumbnail from an image file
 */
export const createThumbnail = async (
  file: File,
  options: ThumbnailOptions = { width: 300, height: 200, quality: 0.8 }
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate aspect ratio and resize dimensions
      const aspectRatio = img.width / img.height;
      let { width, height } = options;

      if (aspectRatio > width / height) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw and resize the image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with specified quality
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail'));
            }
          },
          'image/jpeg',
          options.quality
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Create object URL and load image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    // Clean up object URL after loading
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Original onload logic here
      const aspectRatio = img.width / img.height;
      let { width, height } = options;

      if (aspectRatio > width / height) {
        height = width / aspectRatio;
      } else {
        width = height * aspectRatio;
      }

      canvas.width = width;
      canvas.height = height;

      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to create thumbnail'));
            }
          },
          'image/jpeg',
          options.quality
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
  });
};

/**
 * Validate image file before upload
 */
export const validateImageFile = (
  file: File
): { valid: boolean; error?: string } => {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'File phải là hình ảnh (JPG, PNG, GIF, WebP)',
    };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'File phải nhỏ hơn 10MB' };
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const extension = file.name
    .toLowerCase()
    .substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return { valid: false, error: 'Chỉ hỗ trợ file JPG, PNG, GIF, WebP' };
  }

  return { valid: true };
};

/**
 * Get file size in human readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get image dimensions from file
 */
export const getImageDimensions = async (
  file: File
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image dimensions'));
    };

    img.src = objectUrl;
  });
};
