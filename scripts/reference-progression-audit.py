#!/usr/bin/env python3
"""Read local Core saves and publish only anonymous progression aggregates.

python scripts/reference-progression-audit.py --saves PATH --defs-root CORE/Defs \
    --output artifacts/core-progression-observed.json

No game launch or writes to saves/Defs. File names, timestamps, seeds, positions,
world/faction/pawn names and pawn IDs never enter the output. A file-order tick
reversal starts a new observation segment; it does not establish a branch tree.
Research completion uses explicit current Def costs as a labeled comparator,
not proof that an older save used the same research costs.
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


DAY = 60_000
TARGET_DAYS = [5, 10, 20, 30, 60, 100, 210]
DEF_TOKEN = re.compile(r"[A-Za-z_][A-Za-z0-9_.-]{0,159}\Z")
FOOD_PLANTS = {"Rice", "RawPotatoes", "RawCorn", "RawBerries", "RawAgave"}


def parse_xml(data):
    # Same boundary as audit-reference-map.py: no save requires a DTD/entity.
    if b"<!DOCTYPE" in data.upper() or b"<!ENTITY" in data.upper():
        raise ValueError("DTD/entity declarations are not supported")
    return ET.fromstring(data)


def token(value):
    return value if value and DEF_TOKEN.fullmatch(value) else "unknown"


def number(value, default=0):
    return float(value) if value is not None else default


def digest(data):
    return hashlib.sha256(data).hexdigest()


def ordered(counter):
    return dict(sorted(counter.items()))


def save_header(path):
    # Reuses the partial-header approach from the earlier local observation
    # audit. Do not parse/decode every late-game map merely to group the worlds.
    text = ""
    with path.open(encoding="utf-8-sig") as source:
        while True:
            chunk = source.read(65_536)
            if not chunk:
                raise ValueError("Save lacks world info")
            text += chunk
            world = text.find("<world>")
            end = text.find("</info>", world) if world >= 0 else -1
            if end >= 0:
                break
    root = parse_xml((text[:end + 7] + "</world></game></savegame>").encode())
    game = root.find("game")
    identity = "|".join(game.findtext(p, "") for p in [
        "world/info/seedString", "world/info/persistentRandomValue",
        "info/startingTile", "tickManager/gameStartAbsTick"])
    return {"path": path, "group": digest(identity.encode()),
            "tick": int(game.findtext("tickManager/ticksGame", "0")),
            "version": root.findtext("meta/gameVersion"),
            "mods": [e.text for e in root.findall("meta/modIds/li")]}


def research_definitions(folder):
    nodes, parents = {}, {}
    sha = hashlib.sha256()
    for path in sorted(folder.rglob("*.xml")):
        raw = path.read_bytes()
        root = parse_xml(raw)
        entries = [e for e in root if e.tag == "ResearchProjectDef"]
        if not entries:
            continue
        sha.update(path.relative_to(folder).as_posix().encode() + b"\0")
        sha.update(hashlib.sha256(raw).digest())
        for node in entries:
            if node.get("MayRequire") or node.get("MayRequireAnyOf"):
                continue
            if node.get("Name"):
                parents[node.get("Name")] = node
            if node.findtext("defName"):
                nodes[token(node.findtext("defName"))] = node
    costs = {}
    for name, node in nodes.items():
        seen = set()
        while node is not None and id(node) not in seen:
            seen.add(id(node))
            value = node.findtext("baseCost")
            if value is not None:
                costs[name] = float(value)
                break
            node = parents.get(node.get("ParentName"))
    version_file = folder.parents[2] / "Version.txt"
    version = version_file.read_text(encoding="utf-8-sig").strip() if version_file.exists() else "unspecified"
    return costs, {"version": version, "researchFilesSha256": sha.hexdigest(),
                   "projectsWithResolvedCost": len(costs)}


def food_group(name):
    if name.startswith("Meal"):
        return "prepared_meals"
    if name in FOOD_PLANTS:
        return "raw_plant_units"
    if name.startswith("Meat_"):
        return "meat_units"
    if name.startswith("Egg") and name != "EggBox":
        return "egg_units"
    return {"Milk": "milk_units", "Hay": "hay_units", "Kibble": "kibble_units",
            "Pemmican": "pemmican_units"}.get(name)


def foods(things):
    by_def, groups = Counter(), Counter()
    for thing in things:
        name = token(thing.findtext("def"))
        group = food_group(name)
        if group:
            quantity = int(thing.findtext("stackCount", "1"))
            by_def[name] += quantity
            groups[group] += quantity
    return {"byDef": ordered(by_def), "unitsByGroup": ordered(groups)}


def held_food(pawns):
    # Restrict recursion to the explicit inventory/carry holders, not recipes,
    # need targets, histories or references to objects elsewhere.
    things = []
    for pawn in pawns:
        for path in ["inventory/innerContainer", "carryTracker/innerContainer"]:
            holder = pawn.find(path)
            if holder is not None:
                things.extend(e for e in holder.iter() if e.find("def") is not None)
    return foods(things)


def curve_tail(game, name):
    for node in game.findall("history/autoRecorderGroups/li/recorders/li"):
        if node.findtext("def") != name:
            continue
        compressed = node.findtext("recordsDeflate")
        data = base64.b64decode(compressed or node.findtext("records", ""))
        if compressed:
            data = zlib.decompress(data, -15)
        if len(data) % 4:
            raise ValueError("Invalid history float array")
        values = struct.unpack("<" + "f" * (len(data) // 4), data)
        return {"samples": len(values), "last": values[-1] if values else None}
    return None


def observe(header, ordinal, costs):
    raw = header["path"].read_bytes()
    game = parse_xml(raw).find("game")
    faction = next("Faction_" + e.findtext("loadID") for e in
                   game.findall("world/factionManager/allFactions/li")
                   if e.findtext("def") == "PlayerColony")
    things = game.findall("maps/li/things/thing")
    own = [t for t in things if t.findtext("faction") == faction]
    pawns = [t for t in own if t.find("ageTracker") is not None]
    buildings = Counter(token(t.findtext("def")) for t in own if t.find("ageTracker") is None
                        and not t.findtext("def", "").startswith(("Blueprint_", "Frame_")))
    planned = Counter(token(t.findtext("def")) for t in own
                      if t.findtext("def", "").startswith(("Blueprint_", "Frame_")))
    animals = Counter(token(t.findtext("def")) for t in pawns if t.findtext("def") != "Human")
    # Caravan ThingOwner lists contain Thing_ references; resolve those privately
    # against pawn IDs, without counting every former player world-pawn alive.
    pawn_nodes = {e.findtext("id"): e for e in game.iter()
                  if e.find("ageTracker") is not None and e.find("id") is not None}
    caravan_pawns, missing_refs = {}, 0
    caravans = [o for o in game.findall("world/worldObjects/worldObjects/li")
                if o.get("Class") == "Caravan" and o.findtext("faction") == faction]
    for caravan in caravans:
        for ref in caravan.findall("pawns/innerList/li") + caravan.findall("pawns/li"):
            pawn = pawn_nodes.get((ref.text or "").removeprefix("Thing_"))
            if pawn is None:
                missing_refs += 1
            else:
                caravan_pawns[ref.text] = pawn

    zone_cells, active_cells, paused_cells = defaultdict(set), defaultdict(set), defaultdict(set)
    sown, growth = Counter(), defaultdict(list)
    basin_plants = Counter()
    for map_index, node in enumerate(game.findall("maps/li")):
        for zone in node.findall("zoneManager/allZones/li"):
            if zone.get("Class") != "Zone_Growing":
                continue
            name = token(zone.findtext("plantDefToGrow"))
            cells = {(map_index, c.text) for c in zone.findall("cells/li")}
            zone_cells[name].update(cells)
            (paused_cells if zone.findtext("allowSow") == "False" else active_cells)[name].update(cells)
        for t in node.findall("things/thing"):
            name = token(t.findtext("def"))
            if name.startswith("Plant_") and t.findtext("sown") == "True":
                sown[name] += 1
                growth[name].append(number(t.findtext("growth")))
            if name == "HydroponicsBasin" and t.findtext("faction") == faction:
                basin_plants[token(t.findtext("plantDefToGrow"))] += 1

    points = {token(k.text): number(v.text) for k, v in zip(
        game.findall("researchManager/progress/keys/li"), game.findall("researchManager/progress/values/li"))
        if number(v.text) > 0}
    completed = sorted(k for k, v in points.items() if k in costs and v >= costs[k])
    bills = []
    for t in own:
        for bill in t.findall("billStack/bills/li"):
            recipe = token(bill.findtext("recipe"))
            if recipe != "unknown":
                bills.append({"workshop": token(t.findtext("def")), "recipe": recipe,
                              "repeatMode": token(bill.findtext("repeatMode")),
                              "targetCount": number(bill.findtext("targetCount"), None),
                              "repeatCount": number(bill.findtext("repeatCount"), None),
                              "suspended": bill.findtext("suspended") == "True"})
    return {"sample": f"B{ordinal:03}", "sha256": digest(raw), "ticks": header["tick"],
            "elapsedDays": round(header["tick"] / DAY, 4), "version": header["version"],
            "storyteller": token(game.findtext("storyteller/def")),
            "difficulty": token(game.findtext("storyteller/difficulty")), "mods": header["mods"],
            "tutorialEndTick": int(game.findtext("tutor/tutorialState/endTick", "0")),
            "maps": len(game.findall("maps/li")),
            "population": {"playerHumansOnMaps": sum(p.findtext("def") == "Human" for p in pawns),
                           "playerAnimalsOnMaps": sum(animals.values()), "animalsByDef": ordered(animals),
                           "playerCaravans": len(caravans),
                           "playerHumansInCaravans": sum(p.findtext("def") == "Human" and p.findtext("faction") == faction for p in caravan_pawns.values()),
                           "unresolvedCaravanReferences": missing_refs,
                           "lastFreeColonistsCurve": curve_tail(game, "FreeColonists")},
            "playerBuildingsOnMaps": ordered(buildings), "plansAndFrames": ordered(planned),
            "growing": {"designatedCellsByCrop": {k: len(v) for k, v in sorted(zone_cells.items())},
                        "sowingEnabledCellsByCrop": {k: len(v) for k, v in sorted(active_cells.items())},
                        "sowingDisabledCellsByCrop": {k: len(v) for k, v in sorted(paused_cells.items())},
                        "sownPlantsPresentByDef": ordered(sown),
                        "sownPlantsGrowth": {k: {"count": len(v), "mean": round(sum(v) / len(v), 4), "fullyGrown": sum(x >= 1 for x in v)} for k, v in sorted(growth.items())},
                        "hydroponicsBasinsBySelectedCrop": ordered(basin_plants)},
            "food": {"directMapStacks": foods(things), "heldByPlayerMapPawns": held_food(pawns),
                     "heldByPlayerCaravanPawns": held_food(caravan_pawns.values())},
            "coolerThermostats": sorted(number(t.findtext("targetTemperature"), None) for t in own if t.findtext("def") == "Cooler" and t.findtext("targetTemperature") is not None),
            "productionBills": bills,
            "research": {"current": token(game.findtext("researchManager/currentProj")),
                         "positivePoints": ordered(points), "atOrAboveCurrentDefCost": completed}}


def summarize(rows):
    reversals, segments, prior = [], [], None
    for row in rows:
        if prior is None or row["ticks"] < prior["ticks"]:
            segments.append({"segment": f"B{len(segments) + 1}", "samples": []})
            if prior:
                reversals.append({"from": prior["sample"], "to": row["sample"],
                                  "fromDay": prior["elapsedDays"], "toDay": row["elapsedDays"]})
        row["segment"] = segments[-1]["segment"]
        segments[-1]["samples"].append(row["sample"])
        prior = row
    milestones = []
    for target in TARGET_DAYS:
        nearest = min(rows, key=lambda row: abs(row["ticks"] - target * DAY))
        lower = max((r for r in rows if r["ticks"] <= target * DAY), key=lambda r: r["ticks"], default=None)
        upper = min((r for r in rows if r["ticks"] >= target * DAY), key=lambda r: r["ticks"], default=None)
        milestones.append({"requestedDay": target, "nearestSample": nearest["sample"],
                           "actualDay": nearest["elapsedDays"], "lowerSample": lower["sample"] if lower else None,
                           "upperSample": upper["sample"] if upper else None})
    first = {}
    # The first sighting is local to one monotonic segment. A non-presence before
    # it only bounds these retained snapshots, not every construction/destruction.
    for segment in segments:
        first[segment["segment"]] = {}
        previous = None
        for row in (r for r in rows if r["segment"] == segment["segment"]):
            for name in row["playerBuildingsOnMaps"]:
                if name not in first[segment["segment"]]:
                    first[segment["segment"]][name] = {"sample": row["sample"], "observedDay": row["elapsedDays"],
                        "previousRetainedSample": previous["sample"] if previous else None,
                        "previousRetainedDay": previous["elapsedDays"] if previous else None}
            previous = row
    return segments, reversals, milestones, first


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--saves", required=True, type=Path)
    parser.add_argument("--defs-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    files = sorted(args.saves.glob("*.rws"), key=lambda path: (path.stat().st_mtime_ns, path.name))
    headers = [save_header(path) for path in files]
    groups = defaultdict(list)
    for header in headers:
        if header["mods"] == ["ludeon.rimworld"]:
            groups[header["group"]].append(header)
    if not groups:
        raise ValueError("No Core-only save group found")
    selected = max(groups.values(), key=len)
    costs, definition_meta = research_definitions(args.defs_root)
    rows = []
    for ordinal, header in enumerate(selected, 1):
        rows.append(observe(header, ordinal, costs))
        if ordinal % 10 == 0 or ordinal == len(selected):
            print(f"Read-only aggregation: {ordinal}/{len(selected)} states", file=sys.stderr)
    segments, reversals, milestones, first = summarize(rows)
    report = {"format": 1, "protocol": "Largest Core-only world group, ordered by file modification time; segment split at each backward game tick. One observed colony, not independent trials.",
              "inputFileCount": len(files), "selectedStates": len(rows), "coreWorldGroups": len(groups),
              "definitionsComparator": definition_meta,
              "scope": {"food": "Separate direct-map stacks and explicit inventory/carry holders of player map/caravan pawns. Not a global ledger; pods/other holders, imports, losses and consumption are not reconstructed.",
                        "crops": "Designated zones, sowing enabled flags and actually present sown plants are separate. Selection changes do not replace existing plants; field shape and soil quality are not inferred.",
                        "buildings": "Player-faction, directly on maps, excluding blueprints/frames. Presence and cooler thermostat do not prove production, electricity or freezing.",
                        "research": "Saved positive points plus comparison with explicitly versioned current Core Def costs; historical completion dates/cost equivalence are not certified.",
                        "history": "First presence is only a retained-state observation. Modification order can reflect copies/reloads; segments are not a reconstructed lineage. No averages across players."},
              "segments": segments, "backwardTickTransitions": reversals, "milestones": milestones,
              "firstBuildingPresenceBySegment": first, "states": rows}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"selectedStates": len(rows), "segments": len(segments), "milestones": milestones}, ensure_ascii=True))


if __name__ == "__main__":
    main()
