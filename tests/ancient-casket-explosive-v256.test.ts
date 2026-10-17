import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health.ts';
import {fixtureBuilding} from './scenarios/deconstruction.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import {validBombWaveShape,bombWaveRadius,validateBombWaves} from '../src/sim/bomb-state.ts';
import {validAncientCasketWickField256} from '../src/sim/ancient-casket-explosive-state-256.ts';
import {planEmptyAncientCasketRemoval256} from '../src/sim/ancient-casket-empty-removal-256.ts';
import {addMaterial,refreshStock} from '../src/sim/materials.ts';
import {ITEM_DEFINITIONS} from '../src/sim/items.ts';
import {groundPile} from '../src/sim/ground-placement.ts';
import {addFilth} from '../src/sim/filth.ts';
import {validatePackedFurnitureRecords} from '../src/sim/furniture-transfer-save.ts';
import {validateBarriers} from '../src/sim/barrier-save.ts';
import type {AncientCasket256} from '../src/sim/ancient-casket-state-256.ts';

/** Prepared fixture on the real health scenario map; no Shrine generation or
 * artificial Ancient roster is claimed. The held human is an existing second
 * original removed once from that map, never a cast World or replacement. */
function prepared(hold=false){
 const w=medicalCamp(hold?2:1);w.structures=[];w.jobs=[];w.piles=[];w.packed=[];delete w.home;delete w.fires;
 const shooter=w.pawns[0]!;Object.assign(shooter,{x:3,z:3,path:[],moveCooldown:0,planCooldown:0,state:'idle'});delete shooter.motion;
 const c:AncientCasket256={id:w.nextId++,kind:'ancient-cryptosleep-casket',x:10,z:10,orientation:0,footprint:'standard',factionId:null,casket:{revision:1,groupId:-1,contentsKnown:!hold,heldAt:w.tick,humans:[],animals:[],items:[]}};
 const original=hold?w.pawns.pop()!:undefined;if(original){original.state='idle';original.path=[];original.moveCooldown=0;delete original.motion;delete original.health;c.casket.humans.push(original);}
 w.structures.push(c);refreshStock(w);return {w,c,shooter,original};
}

test('raw lethal CompExplosive retires the empty original once before Flame, exact three real leavings and no quarter refund',()=>{
 const {w,c,shooter}=prepared(),tick=w.tick,tiles=w.tiles,old=w.destroyed;
 expect(damageStructure(w,c,1,'bullet',w.rng,{core:tick*10,rawAmount:250,instigatorKey:`pawn:${shooter.id}`})).toBe(true);
 expect(w.structures).not.toContain(c);expect(w.tiles).toBe(tiles);expect(w.tick).toBe(tick);
 expect(w.piles.map(p=>[p.item,p.quantity]).sort()).toEqual([['slag-steel-chunk',1],['steel',25],['uranium',3]].sort());
 expect(w.piles.every(p=>p.owner.type==='ground'&&p.forbidden===true)).toBe(true);expect(w.bombWaves).toHaveLength(1);const wave=w.bombWaves![0]!;
 expect(wave.sourceId).toBe(c.id);expect(wave.instigatorKey).toBe(`pawn:${shooter.id}`);expect(bombWaveRadius(wave)).toBe(Math.fround(2.66));expect(wave.shortCircuit).toBeUndefined();expect(wave.animalDeath).toBeUndefined();expect(wave.casketExplosion!.ignoredThingKeys).toEqual(w.piles.map(p=>`pile:${p.id}`).sort());
 expect(w.destroyed?.count).toBe((old?.count??0)+1);expect(w.destroyed?.lost.steel).toBe((old?.lost.steel??0)+155);expect(w.destroyed?.lost.uranium).toBe((old?.lost.uranium??0)+2);
 expect(validateBarriers(w,255)).toContain('Invalid destroyed building ledger.');
 expect(damageStructure(w,c,250,'bullet')).toBe(false);expect(w.bombWaves).toHaveLength(1);expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
 const ordinary=prepared();expect(damageStructure(ordinary.w,ordinary.c,250,'bomb',ordinary.w.rng,{core:ordinary.w.tick*10,rawAmount:100})).toBe(true);expect(ordinary.w.structures).not.toContain(ordinary.c);expect(ordinary.w.bombWaves).toBeUndefined();expect(ordinary.w.piles.map(p=>[p.item,p.quantity]).sort()).toEqual([['slag-steel-chunk',1],['steel',25],['uranium',3]].sort());expect(validateWorld(ordinary.w)).toEqual([]);
});

test('199 damage has no wick; actual twentieth-percent threshold captures one140..150Core deadline, survives RAW and true scheduler without shooters',()=>{
 const {w,c}=prepared();expect(damageStructure(w,c,199,'bullet')).toBe(true);expect(c.casketWick).toBeUndefined();
 expect(damageStructure(w,c,1,'bullet')).toBe(true);const wick=structuredClone(c.casketWick!),rng=w.rng;
 expect(wick.startedAtCore).toBe(w.tick*10);expect(wick.endCore-wick.startedAtCore).toBeGreaterThanOrEqual(140);expect(wick.endCore-wick.startedAtCore).toBeLessThanOrEqual(150);
 const raw=serializeWorld(w),loaded=deserializeWorld(raw);expect(serializeWorld(loaded)).toBe(raw);expect(loaded.rng).toBe(rng);
 while(w.tick*10+10<wick.endCore){stepWorld(w);stepWorld(loaded);expect(w.structures).toContain(c);expect(c.casketWick).toEqual(wick);}
 stepWorld(w);stepWorld(loaded);expect(w.structures).not.toContain(c);expect(w.bombWaves?.find(w=>w.sourceId===c.id)?.startedAtCore).toBe(wick.endCore);expect(serializeWorld(loaded)).toBe(serializeWorld(w));expect(validateWorld(w)).toEqual([]);
});

test('ignore set follows actual absorbed stack IDs, not every same item/cell; real Flame10 reaches another actual Thing',()=>{
 const {w,c}=prepared();w.home=[c.z*w.width+c.x,(c.z+1)*w.width+c.x];
 for(const cell of [{x:10,z:9},{x:9,z:10},{x:11,z:10},{x:9,z:11},{x:11,z:11},{x:10,z:12}])addMaterial(w,'uranium',10,{type:'ground',...cell},'uranium');
 const uranium=w.piles.filter(p=>p.item==='uranium'),third={x:12,z:10};addMaterial(w,'uranium',7,{type:'ground',...third},'uranium');const unrelated=groundPile(w,third)!;
 addMaterial(w,'wood',10,{type:'ground',x:12,z:11},'wood');const wood=groundPile(w,{x:12,z:11})!,before=wood.damage??0;
 expect(damageStructure(w,c,250,'bullet')).toBe(true);const wave=w.bombWaves![0]!,keys=wave.casketExplosion!.ignoredThingKeys;
 expect(uranium.filter(p=>p.quantity===13)).toHaveLength(1);const absorbed=uranium.find(p=>p.quantity===13)!;expect(keys).toContain(`pile:${absorbed.id}`);expect(w.piles.find(p=>p.id===absorbed.id)).toBe(absorbed);expect(keys).not.toContain(`pile:${unrelated.id}`);expect(keys).not.toContain(`pile:${wood.id}`);
 stepWorld(w);expect(wood.damage).toBe(before+10);expect(wave.damagedThingKeys).toContain(`pile:${wood.id}`);expect(wave.damagedThingKeys).not.toContain(`pile:${absorbed.id}`);expect(absorbed.quantity).toBe(13);expect(validateWorld(w)).toEqual([]);
});

test('true Nonlethal PreApply opens the unknown group with original actors/clinical owner before HP; raw lethal cannot bypass DamageUntilDowned',()=>{
 const {w,c,shooter,original}=prepared(true),sibling:AncientCasket256={id:w.nextId++,kind:'ancient-cryptosleep-casket',x:14,z:10,orientation:0,footprint:'standard',factionId:null,casket:{revision:1,groupId:91,contentsKnown:false,heldAt:w.tick,humans:[],animals:[],items:[]}};
 c.casket.groupId=91;w.structures.push(sibling);const item={id:w.nextId++,kind:'gold' as const,item:'gold' as const,quantity:10,owner:{type:'ancient-casket' as const,casketId:sibling.id}};sibling.casket.items.push(item);refreshStock(w);
 const before=serializeWorld(w);expect(damageStructure(w,c,250,'bullet',w.rng,{core:w.tick*10,rawAmount:250,instigatorKey:`pawn:${shooter.id}`})).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(damageStructure(w,c,10,'bullet',w.rng,{core:w.tick*10,rawAmount:10,instigatorKey:`pawn:${shooter.id}`})).toBe(true);
 expect(c.damage).toBe(10);expect(c.casket.humans).toEqual([]);expect(w.pawns.find(p=>p.id===original!.id)).toBe(original);expect(original!.health?.cryptosleepSickness).toBeDefined();expect(original!.health?.tick).toBe(w.tick);expect(w.piles.find(p=>p.id===item.id)).toBe(item);expect(sibling.casket.contentsKnown).toBe(true);expect(item.owner.type).toBe('ground');expect(validateWorld(w)).toEqual([]);
});

test('unknown retired launcher and unsupported nonempty wick are refused without HP/RNG/owner mutation',()=>{
 const {w,c}=prepared(true),before=serializeWorld(w);expect(damageStructure(w,c,1,'bullet',w.rng,{core:w.tick*10,rawAmount:1,instigatorKey:`pawn:${c.id}`})).toBe(false);expect(serializeWorld(w)).toBe(before);
 expect(damageStructure(w,c,200,'fire')).toBe(false);expect(serializeWorld(w)).toBe(before);expect(planEmptyAncientCasketRemoval256(w,c,'kill-finalize').ok).toBe(false);expect(serializeWorld(w)).toBe(before);
});

test('no Near capacity and stale removal witness preserve original source, worker cargo, counters, streams and allocator',()=>{
 const {w,c}=prepared();for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!(x===c.x&&(z===c.z||z===c.z+1))&&!['water','rock'].includes(w.tiles[z*w.width+x]!.terrain))addMaterial(w,'wood',ITEM_DEFINITIONS.wood.stackLimit,{type:'ground',x,z},'wood');refreshStock(w);
 const before=serializeWorld(w);expect(damageStructure(w,c,250,'bullet')).toBe(false);expect(serializeWorld(w)).toBe(before);expect(w.structures).toContain(c);
 const f=prepared(),plan=planEmptyAncientCasketRemoval256(f.w,f.c,'kill-finalize',{core:f.w.tick*10});expect(plan.ok).toBe(true);f.w.home=[0];const changed=serializeWorld(f.w);if(plan.ok)expect(plan.commit()).toBe(false);expect(serializeWorld(f.w)).toBe(changed);
});

test('a split Near product protects only its final actual absorption, never earlier partial receivers',()=>{
 const {w,c}=prepared();w.home=[c.z*w.width+c.x,(c.z+1)*w.width+c.x];const cells=[{x:10,z:9},{x:9,z:10},{x:11,z:10}];
 for(let z=0;z<w.height;z++)for(let x=0;x<w.width;x++)if(!(x===c.x&&(z===c.z||z===c.z+1))&&!['water','rock'].includes(w.tiles[z*w.width+x]!.terrain)){
  const partial=cells.some(c=>c.x===x&&c.z===z);addMaterial(w,partial?'uranium':'wood',partial?74:ITEM_DEFINITIONS.wood.stackLimit,{type:'ground',x,z},partial?'uranium':'wood');
 }
 const receivers=w.piles.filter(p=>p.item==='uranium');expect(receivers).toHaveLength(3);expect(damageStructure(w,c,250,'bullet')).toBe(true);expect(receivers.every(p=>p.quantity===75)).toBe(true);
 const keys=w.bombWaves![0]!.casketExplosion!.ignoredThingKeys;expect(keys).toHaveLength(3);expect(receivers.filter(p=>keys.includes(`pile:${p.id}`))).toHaveLength(1);expect(w.piles.filter(p=>p.item==='uranium')).toHaveLength(3);expect(validateWorld(w)).toEqual([]);
});

test('read-only leaving preflight preserves unrelated real job/escrow identity, stock and all source bytes',()=>{
 const {w,c}=prepared();expect(applyCommand(w,{type:'designate',kind:'wall',x:20,z:20}).ok).toBe(true);expect(addFilth(w,{x:5,z:5},'building-rubble')).toBe(true);const job=w.jobs[0]!,escrow=job.escrow,stock=w.stock,filth=w.filth,items=filth!.items,before=serializeWorld(w);
 const plan=planEmptyAncientCasketRemoval256(w,c,'kill-finalize',{core:w.tick*10});expect(plan.ok).toBe(true);expect(w.jobs[0]).toBe(job);expect(job.escrow).toBe(escrow);expect(w.stock).toBe(stock);expect(w.filth).toBe(filth);expect(w.filth!.items).toBe(items);expect(serializeWorld(w)).toBe(before);
});

test('new wick/wave fields reject255, undefined/accessors, wrong type and forged duplicate source without replacement',()=>{
 const {w,c}=prepared();expect(damageStructure(w,c,200,'bullet')).toBe(true);expect(validAncientCasketWickField256(c,256,w.tick)).toBe(true);expect(validAncientCasketWickField256(c,255,w.tick)).toBe(false);
 expect(validAncientCasketWickField256({...c,casketWick:undefined},256,w.tick)).toBe(false);let reads=0;const bad={...c};Object.defineProperty(bad,'casketWick',{get(){reads++;throw Error('unread');},enumerable:true});expect(validAncientCasketWickField256(bad,256,w.tick)).toBe(false);expect(reads).toBe(0);
 const bed=fixtureBuilding(w,'bed',22,22);w.structures=w.structures.filter(s=>s!==bed);w.packed.push({building:bed,owner:{type:'ground',x:22,z:22}});Object.defineProperty(bed,'casketWick',{value:undefined,enumerable:true,configurable:true});expect(validatePackedFurnitureRecords(w.packed,w,255,new Set())).toContain('Invalid future/extraneous casket wick on packed furniture.');Object.defineProperty(bed,'casketWick',{get(){reads++;throw Error('unread');},enumerable:true,configurable:true});expect(validatePackedFurnitureRecords(w.packed,w,256,new Set())).toContain('Invalid future/extraneous casket wick on packed furniture.');expect(reads).toBe(0);delete (bed as import('../src/sim/types.ts').Structure).casketWick;
 expect(damageStructure(w,c,50,'bullet')).toBe(true);const wave=w.bombWaves![0]!;expect(validBombWaveShape(wave,256)).toBe(true);expect(validBombWaveShape(wave,255)).toBe(false);expect(validBombWaveShape({...wave,casketExplosion:undefined},256)).toBe(false);expect(validBombWaveShape({...wave,casketExplosion:{ignoredThingKeys:[`pawn:${c.id}`]}},256)).toBe(false);
 const duplicate={...structuredClone(wave),id:w.nextId++};w.bombWaves!.push(duplicate);const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toContain('Invalid duplicate casket source/ignored target.');
});

test('MAIN checkpoint/delta observe wick at same confirmed tick and reject malformed prospective state while retaining last applied world',()=>{
 const {w,c}=prepared(),enc=new SnapshotEncoder(),dec=new SnapshotDecoder();expect(dec.adopt(structuredClone(enc.encode(w,0,0))).status).toBe('applied');
 expect(damageStructure(w,c,200,'bullet')).toBe(true);const next=dec.adopt(structuredClone(enc.encode(w,0,0)));expect(next.status,JSON.stringify(next)).toBe('applied');if(next.status!=='applied')throw Error('Actual wick delta refused');expect(next.world.structures.find(s=>s.id===c.id)?.casketWick).toEqual(c.casketWick);
 const prior=JSON.stringify(next.world),checkpoint=structuredClone(enc.encode(w,0,0,true));if(checkpoint.kind!=='checkpoint')throw Error('Expected actual checkpoint');checkpoint.world.structures.find(s=>s.id===c.id)!.casketWick!.endCore++;
 // Force an invalid captured duration, not an unproven rerolled native seed.
 checkpoint.world.structures.find(s=>s.id===c.id)!.casketWick!.endCore=checkpoint.world.structures.find(s=>s.id===c.id)!.casketWick!.startedAtCore+151;
 expect(dec.adopt(checkpoint).status).toBe('resync');expect(JSON.stringify(next.world)).toBe(prior);
});
