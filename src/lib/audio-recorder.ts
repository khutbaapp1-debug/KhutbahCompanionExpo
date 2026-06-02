// Audio recording pipeline for the Live Translation screen.
//
// This is the React Native equivalent of the Capacitor `use-audio-recorder.ts`
// hook. The web version used the Web Audio API (ScriptProcessor + AnalyserNode)
// to pull raw Float32 PCM samples; on native we use `react-native-audio-record`,
// which streams base64-encoded 16-bit PCM via its `on('data')` callback.
//
// To keep the chunking/encoding logic identical to the web build, we decode each
// incoming PCM block back to Float32 samples in [-1, 1] and accumulate them in
// `buffer`. `encodeWav` then performs the exact same Float32 -> 16-bit WAV
// encoding that the Capacitor `wav-encoder.ts` used, so the bytes that reach the
// transcription API match the proven web pipeline.
//
// NOTE: this module depends on a native module and therefore only works in a
// development/standalone build — not in Expo Go.

import AudioRecord from 'react-native-audio-record';

const SAMPLE_RATE = 16000;
const FIRST_CHUNK_DURATION = 15_000; // 15 seconds — shorter first chunk so the user sees a translation sooner
const CHUNK_DURATION = 12_000; // 12 seconds for every chunk after the first
const MIN_CHUNK_BYTES = 5000; // skip silent / tiny chunks

export type TranslationSegment = {
  id: string;
  arabic: string;
  english: string;
  timestamp: number;
  isScripture: boolean;
};

export type RecorderState = 'idle' | 'recording' | 'paused';

// The recorder hands the screen a finished WAV plus its sequence number. The
// sequence number is owned by the manager (the single source of truth for chunk
// ordering) so the upload layer can preserve order even when chunks complete out
// of order. The brief's `(wav) => void` is widened to include the sequence here
// because `uploadChunk` requires it.
type ChunkCallback = (wav: Uint8Array, sequenceNumber: number) => void;

// --- base64 -> bytes (dependency-free; avoids relying on atob/Buffer in Hermes) ---
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  for (let i = 0; i < B64_CHARS.length; i++) {
    table[B64_CHARS.charCodeAt(i)] = i;
  }
  return table;
})();

function base64ToUint8Array(base64: string): Uint8Array {
  const len = base64.length;
  let padding = 0;
  if (len > 0 && base64[len - 1] === '=') padding++;
  if (len > 1 && base64[len - 2] === '=') padding++;
  const byteLength = (len * 3) / 4 - padding;
  const bytes = new Uint8Array(byteLength > 0 ? byteLength : 0);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const e0 = B64_LOOKUP[base64.charCodeAt(i)];
    const e1 = B64_LOOKUP[base64.charCodeAt(i + 1)];
    const e2 = B64_LOOKUP[base64.charCodeAt(i + 2)];
    const e3 = B64_LOOKUP[base64.charCodeAt(i + 3)];
    if (p < byteLength) bytes[p++] = (e0 << 2) | (e1 >> 4);
    if (p < byteLength) bytes[p++] = ((e1 & 15) << 4) | (e2 >> 2);
    if (p < byteLength) bytes[p++] = ((e2 & 3) << 6) | (e3 & 63);
  }
  return bytes;
}

function writeString(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export class AudioRecorderManager {
  private buffer: number[] = []; // accumulated PCM samples as Float32 equivalents in [-1, 1]
  private isRecording = false;
  private isPaused = false;
  private chunkTimer: ReturnType<typeof setInterval> | null = null;
  private firstChunkTimer: ReturnType<typeof setTimeout> | null = null;
  private onChunkCallback: ChunkCallback | null = null;
  private sequenceNumber = 0;
  // `react-native-audio-record` has no `off`; attach the data listener exactly
  // once per instance so repeated start/stop cycles don't double-count samples.
  private listenerAttached = false;

  async start(onChunk: ChunkCallback): Promise<void> {
    this.onChunkCallback = onChunk;
    this.buffer = [];
    this.sequenceNumber = 0;
    this.isPaused = false;

    AudioRecord.init({
      sampleRate: SAMPLE_RATE,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION on Android
      wavFile: 'khutbah_temp.wav', // required by the lib; we build our own WAV from the stream
    });

    if (!this.listenerAttached) {
      AudioRecord.on('data', this.handleData);
      this.listenerAttached = true;
    }

    AudioRecord.start();
    this.isRecording = true;

    // First chunk fires after 15s for fast initial feedback, then settles into a
    // 12s cadence.
    this.firstChunkTimer = setTimeout(() => {
      this.processChunk();
      this.chunkTimer = setInterval(() => this.processChunk(), CHUNK_DURATION);
    }, FIRST_CHUNK_DURATION);
  }

  async stop(): Promise<void> {
    if (this.firstChunkTimer) {
      clearTimeout(this.firstChunkTimer);
      this.firstChunkTimer = null;
    }
    if (this.chunkTimer) {
      clearInterval(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Keep accumulating any trailing data events until the native recorder has
    // fully stopped, so the final chunk includes everything.
    try {
      await AudioRecord.stop();
    } catch {
      // ignore — we still flush whatever we have
    }

    this.isRecording = false;
    this.isPaused = false; // ensure the final partial buffer is flushed
    this.processChunk();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  private handleData = (base64: string): void => {
    if (this.isPaused || !this.isRecording) return;
    const bytes = base64ToUint8Array(base64);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < sampleCount; i++) {
      // 16-bit little-endian signed PCM -> Float32 in [-1, 1)
      this.buffer.push(view.getInt16(i * 2, true) / 0x8000);
    }
  };

  private processChunk(): void {
    if (this.buffer.length === 0 || this.isPaused) return;

    const wav = this.encodeWav(this.buffer);

    // Skip silent / tiny chunks (the API can't do anything useful with them).
    if (wav.length < MIN_CHUNK_BYTES) {
      this.buffer = [];
      return;
    }

    console.log(`[AudioRecorder] seq=${this.sequenceNumber} chunk dispatched for upload — recording continues in parallel`);
    this.onChunkCallback?.(wav, this.sequenceNumber);
    this.buffer = [];
    this.sequenceNumber++;
  }

  // Copied from the Capacitor `wav-encoder.ts` (RIFF / PCM / mono / 16kHz /
  // 16-bit, little-endian throughout), returning a Uint8Array instead of a Blob.
  private encodeWav(samples: number[]): Uint8Array {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // mono channel
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return new Uint8Array(buffer);
  }
}
