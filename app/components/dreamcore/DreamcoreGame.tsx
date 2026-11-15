'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startChase, tick, push, wantsLookBehind, type Chase } from '../../../lib/dreamcore/chase';
import { RUNG_NAME, buildRun, emptyBlocks, firstLetters, plaqueOf, type Door } from '../../../lib/dreamcore/doors';
import { DOOR_STOP, H, W, drawMirror, image, render, type DoorRect } from '../../../lib/dreamcore/render';
import { KEY as SAVE_KEY, MUTATIONS, load, settle, type Reward, type Saved } from '../../../lib/dreamcore/rewards';
import type { LadderAnswer } from '../../../lib/memorise/ladder';
import { SOUND_KEY, soundAllowed, soundOn } from '../../../lib/practice/sound';
import { liveMatch, type LiveMatch } from '../../../lib/speech/live-match';
import { tokenise } from '../../../lib/speech/score';
import { useLiveSpeech } from '../useLiveSpeech';
import { useWakeLock } from '../useWakeLock';
import './dreamcore.css';

type Phase = 'title' | 'travel' | 'ready' | 'opening' | 'through' | 'scare' | 'result';
interface G {
  phase: Phase; t: number; camZ: number; doorZ: number; open: number; doorIndex: number; doors: Door[];
  chase: Chase; match: LiveMatch | null; baseline: number; words: number; lastVoice: number; lastProgress: number; readyAt: number;
  bits: number; tries: number; triedThisDoor: boolean; look: number; lookHeld: boolean; lookUntil: number; lastLook: number; scare: number;
  flick: number; burst: number; fade: number; reveal: { until: number; from: number }; beat: number; escaped: boolean; started: number; rect: DoorRect | null;
}

const TRAVEL = 11;
const SPEED = 5.5;

/** What the screen shows, updated a few times a second, never per frame. */
interface Ui {
  phase: Phase; index: number; door: Door | null; lit: boolean[]; showReal: number; gap: number; looking: boolean; clock: string; rect: DoorRect | null; hint: boolean;
}

export function DreamcoreGame({ answers, source }: { answers: readonly LadderAnswer[]; source: 'course' | 'sample' }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const fadeEl = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLCanvasElement>(null);
  const g = useRef<G | null>(null);
  const audio = useRef<{ ctx: AudioContext; hum: GainNode } | null>(null);
  const [saved, setSaved] = useState<Saved>(() => load(null));
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const [reward, setReward] = useState<Reward | null>(null);
  const [ui, setUi] = useState<Ui>({ phase: 'title', index: 0, door: null, lit: [], showReal: -1, gap: 0.8, looking: false, clock: '00:00', rect: null, hint: false });
  const wake = useWakeLock(ui.phase !== 'title' && ui.phase !== 'result');
  void wake;

  const calm = () => document.documentElement.dataset.calm === 'on' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => { try { setSaved(load(localStorage.getItem(SAVE_KEY))); } catch { /* storage blocked: nothing is remembered */ } }, []);

  // ----- sound: a hum, a heartbeat, a chime, one low thump. All synthesised, nothing to download. -----
  const sfx = useCallback((kind: 'chime' | 'beat' | 'thump' | 'open') => {
    const a = audio.current;
    if (!a) return;
    let on = true;
    try { on = soundAllowed({ soundOn: soundOn(localStorage.getItem(SOUND_KEY)), calm: false }); } catch { /* sound stays on */ }
    if (!on) return;
    const { ctx } = a;
    const now = ctx.currentTime;
    const note = (f: number, f2: number, dur: number, vol: number, type: OscillatorType = 'sine') => {
      const o = ctx.createOscillator();
      const gn = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, now);
      o.frequency.exponentialRampToValueAtTime(f2, now + dur);
      gn.gain.setValueAtTime(vol, now);
      gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      o.connect(gn).connect(ctx.destination);
      o.start(now);
      o.stop(now + dur + 0.05);
    };
    if (kind === 'chime') { note(523, 784, 0.5, 0.06, 'triangle'); note(1046, 1318, 0.6, 0.03, 'sine'); }
    if (kind === 'beat') { note(62, 40, 0.18, 0.16); }
    if (kind === 'open') note(180, 90, 0.5, 0.05, 'sawtooth');
    if (kind === 'thump') { note(70, 28, 0.7, 0.28); note(300, 60, 0.35, 0.05, 'sawtooth'); }
  }, []);

  const openAudio = () => {
    if (audio.current) return;
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const hum = ctx.createGain();
      hum.gain.value = 0.018;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      [100, 100.7, 200.3].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(); });
      lp.connect(hum).connect(ctx.destination);
      audio.current = { ctx, hum };
    } catch { /* no audio on this device: the game is still playable */ }
  };

  // ----- speech: one listening session for the whole run; each door counts only the words said after it opened. -----
  const speech = useLiveSpeech({
    onTranscript: (text) => {
      const s = g.current;
      if (!s) return;
      const heard = tokenise(text);
      s.words = heard.length;
      if (s.phase !== 'ready') return;
      const door = s.doors[s.doorIndex];
      const next = liveMatch(door.bits, heard.slice(s.baseline).join(' '), s.match);
      if (next.matched > (s.match?.matched ?? 0)) s.lastProgress = s.t;
      s.match = next;
      if (next.complete) succeed();
      else sync();
    },
    onVoice: () => { if (g.current) g.current.lastVoice = performance.now(); },
  });
  const micOk = speech.state === 'listening' || speech.state === 'starting' || speech.state === 'idle';
  const micRef = useRef(true);
  micRef.current = micOk;

  const clock = (s: G) => { const t = Math.floor(s.t - s.started); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  function sync() {
    const s = g.current;
    if (!s) return;
    const door = s.doors[s.doorIndex] ?? null;
    const lit = s.match ? s.match.hit.flat() : [];
    const revealing = s.t < s.reveal.until;
    setUi({ phase: s.phase, index: s.doorIndex, door, lit, showReal: revealing ? s.reveal.from : -1, gap: s.chase.gap, looking: s.look > 0.5, clock: clock(s), rect: s.rect, hint: revealing });
  }

  function startDoor(s: G) {
    s.phase = 'ready';
    s.match = null;
    s.baseline = s.words;
    s.readyAt = s.lastProgress = s.t;
    s.triedThisDoor = false;
    if (speech.state === 'idle') speech.start();
    sync();
  }
  function nextSegment(s: G) {
    s.doorZ = s.camZ + DOOR_STOP + TRAVEL;
    s.open = 0;
    s.phase = 'travel';
    s.fade = 1;
    sync();
  }
  function succeed(skipped = false) {
    const s = g.current;
    if (!s || s.phase !== 'ready') return;
    const door = s.doors[s.doorIndex];
    s.bits += door.bits.length;
    if (!skipped) s.chase = push(s.chase, door.bits.length);
    s.phase = 'opening';
    s.look = 0;
    s.lookHeld = false;
    s.burst = 0.6;
    sfx('chime');
    sync();
  }
  function endRun(escaped: boolean) {
    const s = g.current;
    if (!s) return;
    speech.stop();
    const r = settle(savedRef.current, { doors: s.doorIndex, bits: s.bits, escaped, tries: s.tries }, Math.random());
    setReward(r);
    setSaved(r.saved);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(r.saved)); } catch { /* not remembered */ }
    s.phase = 'result';
    sync();
  }

  // The loop is set up once, so it calls the latest version of these through a ref.
  const api = useRef({ sync, startDoor, nextSegment, succeed, endRun, sfx, stop: () => {} });
  api.current = { sync, startDoor, nextSegment, succeed, endRun, sfx, stop: () => speech.stop() };

  function begin() {
    openAudio();
    void audio.current?.ctx.resume();
    const doors = buildRun(answers);
    if (!doors.length) return;
    const t = performance.now() / 1000;
    g.current = {
      phase: 'travel', t, camZ: 0, doorZ: DOOR_STOP + TRAVEL, open: 0, doorIndex: 0, doors, chase: startChase(), match: null, baseline: 0, words: 0,
      lastVoice: -1e9, lastProgress: t, readyAt: t, bits: 0, tries: 0, triedThisDoor: false, look: 0, lookHeld: false, lookUntil: 0, lastLook: t, scare: -1,
      flick: 0, burst: 0.5, fade: 1, reveal: { until: 0, from: 0 }, beat: 0, escaped: false, started: t, rect: null,
    };
    setReward(null);
    speech.start();
    sync();
  }

  // ----- the loop -----
  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let idle = 0;
    const loop = (nowMs: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (nowMs - last) / 1000);
      // 30 pictures a second is plenty and keeps an old Chromebook cool.
      acc += dt;
      if (acc < 1 / 30) return;
      const step = acc;
      acc = 0;
      last = nowMs;
      const s = g.current;
      const isCalm = calm();
      const t = (s?.t ?? nowMs / 1000) + step;
      if (s) s.t = t;
      const gap = s ? s.chase.gap : 0.8;
      if (s && s.phase !== 'result') {
        const D = s.doorZ - s.camZ;
        if (s.phase === 'travel') {
          const v = Math.min(SPEED, 1.2 + (D - DOOR_STOP) * 1.6);
          s.camZ += Math.max(0.6, v) * step;
          if (s.doorZ - s.camZ <= DOOR_STOP + 0.02) { s.camZ = s.doorZ - DOOR_STOP; api.current.startDoor(s); }
        } else if (s.phase === 'opening') {
          s.open = Math.min(1, s.open + step * 1.6);
          if (s.open >= 1) { s.phase = 'through'; api.current.sfx('open'); }
        } else if (s.phase === 'through') {
          s.camZ += Math.max(0.9, D * 1.9) * step;
          if (s.doorZ - s.camZ < 0.14) {
            s.camZ = s.doorZ + 0.3;
            s.doorIndex++;
            if (s.doorIndex >= s.doors.length) { s.escaped = true; s.fade = 1; api.current.endRun(true); } else api.current.nextSegment(s);
          }
        }
        // The chase runs while walking and while a door waits, and waits for a student whose microphone is not working.
        const waiting = s.phase === 'ready';
        const trying = performance.now() - s.lastVoice < 1500;
        s.chase = tick(s.chase, { dt: step, doorIndex: s.doorIndex, trying, micOk: !waiting || micRef.current, paused: s.phase === 'opening' || s.phase === 'through' || s.phase === 'scare' });
        if (s.chase.caught && s.phase !== 'scare') {
          s.phase = 'scare';
          s.scare = 0;
          s.look = 1;
          api.current.stop();
          api.current.sfx('thump');
          api.current.sync();
        }
        // Turning round: the thing makes you, now and then, and you can choose to look.
        if (s.phase === 'ready' && s.look < 0.5 && wantsLookBehind(s.chase, t - s.lastLook, Math.random()) && !isCalm) { s.lookUntil = t + 1.6; s.lastLook = t; api.current.sfx('beat'); }
        if (s.phase === 'scare') {
          s.scare = Math.min(1, s.scare + step / (isCalm ? 2.4 : 1.1));
          if (s.scare >= 1) { s.scare = 1; api.current.endRun(false); }
        }
        const wantLook = s.phase === 'scare' || t < s.lookUntil || s.lookHeld;
        s.look += ((wantLook ? 1 : 0) - s.look) * Math.min(1, step * 9);
        // Light and glitch: always a little, more as it gets close and when a door opens.
        if (Math.random() < 0.02 + (1 - gap) * 0.04) s.flick = 0.6 + Math.random() * 0.4;
        s.flick *= 0.8;
        s.burst *= 0.9;
        s.beat -= step;
        if (s.beat <= 0 && gap < 0.5 && s.phase !== 'scare') { api.current.sfx('beat'); s.beat = 0.55 + gap * 1.3; }
        if (s.fade > 0) s.fade = Math.max(0, s.fade - step * 2.2);
        if (s.phase === 'ready' && t - s.lastProgress > 9 && t > s.reveal.until + 4) s.reveal = { from: s.match?.matched ?? 0, until: t + 3.5 };
      }
      // Draw.
      const back = s ? s.look > 0.5 : false;
      const door = s ? s.doors[s.doorIndex] : undefined;
      const rect = render({
        t, camZ: s?.camZ ?? t * 3, dir: back ? -1 : 1, doorZ: s && s.phase !== 'scare' && s.doorIndex < s.doors.length ? s.doorZ : null, open: s?.open ?? 0,
        scene: door?.scene ?? 'clouds', zone: door?.zone ?? 'pink', gap, flick: s?.flick ?? 0,
        glitch: Math.min(1, 0.05 + (1 - gap) * 0.12 + (s?.burst ?? 0) + (s?.phase === 'scare' ? (s.scare ?? 0) * 0.9 : 0)),
        scare: s ? s.scare : -1, seen: back ? 0.3 + 0.7 * Math.abs(Math.sin(t * 1.7) * Math.sin(t * 0.43)) : 0, calm: isCalm,
      });
      ctx.putImageData(image(), 0, 0);
      if (s) s.rect = rect;
      const el = frame.current;
      if (el) {
        // Handheld camera: always a slow sway, a footstep bob when moving, and more shake as it closes in.
        const k = isCalm ? 0.15 : 1;
        const fear = 1 + Math.max(0, 0.5 - gap) * 7;
        const moving = s && (s.phase === 'travel' || s.phase === 'through') ? 1 : 0;
        const sx = (Math.sin(t * 1.3) * 1.1 + Math.sin(t * 7.1) * 0.35 * fear) * k;
        const sy = (Math.sin(t * 2.1) * 0.9 + moving * Math.abs(Math.sin(t * 7)) * 2.2) * k;
        const rot = (Math.sin(t * 0.8) * 0.5 + Math.sin(t * 5.3) * 0.15 * fear) * k;
        el.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(1.05)`;
      }
      if (fadeEl.current) fadeEl.current.style.opacity = String(s ? Math.min(1, s.fade) : 0);
      if (frame.current) frame.current.style.setProperty('--dc-fear', String(Math.max(0, 1 - gap * 1.4).toFixed(2)));
      idle += step;
      if (s && idle > 0.12) { idle = 0; api.current.sync(); }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // The loop reads everything it needs through refs, so it is set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => { try { void audio.current?.ctx.close(); } catch { /* already closed */ } }, []);

  // The souvenir mirror
  useEffect(() => {
    if (ui.phase !== 'result' || !reward || !mirror.current) return;
    const c = mirror.current.getContext('2d');
    if (c) drawMirror(c, reward.mutation.id, 96, 96);
  }, [ui.phase, reward]);

  const door = ui.door;
  const plaque = door ? plaqueOf(door) : null;
  const words = door ? tokenise(door.bits.join(' ')) : [];
  const showPlaque = door && (ui.phase === 'ready') && !ui.looking;
  const noMic = speech.state === 'unsupported' || speech.state === 'denied' || speech.state === 'unavailable';
  const lookBack = () => { const s = g.current; if (s && s.phase === 'ready') { s.lookHeld = !s.lookHeld; s.lastLook = s.t; sync(); } };
  const peek = () => { const s = g.current; if (s) { s.reveal = { from: s.match?.matched ?? 0, until: s.t + 4 }; s.tries++; sync(); } };
  const skip = () => { const s = g.current; if (s) { s.tries++; succeed(true); } };

  const masked = (w: string, i: number): string => {
    if (!door) return w;
    if (ui.lit[i]) return w;
    if (ui.showReal >= 0 && i >= ui.showReal && i < ui.showReal + 3) return w;
    if (door.rung <= 2) return w;
    if (door.rung === 3) return firstLetters(w);
    if (door.rung === 4 || door.rung === 5) return emptyBlocks(w);
    return '•';
  };

  return (
    <main className="dc" data-testid="dreamcore" data-phase={ui.phase}>
      <div className="dc-stage">
        <div className="dc-frame" ref={frame}>
          <canvas ref={canvas} width={W} height={H} className="dc-canvas" aria-label="A pink corridor with doors" role="img" data-testid="dc-canvas" />
          <div className="dc-vignette" aria-hidden="true" />
          <div className="dc-fade" ref={fadeEl} aria-hidden="true" />
        </div>
        {ui.phase !== 'title' && ui.phase !== 'result' && (
          <>
            <div className="dc-hud" aria-hidden="false">
              <span className="dc-rec" aria-hidden="true">▶ PLAY {ui.clock}</span>
              <div className="dc-meter" role="meter" aria-label="How far away it is" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ui.gap * 100)} data-testid="dc-gap">
                {[0, 1, 2, 3, 4].map((n) => <i key={n} data-on={ui.gap > n / 5 + 0.04} />)}
              </div>
            </div>
            {showPlaque && plaque && door && (
              <section className="dc-plaque" data-lang={plaque.lang} data-rung={door.rung} style={{ top: `${Math.max(18, (ui.rect ? ui.rect.cy * 100 - 4 : 52))}%` }} aria-live="polite" data-testid="dc-plaque">
                <p className="dc-rung">{RUNG_NAME[door.rung]}</p>
                {door.rung >= 5 && <p className="dc-main" lang={door.rung === 5 ? 'en' : 'es'}>{plaque.main}</p>}
                {door.rung === 6 && plaque.sub && <p className="dc-sub">{plaque.sub}</p>}
                <p className="dc-words" lang="es">
                  {words.map((w, i) => (
                    <span key={i} className="dc-word" data-lit={ui.lit[i] ? 'yes' : 'no'}>{masked(w, i)}{' '}</span>
                  ))}
                </p>
              </section>
            )}
          </>
        )}
        {ui.phase === 'title' && (
          <section className="dc-card dc-title" data-testid="dc-title">
            <h1>El Pasillo</h1>
            <p className="dc-tag">Disc 2 of 2. Do not scratch.</p>
            <ul>
              <li>Say what is on each door to open it.</li>
              <li>Something is behind you. Talking keeps it back.</li>
              <li>You can look round. Do not look for long.</li>
            </ul>
            <p className="dc-small">Uses your microphone to hear you. Nothing is recorded. {source === 'sample' ? 'Practice sentences are samples here.' : 'Doors come from your own answers.'}</p>
            <button type="button" className="dc-btn" onClick={begin} data-testid="dc-start">Go in</button>
            <p className="dc-small">{saved.runs ? `Furthest: door ${saved.best}. Souvenirs: ${saved.mutations.length} of ${MUTATIONS.length}.` : 'First time in.'}</p>
            <Link href="/" className="dc-link">Back to the desktop</Link>
          </section>
        )}
        {ui.phase === 'result' && reward && (
          <section className="dc-card dc-result" data-testid="dc-result">
            <h1>{g.current?.escaped ? 'You wake up.' : 'You wake up. Something is different.'}</h1>
            <canvas ref={mirror} width={96} height={96} className="dc-mirror" aria-label={reward.mutation.line} role="img" />
            <p className="dc-souvenir">{reward.mutation.line}</p>
            <ul className="dc-effort">{reward.lines.map((l) => <li key={l}>{l}</li>)}</ul>
            <p className="dc-small">Souvenirs: {saved.mutations.length} of {MUTATIONS.length}{reward.newMutation ? ' (new)' : ''}. Stored on this device only.</p>
            <button type="button" className="dc-btn" onClick={begin} data-testid="dc-again">Go in again</button>
            <Link href="/" className="dc-link">Back to the desktop</Link>
          </section>
        )}
      </div>
      {(ui.phase === 'ready' || ui.phase === 'travel') && (
        <div className="dc-dock" data-testid="dc-dock">
          <p className="dc-status" role="status">
            {noMic ? 'No microphone. It waits for you.' : speech.state === 'needs-tap' ? 'Tap to let it hear you.' : ui.phase === 'ready' ? 'Say it. Any bit counts.' : 'Keep moving…'}
          </p>
          {speech.state === 'needs-tap' && <button type="button" className="dc-btn dc-small-btn" onClick={() => speech.start()}>Listen</button>}
          {noMic && <button type="button" className="dc-btn dc-small-btn" onClick={() => skip()} data-testid="dc-nomic">Read it aloud, then tap here</button>}
          {!noMic && ui.phase === 'ready' && (
            <div className="dc-row">
              <button type="button" className="dc-btn dc-small-btn" onClick={peek} data-testid="dc-help">Show me</button>
              <button type="button" className="dc-btn dc-small-btn" onClick={lookBack} aria-pressed={ui.looking} data-testid="dc-look">{ui.looking ? 'Face the door' : 'Look behind'}</button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
