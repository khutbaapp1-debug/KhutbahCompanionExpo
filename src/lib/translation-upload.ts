// Upload queue for transcription chunks.
//
// Strict FIFO, concurrency 1. Each chunk gets up to 3 upload attempts with
// 2 s / 5 s / 10 s backoff before being moved to the pending list. The
// pending list is retried externally (e.g. on AppState active) via
// retryPendingChunks(). Callers subscribe to pending-count changes via
// subscribePendingCount().

const BASE_URL = 'https://khutbahtranslate-production.up.railway.app';

const RETRY_DELAYS_MS = [2000, 5000, 10000] as const;

export type TranscribeResult = {
  arabic: string;
  translation: string;
  isScripture: boolean;
  sourceLanguage: string;
};

export type ChunkResultCallback = (
  result: TranscribeResult | null,
  chunkIndex: number,
  sentAt: number,
) => void;

type QueueEntry = {
  wav: Uint8Array;
  chunkIndex: number;
  sourceLang: string;
  targetLang: string;
  onResult: ChunkResultCallback;
};

// --- bytes -> base64 (dependency-free; avoids relying on btoa/Buffer in Hermes) ---
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    result += B64_CHARS[(triplet >> 18) & 63];
    result += B64_CHARS[(triplet >> 12) & 63];
    result += i + 1 < len ? B64_CHARS[(triplet >> 6) & 63] : '=';
    result += i + 2 < len ? B64_CHARS[triplet & 63] : '=';
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- FIFO queue state ---
const uploadQueue: QueueEntry[] = [];
const pendingChunks: QueueEntry[] = [];
let isProcessing = false;
const pendingSubscribers = new Set<(count: number) => void>();

function notifyPending(): void {
  const count = pendingChunks.length;
  pendingSubscribers.forEach((fn) => fn(count));
}

export function subscribePendingCount(fn: (count: number) => void): () => void {
  pendingSubscribers.add(fn);
  return () => {
    pendingSubscribers.delete(fn);
  };
}

export function getPendingCount(): number {
  return pendingChunks.length;
}

// --- single upload attempt (throws on network error or 5xx/429) ---
async function attemptUpload(entry: QueueEntry): Promise<TranscribeResult | null> {
  const base64 = uint8ArrayToBase64(entry.wav);

  const formData = new FormData();
  formData.append(
    'audio',
    {
      uri: `data:audio/wav;base64,${base64}`,
      type: 'audio/wav',
      name: 'audio.wav',
    } as unknown as Blob,
  );
  formData.append('chunkIndex', String(entry.chunkIndex));
  formData.append('sourceLanguage', entry.sourceLang);
  formData.append('targetLanguage', entry.targetLang);

  const response = await fetch(`${BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 429 || response.status >= 500) {
      // Retriable server-side error — throw so the retry loop picks it up.
      throw new Error(`HTTP ${response.status}`);
    }
    // 4xx (other than 429): not retriable, caller discards.
    return null;
  }

  const result = (await response.json()) as Partial<TranscribeResult>;
  return {
    arabic: result.arabic ?? '',
    translation: result.translation ?? '',
    isScripture: result.isScripture ?? false,
    sourceLanguage: result.sourceLanguage ?? '',
  };
}

// --- worker: drains the upload queue one entry at a time ---
async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  while (uploadQueue.length > 0) {
    const entry = uploadQueue[0]; // peek — don't shift until done
    const sentAt = Date.now();
    let result: TranscribeResult | null = null;
    let succeeded = false;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        result = await attemptUpload(entry);
        succeeded = true;
        break;
      } catch {
        if (attempt < RETRY_DELAYS_MS.length) {
          await sleep(RETRY_DELAYS_MS[attempt]);
        }
      }
    }

    uploadQueue.shift(); // committed — remove from queue

    if (succeeded) {
      entry.onResult(result, entry.chunkIndex, sentAt);
    } else {
      pendingChunks.push(entry);
      notifyPending();
    }
  }

  isProcessing = false;
}

// --- public API ---

/** Enqueue a WAV chunk for upload. Strict FIFO, concurrency 1. */
export function enqueueChunk(
  wav: Uint8Array,
  chunkIndex: number,
  sourceLang: string,
  targetLang: string,
  onResult: ChunkResultCallback,
): void {
  uploadQueue.push({ wav, chunkIndex, sourceLang, targetLang, onResult });
  void processQueue();
}

/** Move all pending (exhausted-retry) chunks back to the upload queue. */
export function retryPendingChunks(): void {
  if (pendingChunks.length === 0) return;
  const toRetry = pendingChunks.splice(0);
  notifyPending();
  for (const entry of toRetry) {
    uploadQueue.push(entry);
  }
  void processQueue();
}
