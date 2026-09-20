"""Synthetic, non-proprietary contract checks for the read-only save auditor."""

import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import struct
import shutil
import unittest
import uuid
import xml.etree.ElementTree as ET
import zlib


SPEC = importlib.util.spec_from_file_location(
    "reference_audit", Path(__file__).resolve().parents[1] / "audit-reference-map.py")
AUDIT = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(AUDIT)


def encoded(values, fmt="H"):
    raw = struct.pack("<" + str(len(values)) + fmt, *values)
    compress = zlib.compressobj(wbits=-15)
    return base64.b64encode(compress.compress(raw) + compress.flush()).decode()


def fixture():
    root = ET.fromstring("""<savegame><meta><gameVersion>1.6.4871 rev591</gameVersion>
      <modIds><li>ludeon.rimworld</li></modIds></meta><game>
      <tickManager><ticksGame>283</ticksGame></tickManager>
      <storyteller><def>Cassandra</def><difficulty>Medium</difficulty></storyteller>
      <scenario><name>Private scenario name</name><parts><li Class="ScenPart_Test"/></parts></scenario>
      <maps><li><mapInfo><size>(2, 1, 2)</size><parent>WorldObject_7</parent></mapInfo>
      <terrainGrid/><roofGrid/><things>
      <thing Class="Plant"><def>Bryolux</def><growth>1</growth></thing>
      <thing Class="Plant"><def>Plant_Berry</def><growth>0.7</growth></thing>
      <thing Class="Plant"><def>Plant_Berry</def></thing>
      <thing Class="Pawn"><def>TestAnimal</def><name><nick>Private pawn name</nick></name></thing>
      </things></li></maps><world><grid><layers><values><li><layerId>0</layerId></li></values></layers></grid>
      <worldObjects><worldObjects><li><ID>7</ID><tile>1,0</tile></li></worldObjects></worldObjects>
      </world></game></savegame>""")
    node = root.find("game/maps/li")
    ET.SubElement(node.find("terrainGrid"), "topGridDeflate").text = encoded([0, 0, 123, 123])
    ET.SubElement(node.find("roofGrid"), "roofsDeflate").text = encoded([0, 0, 0, 0])
    ET.SubElement(node, "compressedThingMapDeflate").text = encoded([0, 0, 27293, 65000])
    layer = root.find("game/world/grid/layers/values/li")
    ET.SubElement(layer, "tileBiomeDeflate").text = encoded([0, 0])
    ET.SubElement(layer, "tileHillinessDeflate").text = encoded([1, 3], "B")
    return root


class AuditTests(unittest.TestCase):
    def setUp(self):
        workspace_tmp = Path(__file__).resolve().parents[2] / "tmp"
        workspace_tmp.mkdir(exist_ok=True)
        # Python 3.13's mode-0700 TemporaryDirectory denies the Windows sandbox
        # identity access. Keep inherited workspace permissions for these files.
        self.root = workspace_tmp / ("reference-audit-test-" + uuid.uuid4().hex)
        self.root.mkdir()
        self.assertTrue(self.root.resolve().is_relative_to(workspace_tmp.resolve()))
        self.addCleanup(shutil.rmtree, self.root)
        self.save_dir = self.root / "Saves"
        self.save_dir.mkdir()
        self.save = self.save_dir / "private-save.rws"
        self.save.write_bytes(ET.tostring(fixture()))

    def test_read_only_anonymous_counts_and_unknowns(self):
        before = hashlib.sha256(self.save.read_bytes()).hexdigest()
        report = AUDIT.audit(self.save, AUDIT.Definitions())
        self.assertEqual(before, hashlib.sha256(self.save.read_bytes()).hexdigest())
        text = json.dumps(report)
        for secret in [str(self.save), "private-save", "Private pawn", "Private scenario"]:
            self.assertNotIn(secret, text)
        map_report = report["maps"][0]
        self.assertEqual(map_report["area"], 4)
        self.assertEqual(map_report["site"]["hilliness"], "large-hills")
        self.assertEqual(map_report["site"]["world_rivers"], "unknown")
        self.assertEqual(map_report["direct_counts"]["plant_total"], 3)
        self.assertEqual(map_report["direct_counts"]["berry_growth"]["unknown"], 1)
        self.assertEqual(map_report["terrain"]["unresolved_hashes"]["123"]["cells"], 2)
        self.assertIsNone(report["scenario"]["def"])

    def test_core_definitions_inheritance_and_versioned_collision(self):
        defs = self.root / "Defs"
        defs.mkdir()
        (defs / "synthetic.xml").write_text("""<Defs>
          <ThingDef Name="AnimalThingBase" Abstract="True"/>
          <ThingDef ParentName="AnimalThingBase"><defName>TestAnimal</defName></ThingDef>
          <ThingDef><defName>MineableSteel</defName></ThingDef>
          <ThingDef MayRequire="unavailable"><defName>NeverActive</defName></ThingDef>
          </Defs>""", encoding="utf-8")
        definitions = AUDIT.Definitions(defs)
        self.assertNotIn("NeverActive", definitions.names["ThingDef"])
        self.assertEqual(AUDIT.stable_short_hash("MineableSteel"), 27292)
        self.assertEqual(definitions.candidates("ThingDef", 27293, True), {"MineableSteel"})
        self.assertEqual(definitions.candidates("ThingDef", 27293, False), set())
        self.assertEqual(len(definitions.candidates("ThingDef", 27292, False)), 2)
        report = AUDIT.audit(self.save, definitions)
        self.assertEqual(report["maps"][0]["direct_counts"]["spawned_animals_by_def"], {"TestAnimal": 1})
        self.assertEqual(report["maps"][0]["candidate_counts"]["ore_cells_by_def"], {"MineableSteel": 1})

    def test_does_not_use_starting_tile_for_unresolved_map_parent(self):
        root = fixture()
        root.find("game/maps/li/mapInfo/parent").text = "WorldObject_999"
        context = AUDIT.tile_context(root, root.find("game/maps/li"), AUDIT.Definitions(), False)
        self.assertEqual(context["status"], "unknown")

    def test_rejects_bad_or_concatenated_grid(self):
        root = fixture()
        node = root.find("game/maps/li/terrainGrid")
        node.find("topGridDeflate").text = encoded([1])
        with self.assertRaises(ValueError):
            AUDIT.grid(node, "topGridDeflate", expected=4)
        first = base64.b64decode(encoded([1]))
        node.find("topGridDeflate").text = base64.b64encode(first + first).decode()
        with self.assertRaises(ValueError):
            AUDIT.grid(node, "topGridDeflate")

    def test_no_output_in_save_tree_or_existing_file(self):
        for target in [self.save, self.save_dir / "report.json", self.save_dir / "nested" / "report.json"]:
            with self.assertRaises(ValueError):
                AUDIT.checked_output(self.save, target)
        existing = self.root / "existing.json"
        existing.write_text("keep", encoding="utf-8")
        with self.assertRaises(ValueError):
            AUDIT.checked_output(self.save, existing)
        self.assertEqual(existing.read_text(encoding="utf-8"), "keep")
        self.assertEqual(AUDIT.checked_output(self.save, self.root / "new.json"), self.root / "new.json")

    def test_cli_only_creates_new_report(self):
        target = self.root / "report.json"
        self.assertEqual(AUDIT.main([str(self.save), "--output", str(target)]), 0)
        self.assertEqual(json.loads(target.read_text(encoding="utf-8"))["elapsed_ticks"], 283)

    def test_rejects_dtd_and_invalid_map_size(self):
        with self.assertRaises(ValueError):
            AUDIT.parse_xml(b'<!DOCTYPE savegame [<!ENTITY x "secret">]><savegame/>')
        root = fixture()
        root.find("game/maps/li/mapInfo/size").text = "(0, 1, 250)"
        self.save.write_bytes(ET.tostring(root))
        with self.assertRaises(ValueError):
            AUDIT.audit(self.save, AUDIT.Definitions())


if __name__ == "__main__":
    unittest.main()
