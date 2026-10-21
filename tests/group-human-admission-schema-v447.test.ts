import {expect,test} from 'vitest';
import {validGroupAdmission257,validGroupHumanPreparation257} from '../src/sim/group-human-admission-257.ts';
import type {PreparingGroup} from '../src/sim/group-capture.ts';
import type {World} from '../src/sim/types.ts';

/** Bounded reference-only guard fixture, with no played caravan or campaign
 * claim. The actual acquired259 campaign migration is covered separately by
 * cryptosleep-mapremoved-v447, using its unchanged checkpoint and SHA. */
function preparation(){
 const w={pawns:[]} as unknown as World;
 const g:PreparingGroup={id:1,startedAt:0,destination:1,phase:'gathering',admission:{revision:2},memberIds:[11,12],rendezvous:{x:1,z:1},meeting:[{pawnId:11,cell:{x:1,z:1}},{pawnId:12,cell:{x:2,z:1}}],manifest:[],cursor:0,exits:[{pawnId:11,cell:{x:0,z:1}},{pawnId:12,cell:{x:0,z:2}}],humanPreparation:{revision:1,releaseIds:[11],passengers:[{pawnId:12,carrierId:11,phase:'approach'}]},ledger:{foodLoaded:0,foodConsumed:0,medicineUsed:0,silverLoaded:0,silverPaid:0,silverEarned:0,cargoLoaded:{cloth:0,'muffalo-wool':0},sold:{cloth:0,'muffalo-wool':0},bought:{medicine:0,component:0}}};
 return {w,g,prep:g.humanPreparation!};
}

test('literal admission revisions survive the closed schema family through272 without promoting old formations',()=>{
 for(let version=257;version<=272;version++){
  expect(validGroupAdmission257({revision:1},version),String(version)).toBe(true);
  expect(validGroupAdmission257({revision:2},version),String(version)).toBe(version>=259);
  expect(validGroupAdmission257(undefined,version)).toBe(true);
 }
 for(const version of [256,276,270.5,NaN])for(const revision of [1,2])expect(validGroupAdmission257({revision},version)).toBe(false);
});

test('admission remains strict plain data and never reads accessors',()=>{
 for(const version of [269,270,271,272]){
  let reads=0;const accessor=Object.defineProperty({},'revision',{enumerable:true,get(){reads++;throw Error('not data');}});
  for(const value of [null,{revision:3},{revision:2,extra:true},{revision:undefined},Object.assign(Object.create({revision:2}),{}),accessor])expect(validGroupAdmission257(value,version)).toBe(false);
  expect(reads).toBe(0);
 }
});

test('number-only continuation retains the same preparation references and closed rejection boundaries',()=>{
 const {w,g,prep}=preparation(),before=JSON.stringify(g);
 for(const version of [259,260,261,262,263,264,265,266,267,268,269,270,271,272])expect(validGroupHumanPreparation257(prep,w,g,version,true),String(version)).toBe(true);
 for(const version of [256,276,270.5,NaN])expect(validGroupHumanPreparation257(prep,w,g,version,true)).toBe(false);
 for(const value of [
  {...prep,releaseIds:[11,11]},
  {...prep,releaseIds:[13]},
  {...prep,passengers:[...prep.passengers,...prep.passengers]},
  {...prep,passengers:[{...prep.passengers[0]!,carrierId:13}]},
  {...prep,passengers:[{...prep.passengers[0]!,phase:'waiting'}]},
  {...prep,extra:true},
 ])expect(validGroupHumanPreparation257(value,w,g,271,true)).toBe(false);
 const undraft={...prep,undraftIds261:[11]};expect(validGroupHumanPreparation257(undraft,w,g,260,true)).toBe(false);expect(validGroupHumanPreparation257(undraft,w,g,271,true)).toBe(true);
 expect(JSON.stringify(g)).toBe(before);expect(g.humanPreparation).toBe(prep);
});
