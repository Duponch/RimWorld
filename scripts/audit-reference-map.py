#!/usr/bin/env python3
"""Read a RimWorld save without launching the game or exposing personal fields.

Usage: python scripts/audit-reference-map.py SAVE.rws [--defs-root CORE/Defs]
       [--output REPORT.json]

The optional Core definitions only supply *candidate* names for short hashes.
This is not the game's complete dynamic Def allocator. Ambiguous/unknown hashes
remain in the report; matching game versions and checking candidates is required
before using them as calibration data. No world seed, pawn name, scenario prose,
save filename, account identifier, or absolute path is emitted.
"""

import argparse
import base64
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import struct
import sys
import xml.etree.ElementTree as ET
import zlib


STONES = {"Granite", "Limestone", "Marble", "Sandstone", "Slate"}
ORES = {"MineableSteel", "MineableComponentsIndustrial", "MineableSilver",
        "MineableGold", "MineableUranium", "MineablePlasteel", "MineableJade"}
DEF_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_.-]{0,159}\Z")
MAX_GRID_BYTES = 32 * 1024 * 1024


def token(value):
    """Only Def/class identifiers, never labels or descriptions."""
    return value if value and DEF_TOKEN.fullmatch(value) else None


def parse_xml(data):
    # ElementTree otherwise expands internal entities; save files need no DTD.
    if b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        raise ValueError("DTD/entity declarations are not supported")
    return ET.fromstring(data)


def integer(value):
    return int(value) if value is not None and re.fullmatch(r"-?\d+", value) else None


def stable_short_hash(name):
    value = 23
    for char in name:
        value = (value * 31 + ord(char)) & 0xFFFFFFFF
    signed = value if value < 0x80000000 else value - 0x100000000
    remainder = abs(signed) % 65535
    return (-remainder if signed < 0 else remainder) & 65535


class Definitions:
    def __init__(self, root=None):
        self.names = defaultdict(set)
        self.parents = {}
        self.things = {}
        self.hashes = defaultdict(lambda: defaultdict(set))
        self.files = 0
        self.fingerprint = None
        if root is None:
            return
        digest = hashlib.sha256()
        files = sorted(root.rglob("*.xml"))
        if not files:
            raise ValueError("definitions directory has no XML files")
        for path in files:
            raw = path.read_bytes()
            digest.update(path.relative_to(root).as_posix().encode() + b"\0")
            digest.update(hashlib.sha256(raw).digest())
            self.files += 1
            for definition in parse_xml(raw):
                # This tool deliberately supports only a Core-only active set.
                if definition.get("MayRequire") or definition.get("MayRequireAnyOf"):
                    continue
                if definition.get("Name"):
                    self.parents[definition.get("Name")] = definition
                name = token(definition.findtext("defName"))
                if name and definition.get("Abstract", "false").lower() != "true":
                    self.names[definition.tag].add(name)
                    if definition.tag == "ThingDef":
                        self.things[name] = definition
        self.fingerprint = digest.hexdigest()
        for stone in STONES:
            if stone in self.names["ThingDef"]:
                self.names["TerrainDef"].update(
                    stone + suffix for suffix in ("_Rough", "_RoughHewn", "_Smooth"))
        for kind, names in self.names.items():
            for name in names:
                self.hashes[kind][stable_short_hash(name)].add(name)
        # A verified local collision: generated squirrel meat is sorted before
        # MineableSteel. Reserve both locations as candidates, not a generic fix.
        if "MineableSteel" in self.names["ThingDef"]:
            self.hashes["ThingDef"][27292].add("Meat_Squirrel")

    def field(self, name, path):
        node = self.things.get(name)
        seen = set()
        while node is not None and id(node) not in seen:
            seen.add(id(node))
            result = node.findtext(path)
            if result is not None:
                return result
            node = self.parents.get(node.get("ParentName"))
        return None

    def inherits(self, name, ancestor):
        node = self.things.get(name)
        seen = set()
        while node is not None and id(node) not in seen:
            seen.add(id(node))
            if node.get("ParentName") == ancestor:
                return True
            node = self.parents.get(node.get("ParentName"))
        return False

    def candidates(self, kind, code, core_4871):
        if kind == "ThingDef" and core_4871 and "MineableSteel" in self.names[kind]:
            if code == 27293:
                return {"MineableSteel"}
            if code == 27292:
                return {"Meat_Squirrel"}
        return self.hashes[kind].get(code, set())


def grid(element, path, fmt="H", expected=None):
    text = element.findtext(path) if element is not None else None
    if text is None:
        return None
    encoded = base64.b64decode("".join(text.split()), validate=True)
    decoder = zlib.decompressobj(-15)
    raw = decoder.decompress(encoded, MAX_GRID_BYTES + 1)
    if len(raw) > MAX_GRID_BYTES or decoder.unconsumed_tail:
        raise ValueError("compressed grid exceeds size limit")
    if not decoder.eof or decoder.unused_data:
        raise ValueError("incomplete or concatenated compressed grid")
    unit = struct.calcsize(fmt)
    if len(raw) % unit or (expected is not None and len(raw) != expected * unit):
        raise ValueError("compressed grid dimensions do not match")
    return struct.unpack("<" + str(len(raw) // unit) + fmt, raw)


def grid_report(values, kind, definitions, core_4871):
    if values is None:
        return {"status": "missing", "cell_count": None}
    named, unresolved = Counter(), {}
    empty = 0
    for code, count in sorted(Counter(values).items()):
        if code == 0:
            empty = count
            continue
        candidates = sorted(definitions.candidates(kind, code, core_4871))
        if len(candidates) == 1:
            named[candidates[0]] += count
        else:
            unresolved[str(code)] = {"cells": count, "candidates": candidates}
    return {"status": "candidate_names" if definitions.files else "unresolved",
            "cell_count": len(values), "empty_cells": empty,
            "cells_by_def_candidate": dict(sorted(named.items())),
            "unresolved_hashes": unresolved}


def tile_context(root, map_node, definitions, core_4871):
    parent = map_node.findtext("mapInfo/parent")
    matching = [node for node in root.findall("game/world/worldObjects/worldObjects/li")
                if "WorldObject_" + (node.findtext("ID") or "") == parent]
    tile_text = matching[0].findtext("tile") if len(matching) == 1 else None
    # Never substitute the starting tile for a different/unresolved map parent.
    if not tile_text or not re.fullmatch(r"\d+(?:,\d+)?", tile_text):
        return {"status": "unknown", "biome_candidate": None, "hilliness": None}
    values = [int(value) for value in tile_text.split(",")]
    tile, layer_id = values[0], values[1] if len(values) == 2 else 0
    world_grid = root.find("game/world/grid")
    if world_grid is None:
        return {"status": "unknown", "biome_candidate": None, "hilliness": None}
    layer = world_grid
    if world_grid.find("layers") is not None:
        matches = [node for node in world_grid.findall("layers/values/li")
                   if integer(node.findtext("layerId")) == layer_id]
        layer = matches[0] if len(matches) == 1 else None
    biomes = grid(layer, "tileBiomeDeflate")
    hills = grid(layer, "tileHillinessDeflate", "B")
    if biomes is None or hills is None or tile >= min(len(biomes), len(hills)):
        return {"status": "unknown", "biome_candidate": None, "hilliness": None}
    names = definitions.candidates("BiomeDef", biomes[tile], core_4871)
    result = {"status": "decoded_tile", "biome_candidate": next(iter(names)) if len(names) == 1 else None,
              "biome_hash": biomes[tile],
              "hilliness": {1: "flat", 2: "small-hills", 3: "large-hills", 4: "mountainous",
                            5: "impassable"}.get(hills[tile]),
              "world_rivers": "unknown", "caves": "unknown"}
    return result


def map_report(root, node, definitions, core_4871):
    size = re.fullmatch(r"\((\d+),\s*(\d+),\s*(\d+)\)", node.findtext("mapInfo/size") or "")
    if not size:
        raise ValueError("unsupported map dimensions")
    width, depth, height = map(int, size.groups())
    if depth != 1 or not width or not height or width * height > MAX_GRID_BYTES // 2:
        raise ValueError("unsupported map dimensions")
    area = width * height
    things = node.findall("things/thing") or list(node.find("things") or [])
    plants, pawns, animals = Counter(), Counter(), Counter()
    berries = []
    unclassified = 0
    for thing in things:
        name = token(thing.findtext("def"))
        if not name:
            continue
        class_name = thing.get("Class", "")
        if class_name == "Plant":
            plants[name] += 1
            if name == "Plant_Berry":
                # Absence uses the serialized-class default; report unknown here.
                growth = thing.findtext("growth")
                berries.append(float(growth) if growth is not None else None)
        if class_name == "Pawn":
            pawns[name] += 1
            intelligence = definitions.field(name, "race/intelligence")
            if intelligence == "Animal" or definitions.inherits(name, "AnimalThingBase"):
                animals[name] += 1
            elif intelligence is None:
                unclassified += 1
    terrain = grid_report(grid(node, "terrainGrid/topGridDeflate", expected=area),
                          "TerrainDef", definitions, core_4871)
    compressed = grid_report(grid(node, "compressedThingMapDeflate", expected=area),
                             "ThingDef", definitions, core_4871)
    roofs = grid_report(grid(node, "roofGrid/roofsDeflate", expected=area),
                       "RoofDef", definitions, core_4871)
    named = compressed.get("cells_by_def_candidate", {})
    terrain_named = terrain.get("cells_by_def_candidate", {})
    return {"dimensions": [width, height], "area": area,
            "site": tile_context(root, node, definitions, core_4871),
            "terrain": terrain, "roofs": roofs, "compressed_things": compressed,
            "candidate_counts": {
                "natural_rock_cells": sum(named.get(name, 0) for name in STONES),
                "ore_cells_by_def": {name: count for name, count in named.items() if name in ORES},
                "loose_chunk_cells_by_def": {name: count for name, count in named.items() if name.startswith("Chunk")},
                "running_water_cells": sum(count for name, count in terrain_named.items() if name.startswith("WaterMoving"))},
            "direct_counts": {"plants_by_def": dict(sorted(plants.items())),
                "plant_total": sum(plants.values()),
                "tree_total_by_name_prefix": sum(count for name, count in plants.items() if name.startswith("Plant_Tree")),
                "berry_growth": {"count": len(berries), "unknown": berries.count(None),
                    "ge_065": sum(value is not None and value >= 0.65 for value in berries),
                    "ge_1": sum(value is not None and value >= 1 for value in berries)},
                "spawned_pawns_by_def": dict(sorted(pawns.items())),
                "spawned_animals_by_def": dict(sorted(animals.items())),
                "pawns_with_unclassified_race": unclassified}}


def audit(save, definitions):
    data = save.read_bytes()
    root = parse_xml(data)
    if root.tag != "savegame" or root.find("game") is None:
        raise ValueError("expected a RimWorld savegame")
    version_raw = root.findtext("meta/gameVersion") or ""
    version = version_raw if re.fullmatch(r"\d+\.\d+\.\d+(?: rev\d+)?", version_raw) else None
    mods = [value.text.lower() for value in root.findall("meta/modIds/li") if value.text]
    core_only = mods == ["ludeon.rimworld"]
    if definitions.files and not core_only:
        raise ValueError("Core hash candidates require exactly one active Core package")
    core_4871 = core_only and bool(version and version.startswith("1.6.4871 "))
    parts = Counter(token(node.get("Class")) or "unknown" for node in root.findall("game/scenario/parts/li"))
    report = {"format_version": 1, "source_sha256": hashlib.sha256(data).hexdigest(),
              "source_bytes": len(data), "game_version": version,
              "active_packages": {"count": len(mods), "core_only": core_only},
              "elapsed_ticks": integer(root.findtext("game/tickManager/ticksGame")),
              "scenario": {"def": token(root.findtext("game/scenario/scenarioDef")),
                           "part_classes": dict(sorted(parts.items())),
                           "identity": "unknown_without_separate_definition_comparison"},
              "storyteller": token(root.findtext("game/storyteller/def")),
              "difficulty": token(root.findtext("game/storyteller/difficulty")),
              "definitions": {"xml_file_count": definitions.files,
                              "manifest_sha256": definitions.fingerprint},
              "limits": ["Short-hash labels are candidates, not a complete runtime Def allocation.",
                         "Dynamic stone terrain names are included; other generated Defs may be missing.",
                         "The verified Core 1.6.4871 steel/squirrel-meat collision is adjusted only for that version.",
                         "Compressed grids include hidden cells; ore is not necessarily visible or accessible.",
                         "Direct counts include spawned map objects, not container contents or off-map pawns.",
                         "Animal counts include tame and wild animals; no faction or personal identity is emitted.",
                         "No world river graph or cave mutator decoding: these properties remain unknown.",
                         "A single snapshot cannot establish generation distributions or progression rates."],
              "maps": [map_report(root, node, definitions, core_4871) for node in root.findall("game/maps/li")]}
    if hashlib.sha256(save.read_bytes()).hexdigest() != report["source_sha256"]:
        raise ValueError("save changed during the audit; retry once saving has finished")
    return report


def checked_output(save, output):
    if output is None:
        return None
    target = output.resolve()
    save = save.resolve()
    if target.suffix.lower() != ".json":
        raise ValueError("output must be a JSON file")
    protected = next((parent for parent in save.parents if parent.name.lower() == "saves"), save.parent)
    if target == save or target.is_relative_to(protected):
        raise ValueError("output cannot be inside the source save directory")
    if target.exists():
        raise ValueError("output already exists; choose a new report filename")
    return target


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("save", type=Path)
    parser.add_argument("--defs-root", type=Path, help="Optional local Core/Defs directory; no files are copied")
    parser.add_argument("--output", type=Path, help="New JSON outside the save directory; otherwise stdout")
    args = parser.parse_args(argv)
    try:
        save = args.save.resolve(strict=True)
        if save.suffix.lower() != ".rws":
            raise ValueError("input must be a .rws file")
        output = checked_output(save, args.output)
        definitions = Definitions(args.defs_root.resolve(strict=True) if args.defs_root else None)
        report = audit(save, definitions)
        text = json.dumps(report, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
        if output is None:
            print(text, end="")
        else:
            with output.open("x", encoding="utf-8", newline="\n") as stream:
                stream.write(text)
    except (OSError, ValueError, ET.ParseError, zlib.error, struct.error):
        # Parser/IO exception strings may include personal paths or XML text.
        print("Audit failed: check input format, Core definitions, grid dimensions, and a new output path outside Saves.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
