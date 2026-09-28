"""Read-only technical report for generated MP3 candidates (requires soundfile/numpy)."""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
from pathlib import Path

import numpy as np
import soundfile as sf


def inspect(path: Path) -> dict[str, object]:
    samples, sample_rate = sf.read(path, dtype="float32", always_2d=True)
    if samples.size == 0:
        raise ValueError(f"Empty audio: {path}")
    absolute = np.abs(samples)
    width = min(round(sample_rate * 0.02), len(samples) // 2)
    head = samples[:width]
    tail = samples[-width:]
    rms = lambda part: float(np.sqrt(np.mean(np.square(part, dtype=np.float64))))
    result = {
        "file": path.name,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "sample_rate_hz": sample_rate,
        "channels": samples.shape[1],
        "duration_seconds_decoded": round(len(samples) / sample_rate, 3),
        "peak_dbfs": round(20 * np.log10(max(float(absolute.max()), 1e-12)), 1),
        "rms_dbfs": round(20 * np.log10(max(rms(samples), 1e-12)), 1),
        "near_silence_percent": round(100 * float(np.mean(absolute < 0.001)), 1),
        "clipped_percent": round(100 * float(np.mean(absolute >= 0.999)), 3),
        "head_20ms_rms_dbfs": round(20 * np.log10(max(rms(head), 1e-12)), 1),
        "tail_20ms_rms_dbfs": round(20 * np.log10(max(rms(tail), 1e-12)), 1),
        "seam_sample_jump": round(float(np.max(np.abs(samples[0] - samples[-1]))), 5),
    }
    if result["peak_dbfs"] < -60 or result["rms_dbfs"] < -75:
        raise ValueError(f"Candidate appears silent: {path}")
    if result["clipped_percent"] > 1:
        raise ValueError(f"Candidate appears clipped: {path}")
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("files", nargs="+", type=Path)
    args = parser.parse_args()
    for pattern in args.files:
        matches = [Path(item) for item in glob.glob(str(pattern))]
        if not matches:
            parser.error(f"No files match: {pattern}")
        for path in matches:
            print(json.dumps(inspect(path), ensure_ascii=False))


if __name__ == "__main__":
    main()
