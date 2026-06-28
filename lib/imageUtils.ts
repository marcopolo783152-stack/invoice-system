import imageCompression from 'browser-image-compression';

/**
 * Compresses an image file on the client side.
 * It resizes the image to a maximum dimension while maintaining the aspect ratio,
 * and exports it as a highly compressed JPEG Base64 string.
 * Automatically handles HEIC/HEIF formats.
 * 
 * @param file The image File to compress
 * @param maxWidth The maximum width of the output image (default 1000)
 * @param maxHeight The maximum height of the output image (default 1000)
 * @param quality The compression quality from 0 to 1 (default 0.7)
 * @returns A Promise that resolves to the compressed Base64 Data URL string
 */
export const compressImage = async (
  file: File,
  maxWidth: number = 1000,
  maxHeight: number = 1000,
  quality: number = 0.7
): Promise<string> => {
  let processedFile = file;

  // Convert HEIC to JPEG before processing
  if (file.name.toLowerCase().endsWith(".heic") || file.name.toLowerCase().endsWith(".heif")) {
    try {
      const heic2any = (await import("heic2any")).default;
      const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: quality });
      const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      processedFile = new File([finalBlob], file.name.replace(/\.heic|\.heif/i, ".jpg"), { type: "image/jpeg" });
    } catch (e) {
      console.error("HEIC conversion failed:", e);
    }
  }

  // Use browser-image-compression for ultra-fast, web-worker based compression
  const options = {
    maxSizeMB: 0.2, // Aim for ~200KB max per image
    maxWidthOrHeight: Math.max(maxWidth, maxHeight),
    useWebWorker: true,
    initialQuality: quality
  };

  try {
    const compressedFile = await imageCompression(processedFile, options);
    // Convert back to base64 for our current storage pipeline
    return await imageCompression.getDataUrlFromFile(compressedFile);
  } catch (error) {
    console.error("Error with browser-image-compression", error);
    
    // Fallback if browser-image-compression fails
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(processedFile);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }
};
