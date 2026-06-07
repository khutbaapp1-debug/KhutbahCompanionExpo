// Upload queue for transcription chunks.
//
// Each finished WAV chunk is POSTed to the transcription endpoint. Uploads are
// fire-and-forget from the recorder's perspective (recording keeps going while
// requests are in flight), but we cap concurrency at MAX_CONCURRENT so a slow
// network can't pile up an unbounded number of simultaneous requests.

const BASE_URL = 'https://khutbahtranslate-production.up.railway.app';
const MAX_CONCURRENT = 2;

export type TranscribeResult = {
  arabic: string;
  translation: string;
  isScripture: boolean;
  sourceLanguage: string;
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

// --- simple concurrency semaphore (max MAX_CONCURRENT in-flight uploads) ---
let activeUploads = 0;
const waiters: Array<() => void> = [];

function acquireSlot(): Promise<void> {
  if (activeUploads < MAX_CONCURRENT) {
    activeUploads++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waiters.push(resolve));
}

function releaseSlot(): void {
  const next = waiters.shift();
  if (next) {
    // Hand the slot directly to the next waiter (activeUploads stays the same).
    next();
  } else {
    activeUploads = Math.max(0, activeUploads - 1);
  }
}

export async function uploadChunk(
  wav: Uint8Array,
  sequenceNumber: number,
  sourceLanguage = 'ar',
  targetLanguage = 'en',
): Promise<TranscribeResult | null> {
  await acquireSlot();
  try {
    const base64 = uint8ArrayToBase64(wav);

    const formData = new FormData();
    // React Native multipart upload: pass a `{ uri, type, name }` file object.
    formData.append(
      'audio',
      {
        uri: `data:audio/wav;base64,${base64}`,
        type: 'audio/wav',
        name: 'audio.wav',
      } as unknown as Blob,
    );
    formData.append('sequenceNumber', String(sequenceNumber));
    formData.append('sourceLanguage', sourceLanguage);
    formData.append('targetLanguage', targetLanguage);

    const response = await fetch(`${BASE_URL}/api/transcribe`, {
      method: 'POST',
      body: formData,
    });

    // Rate limited (429) or server error (500): swallow silently so recording
    // continues uninterrupted. Treat any other non-OK status the same way.
    if (!response.ok) {
      return null;
    }

    const result = (await response.json()) as Partial<TranscribeResult> & {
      translation?: string;
    };

    return {
      arabic: result.arabic ?? '',
      translation: result.translation ?? '',
      isScripture: result.isScripture ?? false,
      sourceLanguage: result.sourceLanguage ?? '',
    };
  } catch {
    // Network / parse failure — stay silent, the recorder keeps going.
    return null;
  } finally {
    releaseSlot();
  }
}
