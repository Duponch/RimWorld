import {expect,test} from 'vitest';
import {deconstructionCamp} from './scenarios/deconstruction';
import {fixturePower} from './scenarios/power';
import {applyCommand,advanceWorldCore297} from '../src/sim/engine';
import {effectiveCore297} from '../src/sim/core-phase-297';
import {validMeleeThreatShape} from '../src/sim/mental-save';
import {validArchivedMeleeThreat} from '../src/sim/visitor-save';
import {validateWorld,serializeWorld,deserializeWorld} from '../src/sim/serialization';
import {SnapshotEncoder,SnapshotDecoder} from '../src/bridge/snapshots';
import {createBulletFlight} from '../src/sim/bullet-flight';
import {registerWorldProjectile} from '../src/sim/projectile-system';
import {validateBombWaves} from '../src/sim/bomb-state';
import {applyStructureExternalDamage} from '../src/sim/bomb-system';
import {miniTurretExplosive} from '../src/sim/bomb-creation';
import {newMiniTurretState} from '../src/sim/mini-turret-state';
import {SMITHING_RESEARCH_COST,MACHINING_RESEARCH_COST,GUNSMITHING_RESEARCH_COST,GUN_TURRETS_RESEARCH_COST} from '../src/sim/research';
import type {Pawn,Structure,World} from '../src/sim/types';

function camp(){
 const w=deconstructionCamp(2,32);w.stockpiles=[];w.growingZones=[];
 for(const [i,p]of w.pawns.entries()){
  Object.assign(p,{x:3+i,z:5,hunger:70,rest:80,needCooldown:20,background:{childhood:'quiet-child',adulthood:'medic'}});
  p.recreation.level=100;p.schedule.fill('anything');for(const k of Object.keys(p.priorities)as(keyof Pawn['priorities'])[])p.priorities[k]=0;
 }
 if(w.wildlife)w.wildlife.animals=[];
 expect(effectiveCore297(w)).toBe(0);expect(validateWorld(w)).toEqual([]);return w;
}
function cores(w:World,count:number){for(let n=0;n<count;n++){const before=effectiveCore297(w);expect(advanceWorldCore297(w).core).toBe(before+1);}}
const threat=(atCore:number)=>({attackerId:1,atCore});

test('297 requires its explicit matching physical proof even when the threat value is absent',()=>{
 expect(validMeleeThreatShape(undefined,297,0)).toBe(false);
 expect(validMeleeThreatShape(undefined,297,0,7)).toBe(true);
 for(const proof of [NaN,Infinity,-1,7.1,10])expect(validMeleeThreatShape(undefined,297,0,proof)).toBe(false);
});
test('an owned phase7 threat admits, while its future receipt and a foreign civil proof refuse',()=>{
 expect(validMeleeThreatShape(threat(7),297,0,7)).toBe(true);
 expect(validMeleeThreatShape(threat(8),297,0,7)).toBe(false);
 expect(validMeleeThreatShape(threat(7),297,0,17)).toBe(false);
 // A held/frozen owner is checked against its OWN captured7, not a live Root107.
 expect(validMeleeThreatShape(threat(8),297,0,7)).toBe(false);
 expect(validMeleeThreatShape(threat(8),297,0,107)).toBe(false);
});
test('the historical absent and tick-times10 threat contract remains literal',()=>{
 expect(validMeleeThreatShape(undefined,191,0)).toBe(true);
 expect(validMeleeThreatShape(threat(0),191,0)).toBe(false);
 expect(validMeleeThreatShape(threat(0),192,0)).toBe(true);
 expect(validMeleeThreatShape(threat(7),296,0)).toBe(false);
 expect(validMeleeThreatShape(threat(7),296,1)).toBe(true);
});
test('the archive wrapper uses its macro receipt and never samples an unrelated live Root phase',()=>{
 const header={schemaVersion:297 as const,nextId:10};let reads=0;
 Object.defineProperty(header,'phaseCore297',{get(){reads++;throw Error('Forbidden live Root phase read');}});
 expect(validArchivedMeleeThreat({id:2,meleeThreat:threat(0)},header,0)).toBe(true);
 expect(validArchivedMeleeThreat({id:2,meleeThreat:threat(7)},header,0)).toBe(false);
 expect(validArchivedMeleeThreat({id:2},header,0)).toBe(true);expect(reads).toBe(0);
});

test('a real command and Core7 melee attempt produce a strict saveable threat and a Full accepted by the real decoder',()=>{
 const w=camp(),[attacker,target]=w.pawns;
 // Declared initial combat-capable background; the shared camp keeps pacifists
 // for the unrelated transport cases. Never bypass the real violent-work guard.
 attacker.background={childhood:'workshop-child',adulthood:'builder'};
 cores(w,6);expect(w.phaseCore297).toBe(6);
 expect(applyCommand(w,{type:'draft',pawnIds:[attacker.id],enabled:true}).ok).toBe(true);
 expect(applyCommand(w,{type:'melee',pawnIds:[attacker.id],targetId:target.id}).ok).toBe(true);
 expect(target.meleeThreat).toBeUndefined();cores(w,1);
 // No outcome/seed/receipt injection: even a genuine miss records the threat.
 expect(w.tick).toBe(0);expect(w.phaseCore297).toBe(7);expect(attacker.melee?.strike?.atCore).toBe(7);
 expect(target.meleeThreat).toEqual({attackerId:attacker.id,atCore:7});expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w),copy=deserializeWorld(raw);expect(serializeWorld(copy)).toBe(raw);expect(copy.pawns[1]!.meleeThreat).toEqual(target.meleeThreat);
 // Requires the coordinated Snapshot live-proof follow-up; no mock of admission.
 const result=new SnapshotDecoder().adopt(structuredClone(new SnapshotEncoder().encode(w,0,0)));
 expect(result.status).toBe('applied');if(result.status==='applied')expect(result.world.pawns[1]!.meleeThreat).toEqual(target.meleeThreat);
});

test('a real EMP arrival at Core7 retains its projectile source and passes wave provenance at that actual Core',()=>{
 const w=camp(),[launcher,target]=w.pawns;cores(w,6);
 const key=`pawn:${target.id}`,flight=createBulletFlight({origin:{x:target.x+.4,z:target.z+.5},destination:{x:target.x+.5,z:target.z+.5},launcherKey:`pawn:${launcher.id}`,equipmentKey:null,intendedKey:key,usedKey:key,flags:7,preventFriendlyFire:false,speedPerCoreTick:.4});
 const projectile=registerWorldProjectile(w,flight,'normal',{friendlyPawnIds:[],friendlyFireFactor:1},w.rng,effectiveCore297(w),'emp-launcher');
 expect(projectile.advancedAtCore).toBe(6);cores(w,1);expect(projectile.arrival?.kind).toBe('impact');expect(projectile.advancedAtCore).toBe(7);
 const wave=w.bombWaves?.find(wave=>wave.sourceId===projectile.id);expect(wave?.emp).toEqual({quality:'normal'});expect(wave?.startedAtCore).toBe(7);
 const errors:string[]=[];validateBombWaves(w,errors);expect(errors).toEqual([]);expect(validateWorld(w)).toEqual([]);
 const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});

test('real turret damage starts a phase7 wick that both generic and contextual live save guards accept',()=>{
 const w=camp();w.research??={project:null,points:0};
 Object.assign(w.research,{smithing:{points:SMITHING_RESEARCH_COST,completedAt:0},machining:{points:MACHINING_RESEARCH_COST,completedAt:0},gunsmithing:{points:GUNSMITHING_RESEARCH_COST,completedAt:0},gunTurrets:{points:GUN_TURRETS_RESEARCH_COST,completedAt:0}});
 const generator=fixturePower(w,'wood-generator',20,20);
 // Declared unused-ID gap chooses a physically explosive Def owner BEFORE any
 // hit; no damage outcome or random draw is retried or overwritten afterward.
 let id=w.nextId;while(!miniTurretExplosive(id))id++;w.nextId=id+1;
 const s:Structure={id,kind:'mini-turret',x:24,z:20,orientation:0,footprint:'standard',material:'steel',power:{on:true,parentId:generator.id},turret:{...newMiniTurretState(),holdFire:true,autoReload:false},damage:79};
 w.structures.push(s);expect(validateWorld(w)).toEqual([]);cores(w,7);
 expect(applyStructureExternalDamage(w,s,1,1,'melee')).toBe(true);expect(s.turret?.wick?.startedAtCore).toBe(7);
 expect(validateWorld(w)).toEqual([]);const raw=serializeWorld(w);expect(serializeWorld(deserializeWorld(raw))).toBe(raw);
});
