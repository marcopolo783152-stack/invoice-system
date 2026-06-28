/**
 * Compresses an image file on the client side using an HTML5 Canvas.
 * It resizes the image to a maximum dimension while maintaining the aspect ratio,
 * and exports it as a highly compressed JPEG (or WebP) Base64 string.
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
      // Fallback: continue and hope the browser somehow supports it
    }
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(processedFile);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Export as highly compressed JPEG
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(compressedDataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
