export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/**
 * This function was adapted from the one in the ReadMe of https://github.com/DominicTobias/react-image-crop
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  outputSize: number | { width: number; height: number } = 512,
  rotation = 0,
  flip = { horizontal: false, vertical: false }
): Promise<string | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return null;
  }

  const rotRad = getRadianAngle(rotation);

  // calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
    image.width,
    image.height,
    rotation
  );

  // set canvas size to match the bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // translate canvas context to a central location to allow rotating and flipping around the center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are bounding box relative
  // extract the cropped image using these values
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );


  // 1. Draw crop to a temp canvas
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = pixelCrop.width;
  tempCanvas.height = pixelCrop.height;
  const tempCtx = tempCanvas.getContext('2d');
  if(!tempCtx) return null;
  
  tempCtx.putImageData(data, 0, 0);
  
  // 2. Set main canvas size to final desired outputSize
  const finalWidth = typeof outputSize === 'number' ? outputSize : outputSize.width;
  const finalHeight = typeof outputSize === 'number' ? outputSize : outputSize.height;

  canvas.width = finalWidth;
  canvas.height = finalHeight;
  
  // 3. Draw temp canvas to final canvas with scaling
  ctx.drawImage(tempCanvas, 0, 0, pixelCrop.width, pixelCrop.height, 0, 0, finalWidth, finalHeight);

  // As Base64 string
  return canvas.toDataURL('image/jpeg', 0.9);
}

export async function resizeImage(
  file: File,
  maxWidth: number = 1280,
  maxHeight: number = 1280,
  quality: number = 0.8
): Promise<Blob> {
  const imageSrc = URL.createObjectURL(file);
  const image = await createImage(imageSrc);

  let width = image.width;
  let height = image.height;

  // Calculate new dimensions
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    URL.revokeObjectURL(imageSrc);
    throw new Error('Canvas context not available');
  }

  // Draw white background to handle transparency if converting to JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      URL.revokeObjectURL(imageSrc);
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas to Blob failed'));
      }
    }, 'image/jpeg', quality);
  });
}

export type TextOverlay = {
  id: string;
  text: string;
  x: number; // percentage 0-1 (center point)
  y: number; // percentage 0-1 (center point)
  scale: number; // scale relative to base font size
  rotation: number; // degrees
  color: string;
  outlineColor: string;
  fontFamily?: string;
};

export async function addTextToImage(
  imageSrc: string,
  overlays: TextOverlay[]
): Promise<string> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  canvas.width = image.width;
  canvas.height = image.height;

  // Draw original image
  ctx.drawImage(image, 0, 0);

  // Base font size logic to match WYSIWYG editor
  // Editor uses: (containerWidth / 20) * scale
  // Here we use: (imageWidth / 20) * scale
  const baseSize = image.width / 20;

  overlays.forEach((overlay) => {
    const { text, x, y, scale, rotation, color, outlineColor } = overlay;

    ctx.save();

    // Translate to position
    ctx.translate(x * canvas.width, y * canvas.height);

    // Rotate
    ctx.rotate((rotation * Math.PI) / 180);

    // Font settings
    const fontSize = baseSize * scale;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Outline
    if (outlineColor && outlineColor !== 'transparent') {
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = fontSize * 0.1; // proportional stroke width
      ctx.lineJoin = 'round';
      ctx.strokeText(text, 0, 0);
    }

    // Fill
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    ctx.restore();
  });

  return canvas.toDataURL('image/jpeg', 0.9);
}
