import type { Transcriber } from './transcribe';

const EXTENSIONS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

/**
 * First candidate vendor for the fallback (spike only, see task 2.3 for the decision).
 * Plain fetch, no SDK, so swapping vendors means writing one more small file like this.
 */
export function createOpenAiTranscriber(
  apiKey: string,
  model = 'gpt-4o-mini-transcribe',
  fetchImpl: typeof fetch = fetch,
): Transcriber {
  return {
    async transcribe(clip, { mimeType, language }) {
      const baseType = mimeType.split(';')[0].trim();
      const form = new FormData();
      form.append('file', new Blob([clip as BlobPart], { type: baseType }), `clip.${EXTENSIONS[baseType] ?? 'webm'}`);
      form.append('model', model);
      form.append('language', language);
      form.append('response_format', 'json');

      const res = await fetchImpl('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      if (!res.ok) throw new Error(`transcription request failed with status ${res.status}`);
      const data = (await res.json()) as { text?: unknown };
      return { text: typeof data.text === 'string' ? data.text.trim() : '', confidence: null };
    },
  };
}
