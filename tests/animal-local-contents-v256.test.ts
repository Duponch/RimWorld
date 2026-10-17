import {test,expect} from 'vitest';
import {registryCamp} from './helpers/world-maps-v255.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {adultAgeTicks} from '../src/sim/animal-life.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {validCorpseShape} from '../src/sim/corpse-save.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {dropAnimalContentsOnDeath256,animalContentsOwner256,animalContentsLocation256,animalContentsMassGrams256,animalCorpseMassWithContents256} from '../src/sim/animal-local-contents-256.ts';
import {planAnimalBodyRetirement256} from '../src/sim/animal-body-retirement-256.ts';
import {damagePile} from '../src/sim/thing-damage.ts';
import {validateWorld,serializeCampaign,deserializeCampaign} from '../src/sim/index.ts';
import {registeredMapPresentation} from '../src/sim/world-map-presentation.ts';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots.ts';
import type {WildAnimal} from '../src/sim/wildlife-state.ts';
/** Prepared current originals, not a claim of natural acquisition/death/carry. */
function prepared(pack=true){const w=registryCamp(),stand=captureStandability(w);let cell:{x:number;z:number}|undefined;for(let z=1;z<w.height-1&&!cell;z++)for(let x=1;x<w.width-1;x++)if(stand({x,z})&&!w.piles.some(p=>p.owner.type==='ground'&&p.owner.x===x&&p.owner.z===z)){cell={x,z};break;}if(!cell)throw Error('Declared standing cell unavailable');
 const a:WildAnimal={id:w.nextId++,species:'muffalo',sex:'female',ageTicks:adultAgeTicks('muffalo'),...cell,food:1,rest:1,state:'dead',path:[],nextDecision:w.tick,domestic:{since:w.tick,care:'herbal',tameness:5,nextDecay:w.tick+6000,productFullness:0}};a.health=createAnimalMedicalRecord256(w,a);a.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(a.health);w.wildlife??={profile:'temperate-hares-v1',rng:1,animals:[],eatenPlants:0,eatenNutrition:0,eatenItems:0};w.wildlife.animals.push(a);
 const item={id:w.nextId++,item:'hay' as const,kind:'food' as const,quantity:2,owner:{type:'inventory' as const,pawnId:a.id},rot:{progress:0,atTick:w.tick}};w.piles.push(item);const packed={building:{id:w.nextId++,kind:'bedroll' as const,...cell,orientation:0 as const,footprint:'standard' as const,material:'cloth' as const,quality:'normal' as const},owner:{type:'inventory' as const,pawnId:a.id}};if(pack)w.packed.push(packed);return {w,a,item,packed};}
function body(){const f=prepared();dropAnimalContentsOnDeath256(f.w,f.a,false);advanceCorpses(f.w);const corpse=f.w.piles.find(p=>p.corpse?.animalId===f.a.id);if(!corpse)throw Error('Actual corpse was not physically placed');return {...f,corpse};}

test('spawned death attempts nearby physical drops once and preserves IDs/paquets; a held death does not drop',()=>{const f=prepared(),next=f.w.nextId;dropAnimalContentsOnDeath256(f.w,f.a,true);expect(f.item.owner.type).toBe('ground');expect(f.packed.owner.type).toBe('ground');expect(f.w.nextId).toBe(next);const held=prepared();dropAnimalContentsOnDeath256(held.w,held.a,false);expect(held.item.owner).toEqual({type:'inventory',pawnId:held.a.id});expect(held.packed.owner).toEqual({type:'inventory',pawnId:held.a.id});});

test('materialized corpse is the real inventory holder and its contents follow a declared carried checkpoint; exact RAW/full/same-tick adoption',()=>{const f=body();expect(f.w.wildlife!.animals).not.toContain(f.a);const owner=animalContentsOwner256(f.w,f.a.id);expect(owner?.kind).toBe('corpse');if(owner?.kind==='corpse')expect(owner.pile).toBe(f.corpse);expect(animalContentsMassGrams256(f.w,f.a.id)).toBe(2528);expect(animalCorpseMassWithContents256(f.w,f.corpse,1000)).toBe(3528);
 const savedOwner=f.corpse.owner;f.corpse.owner={type:'pawn',pawnId:f.w.pawns[0]!.id};expect(animalContentsLocation256(f.w,f.a.id)?.cell).toEqual(f.w.pawns[0]!);f.corpse.owner=savedOwner;
 expect(validateWorld(f.w)).toEqual([]);const raw=serializeCampaign(f.w);expect(serializeCampaign(deserializeCampaign(raw))).toBe(raw);const enc=new SnapshotEncoder(),dec=new SnapshotDecoder(),view=()=>registeredMapPresentation(f.w)!;expect(dec.adopt(enc.encode(view(),0,0)).status).toBe('applied');f.item.quantity=1;const delta=structuredClone(enc.encode(view(),0,0));if(delta.kind!=='delta'||!delta.piles)throw Error('Prepared real pile delta absent');const bad=structuredClone(delta),changed=bad.piles!.upserted.find(p=>p.id===f.item.id)!;changed.owner={type:'inventory',pawnId:f.packed.building.id};expect(dec.adopt(bad).status).toBe('resync');expect(dec.adopt(delta).status).toBe('applied');expect(validCorpseShape(f.corpse as unknown as Record<string,unknown>,255)).toBe(true);expect(animalContentsOwner256({...f.w,schemaVersion:255},f.a.id)).toBeUndefined();expect(validateWorld({...f.w,schemaVersion:255})).not.toEqual([]);
});

test('true holder destruction retires body, inventory and original packed bed exactly once through existing ledgers',()=>{const f=body(),next=f.w.nextId,plan=planAnimalBodyRetirement256(f.w,f.a.id,true)!;expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);expect(f.w.piles).not.toContain(f.item);expect(f.w.piles).not.toContain(f.corpse);expect(f.w.packed).not.toContain(f.packed);expect(f.w.destroyed?.items?.hay).toBe(2);expect(f.w.destroyed?.items?.[f.corpse.item]).toBe(1);expect(f.w.destroyed?.lost.cloth).toBe(40);expect(f.w.nextId).toBe(next);});

test('a changed actual inventory refuses the prepared destruction before ledger or owner mutation',()=>{const f=body(),plan=planAnimalBodyRetirement256(f.w,f.a.id,true)!;f.item.quantity=1;const before=JSON.stringify(f.w);expect(plan.commit()).toBe(false);expect(JSON.stringify(f.w)).toBe(before);});

test('fire retirement counts the same real contents in FireLedger and packed materials once',()=>{const f=body(),plan=planAnimalBodyRetirement256(f.w,f.a.id,true,'fire')!;expect(plan.commit()).toBe(true);expect(f.w.fires!.ledger.items.hay).toBe(2);expect(f.w.fires!.ledger.items[f.corpse.item]).toBe(1);expect(f.w.fires!.ledger.structures).toBe(1);expect(f.w.destroyed?.lost.cloth).toBe(40);});

test('actual damagePile corpse destruction composes the shared holder transaction',()=>{const f=body();expect(damagePile(f.w,f.corpse,100,'bullet')).toBe(true);expect(animalContentsOwner256(f.w,f.a.id)).toBeUndefined();expect(f.w.piles.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===f.a.id)).toBe(false);expect(f.w.packed.some(p=>p.owner.type==='inventory'&&p.owner.pawnId===f.a.id)).toBe(false);});


test('a counterfeit corpse accessor is not read to confer inventory ownership',()=>{const f=body(),id=f.w.nextId++,bad={id,item:'muffalo-corpse',kind:'corpse',quantity:1,owner:{type:'ground',x:1,z:1}};let reads=0;Object.defineProperty(bad,'corpse',{enumerable:true,get(){reads++;return f.corpse.corpse;}});f.w.piles.push(bad as unknown as typeof f.corpse);expect(animalContentsOwner256(f.w,id)).toBeUndefined();expect(reads).toBe(0);});
