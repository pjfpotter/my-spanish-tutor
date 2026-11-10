#!/usr/bin/env python3
"""Give the sound effects a dreamcore finish: a little phasing, a subtle
reverb and a suggestion of radio interference.

Reads clean clips from --src, writes processed copies to --out, and never
touches the originals. Needs ffmpeg 5.0 or newer (for amix normalize=0):
    sudo apt install ffmpeg

Usage:
    python3 scripts/dreamcore-sfx.py --dry-run          # print what would happen
    python3 scripts/dreamcore-sfx.py                    # process every clip
    python3 scripts/dreamcore-sfx.py --only 'tele-*'    # only matching files
    python3 scripts/dreamcore-sfx.py --amount 0.5       # half as much of every effect
    python3 scripts/dreamcore-sfx.py --amount 1.5       # more obvious
    python3 scripts/dreamcore-sfx.py --force            # overwrite existing outputs

Tune the sound by editing PRESETS below. Each preset is one family of clips,
picked by filename prefix (see PRESET_FOR_PREFIX).

Effects per clip:
  phaser   slow, shallow phasing (decay is how strong it is, 0 = off)
  reverb   short dark reverb from a synthetic impulse response; wet is the
           level of the reverb (0 = off), tail is how many seconds are added
           to the end of the clip so the reverb can ring out
  noise    quiet band-limited noise that wobbles like a tuned-off radio;
           level is in dBFS, None = off
  lowpass  top of the final sound in Hz, so everything feels slightly far away
"""

from __future__ import annotations

import argparse
import fnmatch
import hashlib
import math
import random
import shutil
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_RATE = 44100

PRESETS = {
    # Correct, combo, personal best, section complete, Tele correct and wrong.
    'full': dict(phaser=0.40, phaser_speed=0.3, wet=0.20, rt60=0.40, tail=0.40, noise=-38, lowpass=8500),
    # Very short tile sounds: nearly dry so fast play stays crisp.
    'tap': dict(phaser=0.0, phaser_speed=0.3, wet=0.08, rt60=0.15, tail=0.10, noise=-48, lowpass=9500),
    # Miss: keep it kind and clean, no interference that could sound like an error.
    'miss': dict(phaser=0.25, phaser_speed=0.3, wet=0.12, rt60=0.30, tail=0.25, noise=None, lowpass=9000),
    # Idle hum already has static in it, and must keep its length for looping.
    'idle': dict(phaser=0.30, phaser_speed=0.2, wet=0.15, rt60=0.40, tail=0.0, noise=None, lowpass=8500),
}

# First match wins. Anything else uses 'full'.
PRESET_FOR_PREFIX = [('tap-', 'tap'), ('miss-', 'miss'), ('tele-idle-', 'idle')]


def preset_for(name: str) -> tuple[str, dict]:
    for prefix, key in PRESET_FOR_PREFIX:
        if name.startswith(prefix):
            return key, PRESETS[key]
    return 'full', PRESETS['full']


def require_ffmpeg(dry_run: bool) -> None:
    missing = [t for t in ('ffmpeg', 'ffprobe') if shutil.which(t) is None]
    if missing:
        if dry_run:
            print(f'(note: {", ".join(missing)} not found; install ffmpeg before a real run)')
            return
        sys.exit(f'Missing {", ".join(missing)}. Install it with: sudo apt install ffmpeg')
    help_text = subprocess.run(
        ['ffmpeg', '-hide_banner', '-h', 'filter=amix'], capture_output=True, text=True
    ).stdout
    if 'normalize' not in help_text and not dry_run:
        sys.exit('This ffmpeg is too old (amix has no "normalize" option). Use ffmpeg 5.0 or newer.')


def duration_of(path: Path) -> float:
    if shutil.which('ffprobe') is None:
        return 1.0  # dry run only
    out = subprocess.run(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return float(out)


def write_impulse_response(path: Path, rt60: float) -> None:
    """A short, dark, slightly different-per-ear reverb tail (stereo wav)."""
    rng = random.Random(1969)
    length = int(SAMPLE_RATE * (rt60 + 0.1))
    predelay = int(SAMPLE_RATE * 0.008)
    channels = []
    for _ in range(2):
        samples = [0.0] * length
        lp = 0.0
        for i in range(predelay, length):
            t = (i - predelay) / SAMPLE_RATE
            env = math.exp(-6.9 * t / rt60)  # 60 dB down at rt60
            lp += 0.35 * (rng.gauss(0, 1) - lp)  # one-pole low-pass: dark tail
            samples[i] = lp * env
        channels.append(samples)
    peak = max(abs(s) for ch in channels for s in ch) or 1.0
    with wave.open(str(path), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for i in range(length):
            for ch in channels:
                frames += struct.pack('<h', int(ch[i] / peak * 30000))
        w.writeframes(bytes(frames))


def build_command(src: Path, dst: Path, p: dict, amount: float, ir: Path | None) -> list[str]:
    dur = duration_of(src)
    tail = p['tail']
    total = dur + tail
    phaser = min(p['phaser'] * amount, 0.9)
    wet = min(p['wet'] * amount, 1.0)
    use_noise = p['noise'] is not None
    seed = int(hashlib.md5(src.name.encode()).hexdigest()[:6], 16)

    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(src)]
    next_input = 1
    ir_input = noise_input = None
    if wet > 0 and ir is not None:
        cmd += ['-i', str(ir)]
        ir_input, next_input = next_input, next_input + 1
    if use_noise:
        cmd += ['-f', 'lavfi', '-t', f'{total:.3f}', '-i',
                f'anoisesrc=color=pink:amplitude=1:sample_rate={SAMPLE_RATE}:seed={seed}']
        noise_input = next_input

    g = []
    g.append(f'[0:a]aformat=sample_rates={SAMPLE_RATE}:channel_layouts=stereo,'
             f'apad=pad_dur={tail:.3f},atrim=0:{total:.3f}[src]')
    last = 'src'
    if phaser > 0:
        g.append(f'[{last}]aphaser=in_gain=0.9:out_gain=0.9:delay=3:decay={phaser:.2f}'
                 f':speed={p["phaser_speed"]}[ph]')
        last = 'ph'
    if ir_input is not None:
        g.append(f'[{last}]asplit=2[dry][rin]')
        g.append(f'[rin][{ir_input}:a]afir=dry=0:wet=1[wraw]')
        g.append('[wraw]highpass=f=200,lowpass=f=3500[wetsig]')
        g.append(f'[dry][wetsig]amix=inputs=2:weights=1 {wet:.2f}:normalize=0[rv]')
        last = 'rv'
    if use_noise:
        level = p['noise'] + 20 * math.log10(max(amount, 0.01))
        fade_out = min(0.1, total / 2)
        g.append(f'[{noise_input}:a]highpass=f=500,lowpass=f=6500,tremolo=f=6:d=0.9,'
                 f'volume={level:.1f}dB,afade=t=in:d=0.03,afade=t=out:st={total - fade_out:.3f}:d={fade_out:.3f},'
                 f'aformat=channel_layouts=stereo[nz]')
        g.append(f'[{last}][nz]amix=inputs=2:normalize=0[mx]')
        last = 'mx'
    fade = min(0.04, total / 2)
    g.append(f'[{last}]highpass=f=60,lowpass=f={p["lowpass"]},alimiter=limit=0.89,'
             f'afade=t=out:st={total - fade:.3f}:d={fade:.3f}[out]')

    cmd += ['-filter_complex', ';'.join(g), '-map', '[out]',
            # Short interface sounds: mono at 64 kbps keeps public/ inside the performance budget.
            '-ac', '1', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '64k', str(dst)]
    return cmd


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--src', type=Path, default=ROOT / 'public/audio/sfx', help='folder of clean clips')
    ap.add_argument('--out', type=Path, default=ROOT / 'public/audio/sfx-dreamcore', help='folder for processed clips')
    ap.add_argument('--amount', type=float, default=1.0, help='scales every effect (0.5 = half, 1.5 = more)')
    ap.add_argument('--only', default='*', help='glob on file names, e.g. "tele-*"')
    ap.add_argument('--force', action='store_true', help='overwrite existing outputs')
    ap.add_argument('--dry-run', action='store_true', help='print the ffmpeg commands and do nothing')
    args = ap.parse_args()

    if args.amount <= 0:
        sys.exit('--amount must be above 0. To keep a clip clean, just use the original.')
    if args.src.resolve() == args.out.resolve():
        sys.exit('--src and --out must be different folders; the originals are never overwritten.')
    if not args.src.is_dir():
        sys.exit(f'No such folder: {args.src}')

    require_ffmpeg(args.dry_run)
    files = sorted(f for f in args.src.glob('*.mp3') if fnmatch.fnmatch(f.name, args.only))
    if not files:
        sys.exit(f'No mp3 files matching "{args.only}" in {args.src}')
    if not args.dry_run:
        args.out.mkdir(parents=True, exist_ok=True)

    done = skipped = failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        irs: dict[float, Path] = {}
        for src in files:
            key, p = preset_for(src.name)
            dst = args.out / src.name
            if dst.exists() and not args.force:
                print(f'skip   {src.name} (already in {args.out.name}; use --force)')
                skipped += 1
                continue
            ir = None
            if p['wet'] * args.amount > 0:
                if p['rt60'] not in irs:
                    irs[p['rt60']] = Path(tmp) / f'ir-{p["rt60"]}.wav'
                    write_impulse_response(irs[p['rt60']], p['rt60'])
                ir = irs[p['rt60']]
            cmd = build_command(src, dst, p, args.amount, ir)
            if args.dry_run:
                print(f'[{key}] {" ".join(repr(c) if " " in c or ";" in c or "[" in c else c for c in cmd)}\n')
                continue
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                print(f'FAILED {src.name} [{key}]\n{result.stderr.strip()}')
                failed += 1
            else:
                print(f'done   {src.name} [{key}]')
                done += 1

    if not args.dry_run:
        print(f'\n{done} processed, {skipped} skipped, {failed} failed -> {args.out}')
        if failed:
            sys.exit(1)


if __name__ == '__main__':
    main()
