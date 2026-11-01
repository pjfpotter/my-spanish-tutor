import { parseClipFile, type ClipFile } from './clip';

/**
 * Tutor lines that have a built clip in public/audio/tele/. Add an id here after running
 * `npm run tele-line -- <id>`. The full list comes from the phrase bank in tasks 12.1 and 12.2.
 */
export const CLIP_IDS: readonly string[] = ['hola'];

export const clipUrls = (id: string) => ({ audio: `/audio/tele/${id}.mp3`, json: `/audio/tele/${id}.json` });

/** Loads and checks a clip's timeline. Throws a plain message if it is missing or malformed. */
export async function loadClip(id: string, fetchImpl: typeof fetch = fetch): Promise<ClipFile> {
  const res = await fetchImpl(clipUrls(id).json);
  if (!res.ok) throw new Error(`clip ${id} not found (${res.status})`);
  return parseClipFile(await res.json());
}
