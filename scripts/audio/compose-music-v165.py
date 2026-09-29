"""Compose three original instrumental cues for Lisière, with no external samples.

Run from the repository root with Python, NumPy, SciPy and imageio-ffmpeg.
The authored motifs, chord sequences and fixed seeds make output reproducible.
"""

from __future__ import annotations

import hashlib
import json
import math
import subprocess
from dataclasses import dataclass
from pathlib import Path

import imageio_ffmpeg
import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve


ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "tmp/host-cache/audio/local-music-v165"
LOG = ROOT / "scripts/audio/music-local-composition-log.json"
SAMPLE_RATE = 44_100


@dataclass(frozen=True)
class Note:
    beat: float
    pitch: int
    beats: float
    velocity: float
    voice: str
    pan: float = 0.0


def pitch_hz(midi: int) -> float:
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


def synth(note: Note, bpm: int, rng: np.random.Generator) -> np.ndarray:
    duration = note.beats * 60.0 / bpm
    release = {"felt": 1.5, "pluck": 1.25, "bell": 2.5, "pad": 2.0,
               "bass": 0.75, "pulse": 0.45, "brush": 0.0}[note.voice]
    count = max(1, int((duration + release) * SAMPLE_RATE))
    t = np.arange(count, dtype=np.float32) / SAMPLE_RATE
    f = pitch_hz(note.pitch)
    if note.voice == "brush":
        noise = rng.standard_normal(count).astype(np.float32)
        noise = noise - np.convolve(noise, np.ones(24, dtype=np.float32) / 24, mode="same")
        env = np.exp(-t * 34) * np.minimum(1.0, t * 850)
        return (noise * env * 0.13 * note.velocity).astype(np.float32)

    phase = 2 * np.pi * f * t
    if note.voice == "felt":
        wave = sum(a * np.sin(phase * h + 0.11 * h) for h, a in
                   [(1, .78), (2.001, .27), (3.004, .12), (4.010, .055), (5.020, .025)])
        env = np.minimum(1, t * 180) * np.exp(-t / (1.35 + duration * .25))
        env *= np.where(t <= duration, 1.0, np.exp(-(t - duration) * 2.5))
        wave += rng.standard_normal(count).astype(np.float32) * np.exp(-t * 105) * .014
    elif note.voice == "pluck":
        wave = sum(a * np.sin(phase * h + h * .32) for h, a in
                   [(1, .7), (2.003, .28), (3.009, .14), (4.02, .08), (5.03, .035)])
        env = np.minimum(1, t * 250) * np.exp(-t / (.73 + duration * .22))
        env *= np.where(t <= duration, 1, np.exp(-(t - duration) * 3.2))
        wave += rng.standard_normal(count).astype(np.float32) * np.exp(-t * 170) * .023
    elif note.voice == "bell":
        wave = (np.sin(phase) * .74 + np.sin(phase * 2.006) * .22 +
                np.sin(phase * 3.91) * .1 + np.sin(phase * 5.38) * .04)
        env = np.minimum(1, t * 350) * np.exp(-t / (1.25 + duration * .35))
        env *= np.where(t <= duration, 1, np.exp(-(t - duration) * 1.65))
    elif note.voice == "pad":
        vibrato = .003 * np.sin(2 * np.pi * 4.8 * t)
        wave = sum(a * (np.sin(phase * h * (1 + vibrato) + h * .2) +
                        np.sin(phase * h * 1.003 + h * .7)) * .5
                   for h, a in [(1, .63), (2, .21), (3, .09), (4, .035)])
        attack = np.minimum(1, t / .48)
        env = attack * np.where(t <= duration, 1, np.exp(-(t - duration) * 1.25))
    elif note.voice == "bass":
        wave = np.sin(phase) * .85 + np.sin(phase * 2) * .19 + np.sin(phase * 3) * .055
        env = np.minimum(1, t * 65) * np.exp(-t / (1.1 + duration * .6))
        env *= np.where(t <= duration, 1, np.exp(-(t - duration) * 3.3))
    else:  # subdued mallet pulse
        wave = np.sin(phase) * .77 + np.sin(phase * 2.01) * .15
        env = np.minimum(1, t * 220) * np.exp(-t * 4.1)
    return (wave * env * note.velocity).astype(np.float32)


def add_phrase(notes: list[Note], bar: int, phrase: list[tuple[float, int, float]],
               voice: str, strength: float, pan: float = 0, shift: int = 0):
    for beat, pitch, beats in phrase:
        notes.append(Note(bar * 4 + beat, pitch + shift, beats, strength, voice, pan))


DAY_CHORDS = [
    (43, (55, 59, 62, 67)), (42, (54, 57, 62, 66)),
    (40, (52, 55, 59, 64)), (36, (48, 52, 55, 60)),
    (38, (50, 54, 57, 62)), (40, (52, 55, 59, 64)),
    (36, (48, 52, 55, 60)), (38, (50, 54, 57, 62)),
]
DAY_MOTIFS = [
    [(0, 74, .8), (1.5, 71, .8), (2.65, 69, .6), (3.5, 71, .5)],
    [(.5, 69, .65), (1.45, 67, 1.0), (3, 66, .8)],
    [(0, 71, .8), (1, 74, .75), (2.3, 76, .6), (3.2, 74, .7)],
    [(.5, 71, .7), (1.5, 69, .8), (2.6, 67, 1.1)],
    [(0, 69, .7), (1.1, 71, .7), (2.4, 74, 1.25)],
    [(.45, 76, .8), (1.65, 74, .75), (3.0, 71, .7)],
    [(0, 72, .7), (1.2, 71, .7), (2.35, 69, .75), (3.35, 67, .5)],
    [(.35, 69, .65), (1.4, 67, 1.65)],
]


def make_day() -> tuple[list[Note], int, int]:
    bpm, bars = 74, 68
    notes: list[Note] = []
    section_energy = [.48, .66, .75, .54, .8, .61, .72, .5, .32]
    for bar in range(bars):
        sec, within = divmod(bar, 8)
        energy = section_energy[sec]
        bass, chord = DAY_CHORDS[(within + (2 if sec in (3, 5) else 0)) % 8]
        notes.append(Note(bar * 4, bass, 3.65, .19 * energy, "bass", -.12))
        for i, p in enumerate(chord[1:]):
            notes.append(Note(bar * 4 + .08 + i * .065, p, 3.55, .075 * energy, "pad", (i - 1) * .32))
        if sec >= 1 and sec < 8:
            arp = [0, 2, 1, 3, 2, 1] if sec % 2 else [0, 1, 2, 3, 2, 1]
            for j, idx in enumerate(arp):
                beat = [0, .75, 1.5, 2.3, 3, 3.55][j]
                notes.append(Note(bar * 4 + beat, chord[idx] + 12, .52,
                                  (.10 if j not in (0, 3) else .14) * energy, "pluck", -.28))
        if sec not in (0, 8) or within >= 4:
            motif = DAY_MOTIFS[(within + (2 if sec == 3 else 0)) % 8]
            if sec in (2, 6) and within in (2, 6):
                motif = [(b, p + 12 if p < 72 else p, d) for b, p, d in motif]
            add_phrase(notes, bar, motif, "felt", .22 * energy, .18)
        if sec in (2, 4, 6) and within in (3, 7):
            notes.append(Note(bar * 4 + 3.15, chord[-1] + 12, 1.5,
                              .075 * energy, "bell", .35))
    return notes, bpm, bars


NIGHT_CHORDS = [
    (40, (52, 55, 59, 62)), (38, (50, 54, 57, 61)),
    (36, (48, 52, 55, 59)), (38, (50, 54, 57, 61)),
    (40, (52, 55, 59, 62)), (43, (55, 59, 62, 66)),
    (45, (57, 60, 64, 67)), (38, (50, 54, 57, 61)),
]
NIGHT_MOTIFS = [
    [(.4, 71, 1.5), (2.65, 67, .9)],
    [(1, 69, 1.2), (3.0, 66, .8)],
    [(.35, 67, 1.2), (2.3, 71, 1.3)],
    [(1.4, 74, .75), (2.55, 73, 1.1)],
    [(.2, 71, .8), (1.4, 69, .9), (3.1, 67, .7)],
    [(1.1, 66, 1.2), (3.0, 69, .6)],
    [(.55, 67, 1.45), (2.7, 64, .9)],
    [(.5, 66, 1.0), (2.2, 64, 1.35)],
]


def make_night() -> tuple[list[Note], int, int]:
    bpm, bars = 68, 64
    notes: list[Note] = []
    energy = [.34, .48, .59, .45, .64, .49, .51, .28]
    for bar in range(bars):
        sec, within = divmod(bar, 8)
        bass, chord = NIGHT_CHORDS[(within + (4 if sec == 3 else 0)) % 8]
        gain = energy[sec]
        notes.append(Note(bar * 4, bass, 3.8, .16 * gain, "bass", -.1))
        for i, p in enumerate(chord[1:]):
            notes.append(Note(bar * 4 + i * .12, p + 12, 3.3, .083 * gain,
                              "pad", (i - 1) * .44))
        # Two moving celesta-like plucks leave ample space for colony foley.
        if sec != 0 or within >= 4:
            for j, idx in enumerate([1, 3, 2] if bar % 2 else [2, 1, 3]):
                notes.append(Note(bar * 4 + [.2, 1.8, 3.1][j], chord[idx] + 12,
                                  .9, .10 * gain, "bell", -.24 + .25 * j))
        if sec in (1, 2, 4, 5, 6) or (sec == 3 and within > 3):
            add_phrase(notes, bar, NIGHT_MOTIFS[(within + (1 if sec == 5 else 0)) % 8],
                       "felt", .19 * gain, .13)
        if sec in (2, 4, 6) and within in (0, 4):
            notes.append(Note(bar * 4 + 2.25, chord[2] + 24, 1.2,
                              .043 * gain, "bell", .4))
    return notes, bpm, bars


TENSE_CHORDS = [
    (40, (52, 55, 59, 62)), (36, (48, 52, 55, 59)),
    (43, (55, 59, 62, 67)), (38, (50, 54, 57, 62)),
    (40, (52, 55, 59, 62)), (36, (48, 52, 55, 59)),
    (45, (57, 60, 64, 69)), (35, (47, 51, 54, 59)),
]
TENSE_MOTIFS = [
    [(0, 71, .55), (.9, 67, .5), (2.3, 69, .65), (3.35, 71, .5)],
    [(.55, 67, .8), (2, 66, .6), (3.1, 64, .65)],
    [(0, 74, .8), (1.5, 71, .65), (3.1, 69, .6)],
    [(.4, 66, .7), (1.65, 69, .8), (3.05, 67, .55)],
    [(0, 71, .55), (1.15, 74, .55), (2.35, 72, .6), (3.35, 71, .5)],
    [(.35, 69, .7), (1.7, 67, .7), (3, 64, .8)],
    [(0, 72, .8), (2.05, 69, .7), (3.1, 67, .5)],
    [(.55, 66, .7), (2.15, 65, .9)],
]


def make_tension() -> tuple[list[Note], int, int]:
    bpm, bars = 88, 84
    notes: list[Note] = []
    energy = [.32, .52, .65, .43, .73, .56, .71, .48, .78, .51, .27]
    for bar in range(bars):
        sec, within = divmod(bar, 8)
        gain = energy[sec]
        bass, chord = TENSE_CHORDS[(within + (2 if sec in (3, 7) else 0)) % 8]
        notes.append(Note(bar * 4, bass, 2.8, .16 * gain, "bass", -.12))
        for i, p in enumerate(chord[1:]):
            notes.append(Note(bar * 4 + i * .075, p + 12, 3.7,
                              .065 * gain, "pad", (i - 1) * .35))
        if sec < 10:
            for j, beat in enumerate([0, .75, 1.5, 2.25, 3.0, 3.5]):
                if sec in (0, 10) and j % 2:
                    continue
                notes.append(Note(bar * 4 + beat, bass + 12 if j % 3 else bass,
                                  .45, (.08 if j % 3 else .11) * gain,
                                  "pulse", -.23 if j % 2 else .23))
        if sec in (1, 2, 4, 5, 6, 8, 9):
            add_phrase(notes, bar, TENSE_MOTIFS[(within + (1 if sec in (5, 9) else 0)) % 8],
                       "felt", .16 * gain, .18)
        if sec in (2, 4, 6, 8) and bar % 2 == 0:
            notes.append(Note(bar * 4 + 2.9, 60, .15, .028 * gain, "brush", .37))
        if sec == 8 and within in (2, 6):
            notes.append(Note(bar * 4 + 3.0, chord[2] + 24, 1.2, .055,
                              "bell", .4))
    return notes, bpm, bars


def room_ir(seed: int, seconds: float = 1.25) -> np.ndarray:
    rng = np.random.default_rng(seed)
    length = int(seconds * SAMPLE_RATE)
    ir = np.zeros(length, dtype=np.float32)
    for delay, gain in [(.043, .28), (.079, .23), (.137, .17), (.211, .13),
                        (.307, .09), (.431, .065), (.68, .04)]:
        ir[int(delay * SAMPLE_RATE)] += gain
    noise = rng.standard_normal(length).astype(np.float32)
    # Soft diffuse tail; a first-order low-pass removes harsh high frequencies.
    filtered = np.cumsum(noise)
    filtered -= np.linspace(0, filtered[-1], length, dtype=np.float32)
    filtered /= max(np.max(np.abs(filtered)), 1e-9)
    time = np.arange(length, dtype=np.float32) / SAMPLE_RATE
    ir += filtered * np.exp(-time * 5.4) * .017
    return ir


def render(name: str, builder, seed: int, role: str, prompt: str) -> dict:
    notes, bpm, bars = builder()
    total_seconds = bars * 4 * 60 / bpm + 3.6
    frames = math.ceil(total_seconds * SAMPLE_RATE)
    stereo = np.zeros((frames, 2), dtype=np.float32)
    rng = np.random.default_rng(seed)
    for note in notes:
        wave = synth(note, bpm, rng)
        start = int(note.beat * 60 / bpm * SAMPLE_RATE)
        end = min(frames, start + len(wave))
        left = math.sqrt((1 - note.pan) / 2)
        right = math.sqrt((1 + note.pan) / 2)
        stereo[start:end, 0] += wave[:end-start] * left
        stereo[start:end, 1] += wave[:end-start] * right

    for channel in range(2):
        ir = room_ir(seed + channel * 37)
        wet = fftconvolve(stereo[:, channel], ir, mode="full")[:frames]
        stereo[:, channel] += wet.astype(np.float32) * .16

    fade_in = int(2.4 * SAMPLE_RATE)
    fade_out = int(4.5 * SAMPLE_RATE)
    stereo[:fade_in] *= np.linspace(0, 1, fade_in, dtype=np.float32)[:, None]
    stereo[-fade_out:] *= np.linspace(1, 0, fade_out, dtype=np.float32)[:, None]
    rms = float(np.sqrt(np.mean(stereo.astype(np.float64) ** 2)))
    peak = float(np.max(np.abs(stereo)))
    desired_rms = 10 ** (-24 / 20)
    scale = min(desired_rms / max(rms, 1e-9), 10 ** (-5 / 20) / max(peak, 1e-9))
    stereo *= scale
    peak = float(np.max(np.abs(stereo)))
    rms = float(np.sqrt(np.mean(stereo.astype(np.float64) ** 2)))

    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    command = [ffmpeg, "-hide_banner", "-loglevel", "error", "-y",
               "-f", "f32le", "-ar", str(SAMPLE_RATE), "-ac", "2", "-i", "pipe:0",
               "-codec:a", "libmp3lame", "-b:a", "160k", "-write_xing", "1", str(path)]
    result = subprocess.run(command, input=stereo.tobytes(), capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace"))
    data = path.read_bytes()
    decoded_peak = 0.0
    decoded_squares = 0.0
    decoded_samples = 0
    with sf.SoundFile(path) as file:
        decoded_seconds = file.frames / file.samplerate
        for block in file.blocks(blocksize=10 * SAMPLE_RATE,
                                 dtype="float32", always_2d=True):
            decoded_peak = max(decoded_peak, float(np.max(np.abs(block))))
            decoded_squares += float(np.sum(block.astype(np.float64) ** 2))
            decoded_samples += block.size
    decoded_rms = math.sqrt(decoded_squares / decoded_samples)
    return {
        "id": name.removesuffix(".mp3"), "filename": name, "role": role,
        "description": prompt, "bars": bars, "bpm": bpm,
        "decodedDurationSeconds": round(decoded_seconds, 3),
        "sampleRateHz": SAMPLE_RATE, "channels": 2, "bitrateKbps": 160,
        "decodedPeakDbfs": round(20 * math.log10(max(decoded_peak, 1e-9)), 2),
        "decodedRmsDbfs": round(20 * math.log10(max(decoded_rms, 1e-9)), 2),
        "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(),
        "noteEvents": len(notes), "seed": seed,
        "measurement": "soundfile PCM decode of locally composed MP3; peak and full-file RMS",
    }


def main():
    specs = [
        ("lisiere-aube-v1.mp3", make_day, 16501, "day",
         "Warm pastoral daytime cue, felt piano melody, plucked strings, gentle pad and bass; four-beat motion and evolving eight-bar sections."),
        ("lisiere-veille-v1.mp3", make_night, 16502, "night",
         "Reflective night cue, sparse felt piano and bell counterpoint over airy chords; slower, softer sections and long rests."),
        ("lisiere-alerte-v1.mp3", make_tension, 16503, "tension",
         "Restrained threat cue, low mallet pulse, minor-key piano figures and soft strings; gradual rises and releases without bombast."),
    ]
    tracks = [render(*spec) for spec in specs]
    log = {
        "version": 1, "generatedAt": "2026-09-29", "provider": "local composition",
        "source": "scripts/audio/compose-music-v165.py",
        "outputDirectory": "tmp/host-cache/audio/local-music-v165",
        "externalSamples": False, "externalModels": False,
        "coreReferenceVersion": "RimWorld Core 1.6.4871 rev590 (installed)",
        "authoring": "Original chord progressions, motifs and procedural arrangement; NumPy/SciPy synthesis and bundled FFmpeg MP3 encoding.",
        "apiCredits": 0, "licensing": "Original local synthesis; no ElevenLabs Music output or RimWorld audio used.",
        "licenseCaveat": "Music is original local synthesis. The FFmpeg encoder and Python tools do not add third-party musical content; human review remains required for subjective quality.",
        "tracks": tracks,
    }
    LOG.write_text(json.dumps(log, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(tracks, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
