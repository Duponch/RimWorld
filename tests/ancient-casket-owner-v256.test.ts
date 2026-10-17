import {ancientCasketMapRemovalBoundary256} from '../src/sim/ancient-casket-state-256.ts';
import {validatePileRecordShape} from '../src/sim/material-record-save.ts';
import {healthRandom} from '../src/sim/health.ts';
import {ancientCasketHumanOwnersForWorld256} from '../src/sim/ancient-casket-state-256.ts';
import {expect,test} from 'vitest';
import {startingPawn} from '../src/sim/starting-pawns.ts';
import {createMedicalRecord,reconcileMedicalDeath} from '../src/sim/injury-state.ts';
import {BLOOD_UNIT} from '../src/sim/injury-rules.ts';
import {advanceMedical} from '../src/sim/injury-evolution.ts';
import {validateMedicalRecord} from '../src/sim/injury-validation.ts';
import {ancientCasketOpeningGroup256,ancientHeldHumanAge256,partitionAncientNear256,actualAncientPodProducer256,type AncientCasket256,type AncientCasketState256,type AncientCasketOpening256,type AncientHeldPile256} from '../src/sim/ancient-casket-state-256.ts';
import {prepareAncientResumeClock256,ancientCasketClinicalClock256} from '../src/sim/ancient-casket-clock-256.ts';
import {advanceAncientOpeningContact256,validAncientOpening256,validAncientOpeningField256} from '../src/sim/ancient-casket-opening-256.ts';
import {validAncientCasketState256,validAncientCasketField256} from '../src/sim/ancient-casket-save-256.ts';
import {ancientCasketDestructionRefusal256,applyAncientHumanEjectionSickness256,ancientCasketEjectionRandom256} from '../src/sim/ancient-casket-release-256.ts';
import {addCryptosleepSickness256,cryptosleepSicknessModifiers256} from '../src/sim/cryptosleep-sickness-256.ts';

// Prepared pure ownership/clock inputs only. No fake World/Planet, generated
// Ancient NPC, normal-play chronology or scenario activation is asserted here.
const holder=(groupId=-1,contentsKnown=false):AncientCasketState256=>({revision:1,groupId,contentsKnown,heldAt:100,humans:[],animals:[],items:[]});
const casket=(id:number,group=-1,known=false):AncientCasket256=>({id,kind:'ancient-cryptosleep-casket',x:5,z:5,orientation:1,footprint:'standard',factionId:null,casket:holder(group,known)});
const playerClockRecord=()=>{const p=startingPawn(1,'Préparé — horloge personnelle',3,3,0,55,123,100);p.health=createMedicalRecord(100);return p;};

test('group -1 is isolated; source-order unopened siblings open once; known initiator never cascades',()=>{
 const a=casket(10,4),b=casket(11,4),known=casket(12,4,true),other=casket(13,5),isolated=casket(14);
 const all=[b,known,other,a,isolated];expect(ancientCasketOpeningGroup256(all,a)).toEqual([a,b]);
 expect(ancientCasketOpeningGroup256(all,known)).toEqual([known]);expect(ancientCasketOpeningGroup256(all,isolated)).toEqual([isolated]);
 a.casket.contentsKnown=true;expect(ancientCasketOpeningGroup256(all,a)).toEqual([a]);
});
test('failed Near retains original Things; a successful subset takes only its own possessions',()=>{
 const s=holder(),p=playerClockRecord();s.humans.push(p);
 const owned:AncientHeldPile256={id:2,kind:'gold',item:'gold',quantity:27,owner:{type:'inventory',pawnId:p.id}};
 const loose:AncientHeldPile256={id:3,kind:'plasteel',item:'plasteel',quantity:16,owner:{type:'ancient-casket',casketId:10}};s.items.push(owned,loose);
 const before=JSON.stringify(s),failed=partitionAncientNear256(s,new Set(),new Set());
 expect(failed.movedItems).toEqual([]);expect(failed.retainedHumans[0]).toBe(p);expect(failed.retainedItems).toEqual([owned,loose]);expect(JSON.stringify(s)).toBe(before);
 const partial=partitionAncientNear256(s,new Set([p.id]),new Set());expect(partial.movedHumans[0]).toBe(p);expect(partial.movedItems).toEqual([owned]);expect(partial.retainedItems).toEqual([loose]);expect(owned.quantity+loose.quantity).toBe(43);
});
test('suspension keeps canonical illness and biological age; only actual medical tick and supported tend deadlines resume',()=>{
 const s=holder(),p=playerClockRecord();s.humans.push(p);const h=p.health!;
 addCryptosleepSickness256(h,{integer:()=>8001,integerValue:()=>-17},256);
 h.flu={bornAt:70,severity:100_000_000,immunity:0,luck:1_000_000,tend:{quality:500,expiresAtCore:1100}};
 const biological=p.age?.biologicalTicks,chronological=p.age?.chronologicalTicks,unchanged=JSON.stringify(s),condition=h.cryptosleepSickness;
 const age=ancientHeldHumanAge256(s,p,150);expect(age?.biologicalTicks).toBe(biological);expect(age?.chronologicalTicks).toBe(chronological!+50);expect(JSON.stringify(s)).toBe(unchanged);
 expect(ancientCasketClinicalClock256(s,p)).toBe(100);const loaded=JSON.parse(JSON.stringify(s));expect(ancientCasketClinicalClock256(loaded,loaded.humans[0])).toBe(100);
 const resume=prepareAncientResumeClock256(s,150);expect(JSON.stringify(s)).toBe(unchanged);expect(resume.commit()).toBe(true);expect(resume.commit()).toBe(false);
 expect(h.tick).toBe(150);expect(h.cryptosleepSickness).toBe(condition);expect(condition).toEqual({remainingCore:8001,initialCore:8001,noiseSeed:-17});
 expect(h.flu.severity).toBe(100_000_000);expect(h.flu.bornAt).toBe(70);expect(h.flu.tend!.expiresAtCore).toBe(1600);expect(p.age!.biologicalTicks).toBe(biological);expect(p.age!.chronologicalTicks).toBe(chronological!+50);
});

test('a stale resume plan cannot partially rewrite another record',()=>{
 const s=holder(),p=playerClockRecord();s.humans.push(p);const plan=prepareAncientResumeClock256(s,150);p.health!.tick=101;
 const before=JSON.stringify(s);expect(plan.commit()).toBe(false);expect(JSON.stringify(s)).toBe(before);
});
test('only thirty consecutive confirmed contact intervals complete 300 Core; duplicate calls and pause grant zero',()=>{
 const t:AncientCasketOpening256={casketId:10,phase:'approach',progressCore:0,lastWorkedAt:7};
 expect(advanceAncientOpeningContact256(t,7,true)).toBe('wait');expect(advanceAncientOpeningContact256(t,7,true)).toBe('wait');expect(t.progressCore).toBe(0);
 for(let tick=8;tick<37;tick++)expect(advanceAncientOpeningContact256(t,tick,true)).toBe('wait');expect(t.progressCore).toBe(290);
 expect(advanceAncientOpeningContact256(t,37,true)).toBe('ready');expect(t.progressCore).toBe(300);
 const lost={casketId:10,phase:'opening' as const,progressCore:100,lastWorkedAt:20};expect(advanceAncientOpeningContact256(lost,21,false)).toBe('cancel');expect(lost.progressCore).toBe(100);
 expect(advanceAncientOpeningContact256(lost,25,true)).toBe('cancel');expect(lost.progressCore).toBe(100);
});
test('old-schema/future/accessor holder and completed/malformed task cannot enter a save',()=>{
 const s=holder();expect(validAncientCasketState256(s,256,100)).toBe(true);expect(validAncientCasketState256(s,255,100)).toBe(false);expect(validAncientCasketState256({...s,future:1},256,100)).toBe(false);
 let read=false;const raw={...s};Object.defineProperty(raw,'humans',{enumerable:true,get(){read=true;return [];}});expect(validAncientCasketState256(raw,256,100)).toBe(false);expect(read).toBe(false);
 expect(validAncientOpening256({casketId:10,phase:'opening',progressCore:290,lastWorkedAt:100},256,100,20)).toBe(true);
 expect(validAncientOpening256({casketId:10,phase:'opening',progressCore:300,lastWorkedAt:100},256,100,20)).toBe(false);
});
test('destruction is not free ejection; blocked nonempty modes preserve every original Thing',()=>{
 const c=casket(10);c.casket.items.push({id:2,kind:'gold',item:'gold',quantity:23,owner:{type:'ancient-casket',casketId:10}});const before=JSON.stringify(c);
 for(const mode of ['deconstruct','kill-finalize','vanish'] as const)expect(ancientCasketDestructionRefusal256(c,mode)).not.toBeNull();expect(JSON.stringify(c)).toBe(before);
 expect(ancientCasketDestructionRefusal256(casket(11),'vanish')).toBeNull();expect(actualAncientPodProducer256().status).toBe('blocked');
});
test('ejection uses canonical two-draw merge on the same original record, then local physiology advances only the next real tick',()=>{
 const p=playerClockRecord(),record=p.health!,s=holder();s.humans.push(p);addCryptosleepSickness256(record,{integer:()=>8000,integerValue:()=>-17},256);
 const condition=record.cryptosleepSickness!,resume=prepareAncientResumeClock256(s,150);expect(resume.commit()).toBe(true);
 const order:string[]=[];applyAncientHumanEjectionSickness256(p,150,{integer:(min,max)=>{order.push('duration');expect([min,max]).toEqual([8000,12001]);return 12000;},integerValue:()=>{order.push('noise');return 999;}});
 expect(order).toEqual(['duration','noise']);expect(p.health).toBe(record);expect(record.cryptosleepSickness).toBe(condition);expect(condition).toEqual({remainingCore:12000,initialCore:8000,noiseSeed:-17});
 expect(cryptosleepSicknessModifiers256(condition)).toEqual({consciousnessFactor:.8,movingFactor:.9,manipulationFactor:.9});
 advanceMedical(record,1,{phase:p.id%60,posture:'standing',starving:false,cryptosleepSicknessSpawned:true},()=>.99);
 expect(record.tick).toBe(151);expect(condition.remainingCore).toBe(11990);expect(validateMedicalRecord(record,true,true,true,true,false,false,true,true,true,true,true,256,true)).toBeNull();
});

test('stale clinical clock rejects before either ejection draw and original dead record remains terminal',()=>{
 const p=playerClockRecord(),before=JSON.stringify(p);let draws=0;const random={integer:()=>{draws++;return 8000;},integerValue:()=>{draws++;return 0;}};
 expect(()=>applyAncientHumanEjectionSickness256(p,101,random)).toThrow();expect(draws).toBe(0);expect(JSON.stringify(p)).toBe(before);
 p.health!.bloodLoss=BLOOD_UNIT;reconcileMedicalDeath(p.health!);p.state='dead';const terminal=JSON.stringify(p.health),s=holder();s.humans.push(p);
 expect(ancientCasketClinicalClock256(s,p)).toBe(100);expect(prepareAncientResumeClock256(s,150).commit()).toBe(true);
 applyAncientHumanEjectionSickness256(p,150,random);expect(draws).toBe(0);expect(JSON.stringify(p.health)).toBe(terminal);
});

test('physical vomit and unresolved absolute wound/anesthetic clocks refuse resume without curing or rewriting dates',()=>{
 const p=playerClockRecord(),s=holder();s.humans.push(p);const h=p.health!;
 h.injuries=[{id:1,part:'left-arm',kind:'cut',severity:1000,bornAt:90,infection:{dueCore:20000,roomFactor:1000}}];h.nextInjuryId=2;
 let before=JSON.stringify(s);expect(()=>prepareAncientResumeClock256(s,150)).toThrow('suspension offsets');expect(JSON.stringify(s)).toBe(before);
 h.injuries=[];h.anesthetic={bornAt:100,expiresAtCore:50000,severity:1_000_000_000,remainder:0};before=JSON.stringify(s);expect(()=>prepareAncientResumeClock256(s,150)).toThrow('anesthetic suspension');expect(JSON.stringify(s)).toBe(before);
 delete h.anesthetic;addCryptosleepSickness256(h,{integer:()=>8000,integerValue:()=>17},256);h.cryptosleepSickness!.vomit={remainingCore:300,cell:{x:p.x,z:p.z}};before=JSON.stringify(s);expect(()=>prepareAncientResumeClock256(s,150)).toThrow('vomiting');expect(JSON.stringify(s)).toBe(before);
});

test('strict future holder/task fields refuse undefined, inherited and accessor values before reading them',()=>{
 const c=casket(10);expect(validAncientCasketField256(c,256,100)).toBe(true);expect(validAncientCasketField256(c,255,100)).toBe(false);expect(validAncientCasketField256(c,256,99)).toBe(false);
 expect(validAncientCasketField256({kind:'wall',casket:undefined},255,100)).toBe(false);
 let reads=0;const bad={...c};Object.defineProperty(bad,'casket',{enumerable:true,get(){reads++;return c.casket;}});expect(validAncientCasketField256(bad,256,100)).toBe(false);expect(reads).toBe(0);
 expect(validAncientOpeningField256({openCasket:undefined},256,100,20)).toBe(false);expect(validAncientOpeningField256(Object.create({openCasket:{}}),256,100,20)).toBe(false);
 const owner={};Object.defineProperty(owner,'openCasket',{enumerable:true,get(){reads++;return {};}});expect(validAncientOpeningField256(owner,256,100,20)).toBe(false);expect(reads).toBe(0);
});

test('ejection Rand.Int is the next actual gameplay word, not a new seed reconstructed from a float',()=>{
 const source={rng:12345},expected={rng:12345};const nextWord=()=>{healthRandom(expected);return expected.rng|0;};
 const random=ancientCasketEjectionRandom256(source),duration=8000+Math.abs(nextWord()%4001),noise=nextWord();
 const p=playerClockRecord();applyAncientHumanEjectionSickness256(p,100,random);expect(p.health!.cryptosleepSickness).toEqual({remainingCore:duration,initialCore:duration,noiseSeed:noise});expect(source.rng).toBe(expected.rng);
});

test('equal-data replacement cannot redirect an already prepared resume into an orphan medical record',()=>{
 const p=playerClockRecord(),s=holder();s.humans.push(p);const original=p.health!,plan=prepareAncientResumeClock256(s,150);
 p.health={...original};const before=JSON.stringify(s);expect(plan.current()).toBe(false);expect(plan.commit()).toBe(false);expect(original.tick).toBe(100);expect(p.health.tick).toBe(100);expect(JSON.stringify(s)).toBe(before);
});

// Transport headers below are not a synthetic World or a generated map.
test('direct held pile requires the exact real holder ID; ordinary local and old-schema admission stay closed',()=>{
 const context={width:32,height:32,tick:100,nextId:20},pile={id:3,kind:'gold',item:'gold',quantity:27,owner:{type:'ancient-casket',casketId:10}};
 expect(validatePileRecordShape(pile,context,256,100,10)).toEqual([]);expect(validatePileRecordShape(pile,context,256,100)).not.toEqual([]);expect(validatePileRecordShape(pile,context,256,100,11)).not.toEqual([]);expect(validatePileRecordShape(pile,context,255,100,10)).not.toEqual([]);
});

test('human capture reads the same frozen original and its original inventory at heldAt without catch-up',()=>{
 const c=casket(10),pawn=playerClockRecord(),pile:AncientHeldPile256={id:2,item:'gold',kind:'gold',quantity:27,owner:{type:'inventory',pawnId:pawn.id}};c.casket.humans.push(pawn);c.casket.items.push(pile);
 const before=JSON.stringify(c),slots=ancientCasketHumanOwnersForWorld256({schemaVersion:256,tick:150,structures:[c]});expect(slots).toHaveLength(1);expect(slots[0]!.pawn).toBe(pawn);expect(slots[0]!.items[0]).toBe(pile);expect(slots[0]!.validationTick).toBe(100);expect(slots[0]!.simulation).toBe('frozen');expect(JSON.stringify(c)).toBe(before);
 expect(()=>ancientCasketHumanOwnersForWorld256({schemaVersion:255,tick:150,structures:[c]})).toThrow();expect(JSON.stringify(c)).toBe(before);
});

test('map removal cannot turn a nonempty casket into loose lost Pawn aliases',()=>{
 const c=casket(10),pawn=playerClockRecord();c.casket.humans.push(pawn);const header={schemaVersion:256,tick:100,structures:[c]},before=JSON.stringify(c);
 expect(ancientCasketMapRemovalBoundary256(header)).toContain('original holder and map retained');expect(JSON.stringify(c)).toBe(before);
 expect(ancientCasketMapRemovalBoundary256({schemaVersion:256,tick:100,structures:[casket(11)]})).toBeNull();
});
