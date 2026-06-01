type CompressRequest = {
  id: string;
  type: 'compress';
  buffer: ArrayBuffer;
  mimeType: string;
  maxEdge: number;
  quality: number;
};

type CompressResponse = {
  id: string;
  ok: boolean;
  buffer?: ArrayBuffer;
  width?: number;
  height?: number;
  error?: string;
};

function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

self.onmessage = async (event: MessageEvent<CompressRequest>) => {
  const message = event.data;
  if (!message || message.type !== 'compress') return;

  try {
    const blob = new Blob([message.buffer], { type: message.mimeType || 'image/jpeg' });
    const bitmap = await createImageBitmap(blob);
    const next = fitWithin(bitmap.width, bitmap.height, message.maxEdge);
    const canvas = new OffscreenCanvas(next.width, next.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('offscreen_canvas_unavailable');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, next.width, next.height);
    bitmap.close();

    const output = await canvas.convertToBlob({ type: 'image/jpeg', quality: message.quality });
    const outBuffer = await output.arrayBuffer();
    const response: CompressResponse = { id: message.id, ok: true, buffer: outBuffer, width: next.width, height: next.height };
    self.postMessage(response);
  } catch (error) {
    const response: CompressResponse = {
      id: message.id,
      ok: false,
      error: error instanceof Error ? error.message : 'compression_failed',
    };
    self.postMessage(response);
  }
};
