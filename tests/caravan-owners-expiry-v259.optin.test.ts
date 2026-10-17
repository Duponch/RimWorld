import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,test} from 'vitest';
import {deserializeCampaign,serializeCampaign,validateWorld} from '../src/sim/index.ts';
import {createMedicalRecord,addResolvedInjury,medicalStatus} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {ROT_DAYS} from '../src/sim/food-preservation.ts';
import {TICKS_PER_DAY,type World} from '../src/sim/types.ts';
import {groupPlayerOwner256} from '../src/sim/group-route-interval-256.ts';
import {actual259} from './helpers/fresh-caravan-owners-v259.ts';
import type {AwayGroup} from '../src/sim/group-capture.ts';

/** PREPARED, NEVER EXECUTED. Opt in only after ROOT acquires a true259 new-game
 * -> geographic planet/map -> actual admission2 departure checkpoint. This
 * file never grafts metadata onto an old map, roster, faction or archive.
 * Required existing possessions: one simple-meal on the last player owner;
 * and berries, pemmican and two separate simple-meal piles on living captives
 * or animals. A finite existing survivor stack can be partitioned explicitly
 * before the initial rot baseline; no food or loading receipt is granted.
 * Initial injury/rot preparation below is explicit, before the test baseline.
 * There is no mocked death, manual terminal row, ownership flip or fake tick.
 */
test.runIf(process.env.ELSEWHERE_RUN_OWNER259_EXPIRY==='1')('actual engine last-owner death settles all food before survivor suspension and terminal retention',()=>{
 const path=process.env.ELSEWHERE_OWNER259_CHECKPOINT,sha=process.env.ELSEWHERE_OWNER259_CHECKPOINT_SHA256;
 if(!path||!sha)throw Error('Exact acquired259 checkpoint path and SHA256 required; no fixture is synthesized');
 const bytes=readFileSync(path,'utf8');expect(createHash('sha256').update(bytes).digest('hex')).toBe(sha);
 const root=deserializeCampaign(bytes);
 if(root.schemaVersion!==259||root.planet?.revision!==3||!('pawns'in root))throw Error('Expected acquired259 geographic campaign with a loaded map');
 const records=root.worldGroups!.groups.filter(r=>r.localMapId===null&&'members'in r.state&&r.state.admission?.revision===2);
 if(records.length!==1)throw Error('Expected one true admission2 away caravan');
 const record=records[0]!,g=record.state as AwayGroup,owners=g.members.filter(groupPlayerOwner256);
 if(owners.length!==1||!g.travel||!g.reorganization||g.reorganization.memberOrigins.some(o=>o.enteredAtAbsCore===undefined)||g.animalOwners?.origins.some(o=>o.enteredAtAbsCore===undefined))throw Error('Actual last-owner/entry receipts missing');
 const captain=owners[0]!,survivors=[...g.members.filter(p=>p!==captain),...g.animalOwners?.members??[]];
 if(!survivors.length||survivors.some(p=>p.state==='dead'||p.health?.death)||!g.animalOwners?.members.length)throw Error('Expected living actual captive/animal survivors');
 const survivorIds=new Set(survivors.map(p=>p.id));
 const held=(p:World['piles'][number],ids:Set<number>)=>p.owner.type==='inventory'&&ids.has(p.owner.pawnId);
 // The actual transfer naturally coalesced its two prepared meal stacks.
 // Declare two initial age conditions by partitioning that finite possession,
 // keeping its holder, all units and mass; this is QA setup, not a played pickup.
 const mealStacks=g.items.filter(p=>held(p,survivorIds)&&p.item==='simple-meal');
 if(mealStacks.length===1){const source=mealStacks[0]!;if(source.quantity<2)throw Error('Finite survivor meal stack cannot supply both conditions');const total=source.quantity,fragment=structuredClone(source);fragment.id=root.nextId++;fragment.quantity=1;source.quantity--;g.items.push(fragment);expect(source.quantity+fragment.quantity).toBe(total);expect(fragment.owner).toEqual(source.owner);}
 const expired=g.items.filter(p=>held(p,survivorIds)&&['berries','pemmican','simple-meal'].includes(p.item));
 const other=expired.filter(p=>p.item==='simple-meal');
 if(other.length<2||!expired.some(p=>p.item==='berries')||!expired.some(p=>p.item==='pemmican'))throw Error('Required actual survivor fruit/pemmican/two-meal possessions absent');
 const fresh=other.pop()!;expired.splice(expired.indexOf(fresh),1);
 const captainMeal=g.items.find(p=>p.owner.type==='inventory'&&p.owner.pawnId===captain.id&&p.item==='simple-meal');
 if(!captainMeal)throw Error('Required actual captain meal absent');expired.push(captainMeal);
 const beforeEffects={...g.reorganization!.inventoryEffects},beforePemmican=g.provisions!.pemmicanSpoiledUnits,beforeBerries=g.travel!.forage.spoiled.berries,units=new Map<string,number>();
 // The existing format represents the ordinary rate1 by absence; explicit1
 // is historically invalid. Keep that strict guard and its literal default.
 for(const pile of expired){const item=pile.item as keyof typeof ROT_DAYS;pile.rot={progress:ROT_DAYS[item]*TICKS_PER_DAY-1,atTick:root.tick};units.set(item,(units.get(item)??0)+pile.quantity);}
 fresh.rot={progress:0,atTick:root.tick};const freshQuantity=fresh.quantity,freshOwner=structuredClone(fresh.owner);
 for(const p of g.members){p.hunger=100;p.medicalCare='none';}
 captain.health??=createMedicalRecord(root.tick);addResolvedInjury(captain.health,'right-hand','cut',6000,()=>.999999);captain.health.bloodLoss=BLOOD_UNIT-1;const status=medicalStatus(captain.health);captain.state=status==='mobile'?'idle':status;
 expect(validateWorld(root)).toEqual([]);const raw=serializeCampaign(root),fork=deserializeCampaign(raw);if(!('pawns'in fork))throw Error('Loaded exact replay map missing');
 const live=actual259(root),replay=actual259(fork),at=root.tick;live.step();replay.step();
 expect(root.tick).toBe(at+1);expect(captain.health.death?.tick).toBe(root.tick);
 expect(root.worldGroups!.groups.some(r=>r===record)).toBe(false);
 const loss=root.worldGroups!.losses.find(l=>l.pawn===captain);expect(loss?.tick).toBe(root.tick);expect(loss!.items).not.toContain(captainMeal);
 for(const pile of expired){expect(root.worldPawns!.owners.some(r=>r.items.includes(pile))).toBe(false);expect(root.worldGroups!.losses.some(l=>l.items.includes(pile))).toBe(false);}
 // The unrelated home stock is not the away owner. Check the exact group
 // effects paid before its terminal transfer, plus original physical losses.
 expect(g.reorganization!.inventoryEffects?.['simple-meal']).toBe((beforeEffects['simple-meal']??0)-(units.get('simple-meal')??0));expect(g.provisions!.pemmicanSpoiledUnits).toBe(beforePemmican+(units.get('pemmican')??0));expect(g.travel!.forage.spoiled.berries).toBe(beforeBerries+(units.get('berries')??0));
 const holder=root.worldPawns!.owners.find(r=>r.items.includes(fresh));expect(holder).toBeDefined();expect(holder!.actor).toBe(survivors.find(p=>p.id===(fresh.owner as {pawnId:number}).pawnId));expect(fresh.quantity).toBe(freshQuantity);expect(fresh.owner).toEqual(freshOwner);expect(fresh.rot?.rate).toBe(0);expect(holder!.heldAtCore259).toBe(root.tick*10);
 for(const original of survivors)expect(root.worldPawns!.owners.filter(r=>r.actor===original)).toHaveLength(1);
 expect(validateWorld(root)).toEqual([]);expect(serializeCampaign(fork)).toBe(serializeCampaign(root));
},30000);
