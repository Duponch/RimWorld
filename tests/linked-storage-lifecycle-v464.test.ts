import {expect,test} from 'vitest';
import {medicalCamp,controlledInjury} from './scenarios/health.ts';
import {animalHaulingCamp459} from './scenarios/animal-hauling-v459.ts';
import {registryCamp,preparedMap} from './helpers/world-maps-v255.ts';
import {newShelfStorage} from '../src/sim/shelf-storage.ts';
import {prepareLinkedStorageCommand286} from '../src/sim/linked-storage-plan-286.ts';
import {validLinkedStorageWorld286} from '../src/sim/linked-storage-save-286.ts';
import {registeredMap,registeredMapId,registeredCampaign,flushRegisteredMap} from '../src/sim/world-map-context.ts';
import {applyCommand} from '../src/sim/engine.ts';
import {startJobOrder} from '../src/sim/player-orders.ts';
import {advanceFurniture} from '../src/sim/furniture-transfer.ts';
import {releaseWork} from '../src/sim/work-release.ts';
import {COMPLEX_FURNITURE_RESEARCH_COST} from '../src/sim/research.ts';
import {captureStandability} from '../src/sim/furniture-travel.ts';
import {footprintContains} from '../src/sim/definitions.ts';
import {finishDeconstruction} from '../src/sim/deconstruction.ts';
import {damageStructure} from '../src/sim/thing-damage.ts';
import {structureMaxHp} from '../src/sim/thing-damage-rules.ts';
import {advanceHumanCorpses,destroyHumanCorpse} from '../src/sim/human-corpses.ts';
import {createAnimalMedicalRecord256} from '../src/sim/animal-clinical-age-v256.ts';
import {reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {advanceCorpses} from '../src/sim/corpses.ts';
import {planAnimalBodyRetirement256} from '../src/sim/animal-body-retirement-256.ts';
import type {PackedFurniture} from '../src/sim/furniture-rules.ts';
import type {Job,Pawn,Structure,World} from '../src/sim/types.ts';

/** Declared original shelves/initial preferences and completed furniture
 * prerequisite, not paid construction or a played research completion.
 * The actual commands/drivers below perform packing, installation or removal.
 * Driver work is advanced at a stationary interaction frontier (no journey or
 * elapsed engine campaign is claimed by these small transaction tests). */
function pair(w=medicalCamp(2)){
 w.research??={project:null,points:0};w.research.complexFurniture={points:COMPLEX_FURNITURE_RESEARCH_COST,completedAt:0};
 const add=(x:number):Structure=>{const s:Structure={id:w.nextId++,kind:'small-shelf',x,z:10,orientation:0,footprint:'standard',material:'wood',shelf:newShelfStorage([w.nextId++],286)};w.structures.push(s);return s;};
 const a=add(10),b=add(16);a.shelf!.settings.priority=5;b.shelf!.settings.priority=1;flushRegisteredMap(w);
 const plan=prepareLinkedStorageCommand286(w,{type:'shelf-link',structureIds:[a.id,b.id]});if(!plan.ok)throw Error(plan.reason);expect(plan.commit()).toBe(true);
 return {w,a,b,groupId:a.shelf!.linked286!.groupId};
}
function admit(w:World,job:Job,p:Pawn){startJobOrder(p,job,[]);}
function finishFurniture(w:World,p:Pawn,job:Job){
 admit(w,job,p);
 for(let i=0;i<20&&w.jobs.includes(job);i++)advanceFurniture(w,p,job,()=>{throw Error('Prepared adjacent frontier must not require a walk');},()=>{throw Error('Prepared furniture was refused by its actual guard');});
 expect(w.jobs).not.toContain(job);expect(releaseWork(w,p)).toBe(true);flushRegisteredMap(w);
}
function uninstall(w:World,s:Structure,p=w.pawns[0]!):PackedFurniture{
 Object.assign(p,{x:s.x-1,z:s.z,motion:null,moveCooldown:0,path:[]});
 expect(applyCommand(w,{type:'designate',kind:'uninstall',targetId:s.id,x:s.x,z:s.z}).ok).toBe(true);
 const job=w.jobs.find(j=>j.kind==='uninstall'&&j.furniture?.structureId===s.id);if(!job)throw Error('Actual uninstall descriptor missing');
 finishFurniture(w,p,job);const pack=w.packed.find(p=>p.building===s);if(!pack)throw Error('Same original was not packed');return pack;
}
function installBesideGroundPack(w:World,pack:PackedFurniture,p=w.pawns[0]!){
 if(pack.owner.type!=='ground')throw Error('Prepared real ground owner required');
 const x=pack.owner.x-1,z=pack.owner.z+1;
 Object.assign(p,{x,z:z-1,motion:null,moveCooldown:0,path:[]});
 const result=applyCommand(w,{type:'install',structureId:pack.building.id,x,z,orientation:0});expect(result.ok,result.reason??JSON.stringify(result)).toBe(true);
 const job=w.jobs.find(j=>j.kind==='install'&&j.furniture?.structureId===pack.building.id);if(!job)throw Error('Actual install descriptor missing');
 finishFurniture(w,p,job);return {x,z};
}
function dissolved(f:ReturnType<typeof pair>){
 const registry=registeredCampaign(f.w).linkedStorage286!;expect(registry.groups).toEqual([]);expect(registry.nextId).toBe(2);
 expect(f.b.shelf!.linked286).toBeUndefined();expect(f.b.shelf!.settings.priority).toBe(5);
 expect(validLinkedStorageWorld286(f.w)).toBe(true);
}

test('actual advanceFurniture minification and same-map reinstall keep the same link, private policy and durable cells',()=>{
 const f=pair(),cells=[...f.a.shelf!.cells],privatePolicy=f.a.shelf!.linked286!.independent,registry=f.w.linkedStorage286;
 const pack=uninstall(f.w,f.a);expect(pack.building).toBe(f.a);expect(f.a.shelf!.linked286!.groupId).toBe(f.groupId);expect(f.w.linkedStorage286).toBe(registry);expect(validLinkedStorageWorld286(f.w)).toBe(true);
 const position=installBesideGroundPack(f.w,pack);expect(f.w.packed).not.toContain(pack);expect(f.w.structures).toContain(f.a);expect(f.a).toMatchObject(position);
 expect(f.a.shelf!.cells).toEqual(cells);expect(f.a.shelf!.linked286!.independent).toBe(privatePolicy);expect(f.a.shelf!.linked286!.groupId).toBe(f.groupId);expect(f.w.linkedStorage286).toBe(registry);expect(validLinkedStorageWorld286(f.w)).toBe(true);
});

test('a real registered second map keeps the link while packed, then actual installation elsewhere detaches and dissolves the origin pair',()=>{
 const root=registryCamp(),source=registeredMap(root,root.worldMaps!.rootMapId!)!,f=pair(source),pack=uninstall(source,f.a),originId=registeredMapId(source)!;
 const destination=preparedMap(root,52,'legacy-site',true),destinationId=registeredMapId(destination)!;
 // Declared initial freight transfer of this very original between the two
 // admitted real maps. No caravan voyage or played map entry is claimed.
 const stand=captureStandability(destination),free=(c:{x:number;z:number})=>stand(c)&&!destination.resources.some(r=>r.x===c.x&&r.z===c.z)&&!destination.structures.some(s=>footprintContains(s,c))&&!destination.jobs.some(j=>footprintContains(j,c))&&!destination.piles.some(p=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z)&&!destination.packed.some(p=>p.owner.type==='ground'&&p.owner.x===c.x&&p.owner.z===c.z)&&!destination.stockpiles.some(p=>p.x===c.x&&p.z===c.z)&&!destination.growingZones.some(g=>g.cells.includes(c.z*destination.width+c.x));
 let cell:{x:number;z:number}|undefined;for(let z=1;z<destination.height-1&&!cell;z++)for(let x=2;x<destination.width-1;x++)if(free({x,z})&&free({x:x-1,z})&&free({x:x-1,z:z+1})){cell={x,z};break;}
 if(!cell)throw Error('Prepared real destination has no unoccupied interaction frontier');
 source.packed=source.packed.filter(p=>p!==pack);destination.packed.push(pack);pack.owner={type:'ground',...cell};
 flushRegisteredMap(source);flushRegisteredMap(destination);
 expect(originId).not.toBe(destinationId);expect(pack.building.shelf!.linked286!.groupId).toBe(f.groupId);expect(validLinkedStorageWorld286(root)).toBe(true);
 expect(applyCommand(root,{type:'map-view',mapId:destinationId}).ok).toBe(true);
 installBesideGroundPack(destination,pack);expect(destination.structures).toContain(f.a);expect(f.a.shelf!.linked286).toBeUndefined();expect(f.a.shelf!.settings.priority).toBe(5);
 expect(source.structures).toContain(f.b);expect(f.b.shelf!.linked286).toBeUndefined();expect(f.b.shelf!.settings.priority).toBe(5);expect(root.linkedStorage286!.groups).toEqual([]);expect(validLinkedStorageWorld286(root)).toBe(true);
},120000);

test('finishDeconstruction removes a linked original and preserves the surviving effective preference rather than hidden preference',()=>{
 const f=pair(),p=f.w.pawns[0]!;Object.assign(p,{x:f.a.x-1,z:f.a.z,motion:null,moveCooldown:0,path:[]});
 expect(applyCommand(f.w,{type:'designate',kind:'deconstruct',targetId:f.a.id,x:f.a.x,z:f.a.z}).ok).toBe(true);
 const job=f.w.jobs.find(j=>j.deconstruction?.structureId===f.a.id);if(!job)throw Error('Actual deconstruction target absent');admit(f.w,job,p);
 expect(finishDeconstruction(f.w,p,job)).toBe(true);expect(f.w.structures).not.toContain(f.a);dissolved(f);
});

test('fatal damageStructure retires the actual linked member once and leaves the surviving effective policy',()=>{
 const f=pair();expect(damageStructure(f.w,f.a,structureMaxHp(f.a),'bullet')).toBe(true);expect(f.w.structures).not.toContain(f.a);dissolved(f);
 const before=JSON.stringify(f.w);expect(damageStructure(f.w,f.a,structureMaxHp(f.a),'bullet')).toBe(false);expect(JSON.stringify(f.w)).toBe(before);
});

test('actual human death and corpse materialization preserve attached packed membership; destroying that true holder retires its furniture',()=>{
 const f=pair(),pack=uninstall(f.w,f.a),person=f.w.pawns[1]!;
 // Prepared attached inventory before the real injury, not a claimed loading
 // or transport. Ordinary death does not destroy those original possessions.
 pack.owner={type:'inventory',pawnId:person.id};const registry=f.w.linkedStorage286;
 controlledInjury(f.w,person,'heart',15000);expect(person.state).toBe('dead');expect(f.w.packed).toContain(pack);expect(f.w.linkedStorage286).toBe(registry);
 advanceHumanCorpses(f.w);const body=f.w.piles.find(p=>p.humanCorpse?.pawnId===person.id);if(!body)throw Error('Actual human corpse did not materialize');
 expect(f.a.shelf!.linked286!.groupId).toBe(f.groupId);expect(validLinkedStorageWorld286(f.w)).toBe(true);
 const next=f.w.nextId;expect(destroyHumanCorpse(f.w,body,'bullet')).toBe(true);expect(f.w.packed).not.toContain(pack);expect(f.w.piles).not.toContain(body);expect(person.body?.lostAt).toBe(f.w.tick);expect(f.w.nextId).toBe(next);dissolved(f);
 const before=JSON.stringify(f.w);expect(destroyHumanCorpse(f.w,body,'bullet')).toBe(false);expect(JSON.stringify(f.w)).toBe(before);
});

test('real animal corpse ownership keeps attached membership until planAnimalBodyRetirement destroys that actual holder and its packed original',()=>{
 const original=animalHaulingCamp459(),f=pair(original.world),pack=uninstall(f.w,f.a),animal=original.animal;
 // Declared retained-inventory death checkpoint on a genuine fresh-constructor
 // animal. No successful killing, failed Near drop or training is claimed.
 pack.owner={type:'inventory',pawnId:animal.id};animal.health=createAnimalMedicalRecord256(f.w,animal);animal.health.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(animal.health);animal.state='dead';
 const registry=f.w.linkedStorage286;advanceCorpses(f.w);
 const body=f.w.piles.find(p=>p.corpse?.animalId===animal.id);if(!body)throw Error('Actual animal corpse did not materialize');
 expect(f.w.wildlife!.animals).not.toContain(animal);expect(f.w.packed).toContain(pack);expect(f.w.linkedStorage286).toBe(registry);expect(validLinkedStorageWorld286(f.w)).toBe(true);
 const next=f.w.nextId,plan=planAnimalBodyRetirement256(f.w,animal.id,true);if(!plan)throw Error('Actual body retirement was refused');
 const before=JSON.stringify(f.w);expect(plan.current()).toBe(true);expect(JSON.stringify(f.w)).toBe(before);expect(plan.commit()).toBe(true);expect(plan.commit()).toBe(false);
 expect(f.w.packed).not.toContain(pack);expect(f.w.piles).not.toContain(body);expect(f.w.nextId).toBe(next);dissolved(f);
});
