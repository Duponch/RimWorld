import {expect,test} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {deserializeWorld,serializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {validateVisitors} from '../src/sim/visitor-save.ts';
import {visitorGroupDanger} from '../src/sim/visitors.ts';
import {newCookingBill} from '../src/sim/cooking-bills.ts';
import {validateCooking} from '../src/sim/cooking-save.ts';
import {newPowerState} from '../src/sim/power-rules.ts';
import {MACHINING_RESEARCH_COST,SMITHING_RESEARCH_COST} from '../src/sim/research.ts';
import {SCHEMA_VERSION,type MaterialPile,type Structure,type World} from '../src/sim/types.ts';
import {visitorTradeFixture} from './scenarios/visitors.ts';
import {medicalCamp} from './scenarios/health.ts';

function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);
  if(result.status!=='applied')throw Error(JSON.stringify(result));
  return result.world;
}

function historical(world:World):World {
  if(world.raids?.mechanoid)delete world.raids.mechanoid.ranged;
  (world as {schemaVersion:number}).schemaVersion=196;
  // Certify the historical input before number-only migration; current
  // validateWorld deliberately validates against the current schema instead.
  expect(deserializeWorld(JSON.stringify(world))).toEqual({...world,schemaVersion:SCHEMA_VERSION});
  return world;
}

function producedVisitorArchive():World {
  const {world,traderId}=visitorTradeFixture(),trader=world.pawns.find(p=>p.id===traderId)!;
  const owned=world.piles.filter(p=>'pawnId' in p.owner&&p.owner.pawnId===traderId).map(p=>p.id);
  visitorGroupDanger(world,trader,'danger');
  for(let i=0;i<400&&world.pawns.includes(trader);i++)stepWorld(world);
  const departure=world.visitors!.departed.find(d=>d.pawn.id===traderId);
  expect(departure).toBeDefined();expect(world.pawns).not.toContain(trader);
  expect(departure!.items.map(p=>p.id)).toEqual(owned);
  expect(validateWorld(world)).toEqual([]);
  expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  return world;
}

function billWorld(packed:boolean):World {
  const world=medicalCamp(),pawn=world.pawns[0]!;
  world.research={project:null,points:0,
    smithing:{points:SMITHING_RESEARCH_COST,completedAt:world.tick-1},
    machining:{points:MACHINING_RESEARCH_COST,completedAt:world.tick}};
  const table:Structure={id:world.nextId++,kind:'machining-table',x:16,z:16,orientation:0,
    footprint:'standard',material:'steel',power:newPowerState('machining-table'),
    bills:[newCookingBill(world.nextId++,'shred-mechanoid',196)]};
  world.structures.push(table);
  if(packed){
    pawn.x=15;pawn.z=16;pawn.priorities.build=1;
    expect(applyCommand(world,{type:'designate',kind:'uninstall',x:table.x,z:table.z}).ok).toBe(true);
    for(let i=0;i<400&&!world.packed.some(p=>p.building.id===table.id);i++)stepWorld(world);
    expect(world.structures).not.toContain(table);
    expect(world.packed.find(p=>p.building.id===table.id)).toMatchObject({building:table,owner:{type:'ground'}});
  }
  expect(validateWorld(world)).toEqual([]);
  return historical(world);
}

test.each([false,true])('visitor archives reject non-exportable mechanical carcasses in checkpoint=%s and the strict save reader',checkpoint=>{
  const prepared=producedVisitorArchive();
  for(const version of [196,SCHEMA_VERSION])for(const item of ['scyther-corpse','lancer-corpse','pikeman-corpse'] as const)
    for(const ownUndefined of [false,true]){
      const world=structuredClone(prepared);if(version===196)historical(world);
      const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
      const confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(confirmed);
      const good=structuredClone(encoder.encode(world,0,0,checkpoint)),bad=structuredClone(good),forged=structuredClone(world);
      const departure=forged.visitors!.departed[0]!;
      // The archive and human owner are real; only this extra possession is
      // forged. Inventory is forbidden even for a clinically valid carcass.
      const pile:MaterialPile={id:forged.nextId++,kind:'mech-corpse',item,quantity:1,
        owner:{type:'inventory',pawnId:departure.pawn.id}};
      if(ownUndefined)Object.assign(pile,{mechCorpse:undefined});
      departure.items.push(pile);bad.world.nextId=forged.nextId;bad.world.visitors=structuredClone(forged.visitors);
      expect(Object.hasOwn(bad.world.visitors!.departed[0]!.items.at(-1)!,'mechCorpse')).toBe(ownUndefined);
      expect(validateVisitors(forged,version,new Set())).toContain('Invalid exported visitor possession.');
      expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow('Invalid exported visitor possession.');
      if(version===SCHEMA_VERSION)expect(()=>serializeWorld(forged)).toThrow('Invalid exported visitor possession.');
      expect(decoder.adopt(bad)).toMatchObject({status:'resync',reason:'Dossier mécanique archivé invalide.'});
      expect(confirmed).toEqual(frozen);expect(adopt(decoder,good)).toEqual(world);
    }
});

test.each([false,true])('196 refuses own future carcass bill filters atomically in checkpoint=%s, installed and packed',checkpoint=>{
  for(const packed of [false,true]){
    const prepared=billWorld(packed);
    for(const item of ['lancer-corpse','pikeman-corpse'] as const)for(const value of [true,false,undefined]){
      const world=structuredClone(prepared),encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder();
      const confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(confirmed);
      const good=structuredClone(encoder.encode(world,0,0,checkpoint)),bad=structuredClone(good);
      const table=packed?bad.world.packed[0]!.building:bad.world.structures[0]!;
      Object.assign(table.bills![0]!.filters,{[item]:value});
      expect(Object.hasOwn(table.bills![0]!.filters,item)).toBe(true);
      const forged={...structuredClone(world),...bad.world};
      expect(validateCooking(forged,196,new Set())).toContain('Future mechanical carcass bill filter.');
      // JSON omits undefined; the raw snapshot and guard above retain its own
      // property, while true/false also exercise the historical save codec.
      if(value!==undefined)expect(()=>deserializeWorld(JSON.stringify(forged))).toThrow('Future mechanical carcass bill filter.');
      expect(decoder.adopt(bad)).toMatchObject({status:'resync',reason:'Filtre de facture mécanique futur.'});
      expect(confirmed).toEqual(frozen);expect(adopt(decoder,good)).toEqual(world);
    }
  }
});
