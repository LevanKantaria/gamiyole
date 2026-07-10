import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';

// Image optimization settings
const IMAGE_SETTINGS = {
  // Profile avatars (small, circular)
  avatar: {
    width: 200,
    height: 200,
    quality: 0.8,
    format: 'jpeg',
    compress: true
  },
  // Car photos — max width only; height scales with aspect ratio (no stretching)
  car: {
    width: 1200,
    quality: 0.75,
    format: 'jpeg',
    compress: true
  },
  // Thumbnail previews
  thumbnail: {
    width: 150,
    height: 150,
    quality: 0.6,
    format: 'jpeg',
    compress: true
  }
};

// Maximum file sizes (in bytes) — enforced after optimization; originals may be larger.
const MAX_FILE_SIZES = {
  avatar: 200 * 1024,    // 200KB
  car: 500 * 1024,       // 500KB
  thumbnail: 200 * 1024, // 200KB
};

/**
 * Optimize an image based on its type and purpose
 * @param {string} imageUri - Local URI of the image
 * @param {string} type - 'avatar', 'car', or 'thumbnail'
 * @returns {Promise<string>} - Optimized image URI
 */
export const optimizeImage = async (imageUri, type = 'car') => {
  try {
    const settings = IMAGE_SETTINGS[type];
    const maxSize = MAX_FILE_SIZES[type];

    const resize =
      type === 'avatar' && settings.height
        ? { width: settings.width, height: settings.height }
        : { width: settings.width };

    const optimizedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize }],
      {
        compress: settings.compress ? settings.quality : 1,
        format: ImageManipulator.SaveFormat[settings.format.toUpperCase()],
      }
    );

    const optimizedInfo = await FileSystem.getInfoAsync(optimizedImage.uri);

    if (optimizedInfo.size > maxSize) {
      const furtherOptimized = await ImageManipulator.manipulateAsync(
        optimizedImage.uri,
        [],
        {
          compress: 0.5,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return furtherOptimized.uri;
    }

    return optimizedImage.uri;
  } catch (error) {
    console.error('Image optimization failed:', error);
    return imageUri;
  }
};

/**
 * Generate a thumbnail for preview
 * @param {string} imageUri - Local URI of the image
 * @returns {Promise<string>} - Thumbnail URI
 */
export const generateThumbnail = async (imageUri) => {
  return await optimizeImage(imageUri, 'thumbnail');
};

/**
 * Validate image before upload
 * @param {string} imageUri - Local URI of the image
 * @param {string} type - Image type
 * @returns {Promise<{valid: boolean, message: string, size: number}>}
 */
export const validateImage = async (imageUri, type = 'car') => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    const maxSize = MAX_FILE_SIZES[type];
    const sizeKB = fileInfo.size / 1024;
    
    if (fileInfo.size > maxSize) {
      return {
        valid: false,
        message: `Image too large (${sizeKB.toFixed(1)}KB). Max allowed: ${(maxSize / 1024).toFixed(1)}KB`,
        size: fileInfo.size
      };
    }
    
    return {
      valid: true,
      message: `Image valid (${sizeKB.toFixed(1)}KB)`,
      size: fileInfo.size
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Failed to validate image',
      size: 0
    };
  }
};

/**
 * Get storage cost estimate for an image
 * @param {number} sizeBytes - Image size in bytes
 * @returns {string} - Cost estimate
 */
export const getStorageCost = (sizeBytes) => {
  const sizeGB = sizeBytes / (1024 * 1024 * 1024);
  const costPerGB = 0.026; // Firebase Storage cost per GB
  const monthlyCost = sizeGB * costPerGB;
  
  if (monthlyCost < 0.001) {
    return '< $0.001/month';
  }
  
  return `$${monthlyCost.toFixed(4)}/month`;
};

/**
 * Batch optimize multiple images
 * @param {Array<string>} imageUris - Array of image URIs
 * @param {string} type - Image type
 * @returns {Promise<Array<string>>} - Array of optimized URIs
 */
export const batchOptimizeImages = async (imageUris, type = 'car') => {
  const optimizedUris = [];
  for (const uri of imageUris) {
    optimizedUris.push(await optimizeImage(uri, type));
  }
  return optimizedUris;
}; 