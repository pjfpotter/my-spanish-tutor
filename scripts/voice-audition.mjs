// Voice audition (task 4.1). Synthesises each question with OpenAI, Gemini and ElevenLabs
// personas and writes a listening page. Clips are cached by content hash, so a rerun only
// pays for text or settings that changed.
//
//   npm run audition                      all providers that have a key
//   npm run audition -- --only=gemini     one provider
//   npm run audition -- --dry-run         build the page from cached clips, no network
//
// Keys (in .env.local, never committed): OPENAI_API_KEY, GEMINI_API_KEY, ELEVENLABS_API_KEY,
// plus ELEVENLABS_VOICE_PRIMO and ELEVENLABS_VOICE_PROFE (voice ids from Voice Design).
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const out = path.join(root, '.audition');
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');

// Placeholder questions used until the seeded course exists (task 3.2).
const SAMPLE_QUESTIONS = [
  '¿Cómo te llamas y cuántos años tienes?',
  '¿Dónde vives y cómo es tu casa?',
  '¿Qué haces en tu tiempo libre?',
  '¿Cómo es tu mejor amigo?',
  '¿Qué vas a hacer este fin de semana?',
];

// The persona belongs in the voice, so each provider gets its own voice choice plus a short
// style cue. Every cue says Spanish only: the tutor never speaks English.
const PERSONAS = [
  {
    id: 'primo',
    label: 'Cheeky older cousin',
    openai: { voice: 'ash', instructions: 'Speak only Spanish, Castilian accent. A dry, cheeky older cousin: quick, playful, a little teasing. Never English.' },
    gemini: { voice: 'Puck', style: 'In Castilian Spanish only, never English, say this as a dry, cheeky older cousin, quick and playful, a little teasing:' },
    elevenlabs: { voiceEnv: 'ELEVENLABS_VOICE_PRIMO', tag: '[playfully]' },
  },
  {
    id: 'profe',
    label: 'Warm patient teacher',
    openai: { voice: 'coral', instructions: 'Speak only Spanish, Castilian accent. A warm, patient teacher: clear, encouraging, unhurried. Never English.' },
    gemini: { voice: 'Kore', style: 'In Castilian Spanish only, never English, say this as a warm, patient teacher, clear and encouraging:' },
    elevenlabs: { voiceEnv: 'ELEVENLABS_VOICE_PROFE', tag: '[warmly]' },
  },
];

const hash = (...parts) => createHash('sha256').update(parts.join('\u0000')).digest('hex').slice(0, 12);

// Gemini returns raw 24 kHz 16-bit mono PCM, which browsers cannot play without a header.
function wav(pcm, sampleRate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + pcm.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(1, 22); // mono
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function post(url, headers, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

const PROVIDERS = {
  openai: {
    key: 'OPENAI_API_KEY',
    ext: 'mp3',
    config: (p) => p.openai,
    async synth(text, p) {
      const res = await post('https://api.openai.com/v1/audio/speech', { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, {
        model: 'gpt-4o-mini-tts',
        voice: p.openai.voice,
        input: text,
        instructions: p.openai.instructions,
        response_format: 'mp3',
      });
      return Buffer.from(await res.arrayBuffer());
    },
    chars: (text, p) => text.length + p.openai.instructions.length,
  },
  gemini: {
    key: 'GEMINI_API_KEY',
    ext: 'wav',
    config: (p) => p.gemini,
    async synth(text, p) {
      const model = process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts';
      const res = await post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { 'x-goog-api-key': process.env.GEMINI_API_KEY }, {
        contents: [{ parts: [{ text: `${p.gemini.style} ${text}` }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: p.gemini.voice } } },
        },
      });
      const data = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!data) throw new Error('no audio in response');
      return wav(Buffer.from(data, 'base64'));
    },
    chars: (text, p) => text.length + p.gemini.style.length,
  },
  elevenlabs: {
    key: 'ELEVENLABS_API_KEY',
    ext: 'mp3',
    config: (p) => ({ ...p.elevenlabs, voiceId: process.env[p.elevenlabs.voiceEnv] }),
    async synth(text, p) {
      const voiceId = process.env[p.elevenlabs.voiceEnv];
      if (!voiceId) throw new Error(`set ${p.elevenlabs.voiceEnv} to a voice id`);
      const res = await post(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, { 'xi-api-key': process.env.ELEVENLABS_API_KEY }, {
        text: `${p.elevenlabs.tag} ${text}`,
        model_id: 'eleven_v3',
      });
      return Buffer.from(await res.arrayBuffer());
    },
    chars: (text, p) => text.length + p.elevenlabs.tag.length + 1,
  },
};

async function loadQuestions() {
  const file = path.join(root, 'notes', 'questions.txt');
  const lines = existsSync(file) ? (await readFile(file, 'utf8')).split('\n').map((l) => l.trim()).filter(Boolean) : [];
  if (lines.length) return lines;
  console.log('notes/questions.txt is empty, using five placeholder questions.');
  return SAMPLE_QUESTIONS;
}

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function main() {
  await mkdir(out, { recursive: true });
  const questions = await loadQuestions();
  const columns = []; // { provider, persona }
  const clips = new Map(); // `${col}|${q}` -> file name
  let spentChars = 0;

  for (const name of Object.keys(PROVIDERS)) {
    if (only && !only.includes(name)) continue;
    const prov = PROVIDERS[name];
    const hasKey = Boolean(process.env[prov.key]);
    if (!hasKey && !dryRun) console.log(`skipping ${name}: ${prov.key} is not set`);
    for (const persona of PERSONAS) {
      const col = `${name}-${persona.id}`;
      columns.push({ col, name, persona });
      for (const q of questions) {
        const file = `${col}-${hash(q, JSON.stringify(prov.config(persona)))}.${prov.ext}`;
        const dest = path.join(out, file);
        if (existsSync(dest)) {
          clips.set(`${col}|${q}`, file);
          continue;
        }
        if (dryRun || !hasKey) continue;
        try {
          await writeFile(dest, await prov.synth(q, persona));
          spentChars += prov.chars(q, persona);
          clips.set(`${col}|${q}`, file);
          console.log(`made ${file}`);
        } catch (e) {
          console.error(`failed ${col} "${q}": ${e.message}`);
        }
      }
    }
  }

  const head = columns.map((c) => `<th>${esc(c.name)}<br><small>${esc(c.persona.label)}</small></th>`).join('');
  const rows = questions
    .map((q) => {
      const cells = columns
        .map((c) => {
          const f = clips.get(`${c.col}|${q}`);
          return `<td>${f ? `<audio controls preload="none" src="${esc(f)}"></audio>` : '<small>none</small>'}</td>`;
        })
        .join('');
      return `<tr><th scope="row" lang="es">${esc(q)}</th>${cells}</tr>`;
    })
    .join('\n');
  await writeFile(
    path.join(out, 'index.html'),
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Voice audition</title>
<style>body{font:16px system-ui;margin:1rem}table{border-collapse:collapse}th,td{border:1px solid #8884;padding:.5rem;vertical-align:top;text-align:left}audio{width:14rem}</style>
<h1>Voice audition</h1>
<p>Judge each voice on: Spanish accent, whether the persona holds across lines, and whether the tone stays school-safe.</p>
<div style="overflow-x:auto"><table><tr><th></th>${head}</tr>
${rows}
</table></div>`,
  );
  console.log(`\nOpen ${path.join(out, 'index.html')}`);
  if (spentChars) console.log(`Sent about ${spentChars} characters to providers this run (instructions and tags included). Check each dashboard for the real cost.`);
}

await main();
