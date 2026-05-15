import { format } from 'date-fns';

export type CompressionState = 'not_needed' | 'pending' | 'compressing' | 'compressed' | 'failed';
export type ThumbnailState = 'pending' | 'generated' | 'failed';

export interface PhotoMediaPipelineResult {
  originalBlob?: Blob;
  compressedBlob?: Blob;
  thumbnailDataUrl?: string;
  previewDataUrl?: string;
  width?: number;
  height?: number;
  originalSize?: number;
  compressedSize?: number;
  compressionState: CompressionState;
  thumbnailState: ThumbnailState;
  qualityScore?: number;
}

export interface OverlayMetadataInput {
  brand: string;
  jobName: string;
  category: string;
  latitude?: number;
  longitude?: number;
  capturedAt?: Date;
}

const MAX_COMPRESSED_EDGE = 1800;
const THUMBNAIL_EDGE = 420;

function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = 'async';
    const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to decode image blob.'));
    });
    image.src = url;
    return await loaded;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas could not create image blob.'));
    }, type, quality);
  });
}

function canvasToDataUrl(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.78): string {
  return canvas.toDataURL(type, quality);
}

function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function drawScaled(image: HTMLImageElement, maxEdge: number): HTMLCanvasElement {
  const next = fitWithin(image.naturalWidth || image.width, image.naturalHeight || image.height, maxEdge);
  const canvas = createCanvas(next.width, next.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, next.width, next.height);
  return canvas;
}

export class MediaPipelineService {
  static async processPhotoBlob(blob: Blob, previewDataUrl?: string): Promise<PhotoMediaPipelineResult> {
    try {
      const image = await blobToImage(blob);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      const thumbCanvas = drawScaled(image, THUMBNAIL_EDGE);
      const thumbnailDataUrl = canvasToDataUrl(thumbCanvas, 'image/jpeg', 0.72);

      const shouldCompress = Math.max(width, height) > MAX_COMPRESSED_EDGE || blob.size > 1_250_000;
      let compressedBlob = blob;
      let compressionState: CompressionState = 'not_needed';

      if (shouldCompress) {
        const compressedCanvas = drawScaled(image, MAX_COMPRESSED_EDGE);
        compressedBlob = await canvasToBlob(compressedCanvas, 'image/jpeg', 0.82);
        compressionState = 'compressed';
      }

      return {
        originalBlob: blob,
        compressedBlob,
        thumbnailDataUrl,
        previewDataUrl,
        width,
        height,
        originalSize: blob.size,
        compressedSize: compressedBlob.size,
        compressionState,
        thumbnailState: 'generated',
        qualityScore: this.estimateCaptureQuality({ width, height, size: blob.size }),
      };
    } catch (error) {
      console.warn('Photo media pipeline failed:', error);
      return {
        originalBlob: blob,
        compressedBlob: blob,
        previewDataUrl,
        originalSize: blob.size,
        compressedSize: blob.size,
        compressionState: 'failed',
        thumbnailState: 'failed',
        qualityScore: undefined,
      };
    }
  }

  static applyMetadataOverlay(canvas: HTMLCanvasElement, input: OverlayMetadataInput): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dateStr = format(input.capturedAt ?? new Date(), 'MMM d, yyyy · HH:mm:ss');
    const gpsStr = typeof input.latitude === 'number' && typeof input.longitude === 'number'
      ? `${input.latitude.toFixed(6)}, ${input.longitude.toFixed(6)}`
      : 'GPS OFFLINE';

    const barHeight = Math.max(104, Math.round(canvas.height * 0.1));
    const padding = Math.max(28, Math.round(canvas.width * 0.025));
    const brandSize = Math.max(22, Math.round(canvas.width * 0.024));
    const metaSize = Math.max(16, Math.round(canvas.width * 0.017));

    ctx.save();
    ctx.fillStyle = 'rgba(2,6,23,0.58)';
    ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.font = `900 ${brandSize}px sans-serif`;
    ctx.fillText((input.brand || 'SITEPROOF').toUpperCase(), padding, canvas.height - Math.round(barHeight * 0.56));

    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    ctx.font = `700 ${metaSize}px sans-serif`;
    ctx.fillText(`${input.jobName.toUpperCase()} · ${input.category.toUpperCase()}`, padding, canvas.height - Math.round(barHeight * 0.24));

    ctx.textAlign = 'right';
    ctx.fillStyle = 'white';
    ctx.font = `900 ${metaSize}px sans-serif`;
    ctx.fillText(dateStr, canvas.width - padding, canvas.height - Math.round(barHeight * 0.56));

    ctx.fillStyle = typeof input.latitude === 'number' ? 'rgba(74,222,128,0.95)' : 'rgba(248,113,113,0.95)';
    ctx.font = `700 ${Math.max(14, metaSize - 2)}px monospace`;
    ctx.fillText(gpsStr, canvas.width - padding, canvas.height - Math.round(barHeight * 0.24));
    ctx.restore();
  }

  static estimateCaptureQuality(input: { width?: number; height?: number; size?: number }): number {
    const width = input.width ?? 0;
    const height = input.height ?? 0;
    const pixels = width * height;
    let score = 0.55;
    if (pixels >= 1_000_000) score += 0.2;
    if (pixels >= 3_000_000) score += 0.12;
    if ((input.size ?? 0) > 180_000) score += 0.08;
    if (width < 900 || height < 700) score -= 0.18;
    return Math.max(0.1, Math.min(0.98, Number(score.toFixed(2))));
  }

  static humanFileSize(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 KB';
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
