import {describe,expect,test} from 'vitest';
import {extractTreeDefinition,LEGACY_TREE,replantDurationCore,treeExpiryYield,treePackDeadline,treePackLive,treeWorkCorePerTick,treeSelectable} from '../src/sim/tree-transfer-rules';
import {TREE_PACK_LIFETIME,type MinifiedTreePile,type TreeJob} from '../src/sim/tree-transfer-state';
import {planTreeExtraction,commitTreeExtraction,planTreeReplantation,commitTreeReplantation,planTreeExpiry,commitTreeExpiry,resumeTreeLife,type TreeHost,type TreePileRef} from '../src/sim/tree-transfer-atomic';
import {physicalTravelUnitMass} from '../src/sim/tree-transfer-mass';
import {validTreePileShape,validTreeJobShape,validateTreeDomain,hasTreePayload,hasTreeDomain} from '../src/sim/tree-transfer-save';
import {validOriginalTreeResource} from '../src/sim/tree-transfer-resource-save';
import {validPausedTreeLife,resumedTreeElapsed,recordResumedTreeCheck} from '../src/sim/tree-transfer-clock';
import {createPlantLife,PLANT_LIFE_INTERVAL} from '../src/sim/plant-life';
import {medicalCamp} from './scenarios/health';
import {prepareConstructionFlora} from './scenarios/construction-flora-v348';
import type {Cell,MaterialOwner,MaterialPile,Resource} from '../src/sim/types';

// Explicit transaction fragments. These test kernel preflights and ownership,
// not a complete World, human save, automatic planner or natural campaign.
const source=():Resource=>({id:10,kind:'tree',species:'oak',x:8,z:8,amount:46,growth:.8,growthTick:100,damage:30});
const legacySource=():Resource=>({id:10,kind:'tree',x:8,z:8,amount:46,damage:30});
const extractJob=():TreeJob=>({id:20,kind:'extract-tree',tree:{kind:'extract',resourceId:10},x:8,z:8,orientation:0,footprint:'standard',status:'active',reservedBy:77,progress:1400,escrow:{wood:0,food:0}});
function kernel(original=source()){
  const resources:Resource[]=[original],piles:MaterialPile[]=[],jobs:TreeJob[]=[extractJob()];
  let tick=100,nextId=100,rng=0x12345678,space=true,ids=true;
  const container={piles};
  const ref=(id:number):TreePileRef|undefined=>{const pile=piles.find(p=>p.id===id);return pile?.item==='minified-tree'?{pile:pile as MinifiedTreePile,container,clock:tick,active:true}:undefined;};
  const host:TreeHost={
    get tick(){return tick;},set tick(value){tick=value;},get nextId(){return nextId;},set nextId(value){nextId=value;},get rng(){return rng;},set rng(value){rng=value;},
    resource:id=>resources.find(r=>r.id===id),resourceIsExact:r=>resources.includes(r),pile:ref,job:id=>jobs.find(j=>j.id===id),
    extractionCell:(r,j)=>space&&r.x===j.x&&r.z===j.z?{x:r.x,z:r.z}:undefined,
    extractionReady:(j,r)=>resources.includes(r)&&jobs.includes(j)&&j.tree.kind==='extract'&&j.tree.resourceId===r.id&&j.reservedBy===77,
    replantReady:(j,p)=>space&&jobs.includes(j)&&j.tree.kind==='replant'&&j.tree.resourceId===p.innerResource.id&&p.owner.type==='pawn'&&p.owner.pawnId===j.reservedBy,
    idsAvailable:n=>ids&&Number.isSafeInteger(nextId+n),
    removeResource:r=>{const i=resources.indexOf(r);if(i>=0)resources.splice(i,1);},addResource:r=>{resources.push(r);},
    removePile:r=>{const i=piles.indexOf(r.pile);if(i>=0)piles.splice(i,1);},addGroundTree:p=>{piles.push(p);},
    expiryYieldFactor:()=>1,
    expiryOutput:(r,quantity)=>space?{outputs:Array.from({length:Math.ceil(quantity/75)},(_,i)=>({owner:{...r.pile.owner},quantity:Math.min(75,quantity-i*75)})),newIds:Math.ceil(quantity/75),token:JSON.stringify(r.pile.owner)}:undefined,
    expiryOutputStillValid:(r,p)=>space&&JSON.stringify(r.pile.owner)===p.token&&p.outputs.every(o=>JSON.stringify(o.owner)===p.token),
    commitExpiryOutput:(_r,p)=>{for(const output of p.outputs)piles.push({id:nextId++,kind:'wood',item:'wood',quantity:output.quantity,owner:{...output.owner}});},
    removeTreeClaims:(resourceId,wrapperId)=>{for(let i=jobs.length-1;i>=0;i--){const job=jobs[i]!;if(job.tree.resourceId===resourceId||job.tree.kind==='replant'&&job.tree.sourcePileId===wrapperId)jobs.splice(i,1);}},
    finish:j=>{const i=jobs.indexOf(j);if(i>=0)jobs.splice(i,1);},growth:r=>r.growth??1,reconcileReplantedGrowth:()=>{},
  };
  const snapshot=()=>structuredClone({resources,piles,jobs,tick,nextId,rng});
  const extract=()=>{const plan=planTreeExtraction(host,jobs[0]!);expect(plan).toBeDefined();const pile=commitTreeExtraction(host,plan!);expect(pile).toBeDefined();return pile!;};
  const replant=(pile:MinifiedTreePile,cell:Cell={x:16,z:8})=>{
    pile.owner={type:'pawn',pawnId:77};const job:TreeJob={...extractJob(),id:21,kind:'replant-tree',progress:200,x:cell.x,z:cell.z,tree:{kind:'replant',sourcePileId:pile.id,resourceId:pile.innerResource.id,phase:'prepare',carryPileId:pile.id,durationCore:200,workCore:200}};jobs.push(job);return job;
  };
  return {host,resources,piles,jobs,snapshot,extract,replant,ref,setSpace:(value:boolean)=>{space=value;},setIds:(value:boolean)=>{ids=value;}};
}

describe('V349 primary tree definition rules',()=>{
  test.each([['oak',1400],['poplar',800],['pine',710],['birch',800],['drago',660]] as const)('%s has exact extraction work and 150 kg mass',(species,workCore)=>{
    const def=extractTreeDefinition({kind:'tree',species});expect(def).toMatchObject({workCore,massGrams:150000,maxHP:200,minimumGrowth:.4,roofBlocked:true});
  });
  test('legacy mapping is explicit and never changes a source into an oak',()=>{const tree=legacySource(),before=structuredClone(tree);expect(extractTreeDefinition(tree)).toBe(LEGACY_TREE);expect(tree).toEqual(before);expect(tree.species).toBeUndefined();});
  test.each([{kind:'tree' as const,species:'saguaro' as const},{kind:'wild-plant' as const,species:'agave' as const},{kind:'berries' as const,species:'berry-bush' as const}])('does not invent extraction for $species',tree=>expect(extractTreeDefinition(tree)).toBeUndefined());
  test.each(['grass','tall-grass','brambles','moss'] as const)('%s remains a physical plant but is not selectable by map click',species=>expect(treeSelectable({...source(),kind:'wild-plant',species})).toBe(false));
  test('tree work includes the growth multiplier; replant preparation is captured rather than construction 150',()=>{const def=extractTreeDefinition(source())!;expect(treeWorkCorePerTick(1,0)).toBeCloseTo(3.3);expect(treeWorkCorePerTick(1,1)).toBeCloseTo(1);expect(replantDurationCore(def,1,1)).toBe(1400);expect(replantDurationCore(def,1,0)).toBe(Math.trunc(1400/3.3));expect(replantDurationCore(def,0,.8)).toBeUndefined();});
});

describe('V349 whole original-resource custody transactions',()=>{
  test('pure extraction preflight preserves source, RNG, IDs and owners; commit wraps the same original once',()=>{
    const k=kernel(),tree=k.resources[0]!,before=k.snapshot(),plan=planTreeExtraction(k.host,k.jobs[0]!);expect(plan).toBeDefined();expect(k.snapshot()).toEqual(before);
    const pile=commitTreeExtraction(k.host,plan!)!;expect(pile.innerResource).toBe(tree);expect(pile.id).toBe(100);expect(pile.innerResource.id).toBe(10);expect(pile.quantity).toBe(1);expect(pile.plantPack).toEqual({packedAt:100,expiresAt:42100});expect(k.resources).toEqual([]);expect(k.jobs).toEqual([]);expect(k.host.nextId).toBe(101);expect(k.host.rng).toBe(before.rng);expect(pile.innerResource.damage).toBe(30);
  });
  test.each(['space','ids'] as const)('refused extraction %s has no source/RNG/ID mutation',mode=>{const k=kernel();if(mode==='space')k.setSpace(false);else k.setIds(false);const before=k.snapshot();expect(planTreeExtraction(k.host,k.jobs[0]!)).toBeUndefined();expect(k.snapshot()).toEqual(before);});
  test.each(['tick','id','source-record','source-object','source-location'] as const)('a stale extraction %s is refused before commit',mode=>{
    const k=kernel(),plan=planTreeExtraction(k.host,k.jobs[0]!)!;
    if(mode==='tick')k.host.tick++;if(mode==='id')k.host.nextId++;if(mode==='source-record')k.resources[0]!.damage=31;if(mode==='source-object')k.resources[0]=structuredClone(k.resources[0]!);if(mode==='source-location')k.resources[0]!.x++;
    const before=k.snapshot();expect(commitTreeExtraction(k.host,plan)).toBeUndefined();expect(k.snapshot()).toEqual(before);
  });
  test('replantation removes the wrapper and returns the same tree ID and object at actual completion',()=>{
    const k=kernel(),pile=k.extract(),tree=pile.innerResource;k.host.tick+=50;const job=k.replant(pile),before=k.snapshot(),plan=planTreeReplantation(k.host,job)!;expect(k.snapshot()).toEqual(before);
    const replanted=commitTreeReplantation(k.host,plan)!;expect(replanted).toBe(tree);expect(replanted).toMatchObject({id:10,x:16,z:8,damage:30,growth:.8,growthTick:150});expect(k.piles).toEqual([]);expect(k.resources).toEqual([tree]);expect(k.jobs).toEqual([]);expect(k.host.nextId).toBe(101);expect(k.host.rng).toBe(before.rng);
  });
  test.each(['duplicate-original','expired','owner-changed','target-blocked'] as const)('replantation refuses %s without consuming either identity',mode=>{
    const k=kernel(),pile=k.extract(),job=k.replant(pile);if(mode==='duplicate-original')k.resources.push(structuredClone(pile.innerResource));if(mode==='expired')k.host.tick=pile.plantPack.expiresAt;if(mode==='target-blocked')k.setSpace(false);
    if(mode==='owner-changed'){const plan=planTreeReplantation(k.host,job)!;pile.owner={type:'ground',x:4,z:4};const before=k.snapshot();expect(commitTreeReplantation(k.host,plan)).toBeUndefined();expect(k.snapshot()).toEqual(before);return;}
    const before=k.snapshot(),plan=planTreeReplantation(k.host,job);if(mode==='duplicate-original'){expect(plan).toBeDefined();expect(commitTreeReplantation(k.host,plan!)).toBeUndefined();}else expect(plan).toBeUndefined();expect(k.snapshot()).toEqual(before);
  });
  test('extracting a legacy source adds no species or growth fields, and replanting preserves that representation',()=>{const k=kernel(legacySource()),pile=k.extract();expect(pile.innerResource.species).toBeUndefined();expect(Object.hasOwn(pile.innerResource,'growth')).toBe(false);expect(Object.hasOwn(pile.innerResource,'growthTick')).toBe(false);k.host.tick+=50;const job=k.replant(pile),plan=planTreeReplantation(k.host,job)!;commitTreeReplantation(k.host,plan);expect(Object.hasOwn(k.resources[0]!,'growthTick')).toBe(false);expect(k.resources[0]!.id).toBe(10);});
});

describe('V349 seven-day expiry transaction fragments',()=>{
  test('deadline is exactly seven local days and transfer does not restart it',()=>{const k=kernel(),pile=k.extract();expect(TREE_PACK_LIFETIME).toBe(7*6000);expect(treePackDeadline(100)).toBe(42100);expect(treePackLive(pile,42099)).toBe(true);expect(treePackLive(pile,42100)).toBe(false);pile.owner={type:'inventory',pawnId:77};expect(pile.plantPack.expiresAt).toBe(42100);});
  test('yield is strict above the harvest threshold, rejects blight, preserves source and draws even on an integer',()=>{
    const k=kernel(),pile=k.extract();pile.innerResource.growth=.4;const before=structuredClone(pile);expect(treeExpiryYield(pile,k.host.rng,1)).toEqual({quantity:0,rng:k.host.rng});expect(pile).toEqual(before);
    pile.innerResource.growth=1;delete pile.innerResource.damage;const roll=treeExpiryYield(pile,k.host.rng,1)!;expect(roll.quantity).toBe(23);expect(roll.rng).not.toBe(k.host.rng);expect(treeExpiryYield(pile,k.host.rng,2)?.quantity).toBe(46);Object.assign(pile.innerResource,{blight:{since:100}});expect(treeExpiryYield(pile,k.host.rng,1)).toEqual({quantity:0,rng:k.host.rng});
  });
  const owners:MaterialOwner[]=[{type:'ground',x:8,z:8},{type:'pawn',pawnId:77},{type:'inventory',pawnId:77},{type:'starting-pod',podId:70},{type:'orbital-ship',shipId:71},{type:'orbital-cargo',deliveryId:72}];
  test.each(owners)('expiry keeps real $type container ownership without transferring to a fake map',owner=>{
    const k=kernel(),pile=k.extract();pile.owner={...owner};pile.innerResource.growth=1;delete pile.innerResource.damage;k.host.tick=pile.plantPack.expiresAt-1;expect(planTreeExpiry(k.host,k.ref(pile.id)!)).toBeUndefined();k.host.tick++;const before=k.snapshot(),plan=planTreeExpiry(k.host,k.ref(pile.id)!)!;expect(k.snapshot()).toEqual(before);expect(commitTreeExpiry(k.host,plan)).toBe(true);expect(k.piles).toHaveLength(1);expect(k.piles[0]).toMatchObject({item:'wood',quantity:23,owner});expect(k.host.rng).toBe(plan.afterRng);expect(k.resources).toEqual([]);
  });
  test('a frozen archive occurrence is not advanced by a live-world expiry pass',()=>{const k=kernel(),pile=k.extract();k.host.tick=pile.plantPack.expiresAt+1;const ref={...k.ref(pile.id)!,clock:pile.plantPack.packedAt,active:false};const before=k.snapshot();expect(planTreeExpiry(k.host,ref)).toBeUndefined();expect(k.snapshot()).toEqual(before);});
  test('large legacy yield is split into real output identities, never capped to one stack',()=>{const tree=legacySource();tree.amount=400;delete tree.damage;const k=kernel(tree),pile=k.extract();k.host.tick=pile.plantPack.expiresAt;const plan=planTreeExpiry(k.host,k.ref(pile.id)!)!;expect(plan.output.outputs.map(o=>o.quantity)).toEqual([75,75,50]);expect(plan.output.newIds).toBe(3);expect(commitTreeExpiry(k.host,plan)).toBe(true);expect(k.piles.map(p=>p.quantity)).toEqual([75,75,50]);expect(k.host.nextId).toBe(104);expect(new Set(k.piles.map(p=>p.id)).size).toBe(3);});
  test.each(['space','ids'] as const)('expiry %s refusal preserves original wrapper/RNG/IDs',mode=>{const k=kernel(),pile=k.extract();k.host.tick=pile.plantPack.expiresAt;if(mode==='space')k.setSpace(false);else k.setIds(false);const before=k.snapshot();expect(planTreeExpiry(k.host,k.ref(pile.id)!)).toBeUndefined();expect(k.snapshot()).toEqual(before);});
  test.each(['rng','id','clock','owner'] as const)('stale expiry %s cannot commit an output plan',mode=>{const k=kernel(),pile=k.extract();k.host.tick=pile.plantPack.expiresAt;const plan=planTreeExpiry(k.host,k.ref(pile.id)!)!;if(mode==='rng')k.host.rng++;if(mode==='id')k.host.nextId++;if(mode==='clock')k.host.tick++;if(mode==='owner')pile.owner={type:'ground',x:6,z:6};const before=k.snapshot();expect(commitTreeExpiry(k.host,plan)).toBe(false);expect(k.snapshot()).toEqual(before);});
});

describe('V349 raw payload guards and paused clocks',()=>{
  const raw=()=>{const tree=legacySource(),pile:MinifiedTreePile={id:100,kind:'plant',item:'minified-tree',quantity:1,owner:{type:'ground',x:8,z:8},innerResource:tree,plantPack:{packedAt:100,expiresAt:42100}};return pile;};
  const validResource=(r:unknown,tick:number)=>validOriginalTreeResource(r,{width:32,height:32,nextId:101},235,tick);
  test('valid boxed legacy tree is singleton and its inner coordinates remain provenance',()=>{const p=raw(),before=structuredClone(p);expect(validTreePileShape(p,235,101,101,validResource)).toBe(true);expect(p).toEqual(before);});
  test.each(['innerResource','plantPack'] as const)('own future %s, even undefined, is rejected before V234 migration',key=>{const p:Record<string,unknown>={id:100,kind:'wood',item:'wood',quantity:1,owner:{type:'ground',x:8,z:8},[key]:undefined};expect(hasTreePayload(p)).toBe(true);expect(validTreePileShape(p,234,100,101,validResource)).toBe(false);});
  test.each(['extra-payload','stack-two','same-inner-id','expires-early','wrapper-hp','escrow-owner','apparel-owner','past-growth-clock'] as const)('rejects exact tree-domain corruption %s',mode=>{
    const p=raw();if(mode==='extra-payload')Object.assign(p.plantPack,{reset:true});if(mode==='stack-two')Object.assign(p,{quantity:2});if(mode==='same-inner-id')p.innerResource.id=p.id;if(mode==='expires-early')p.plantPack.expiresAt--;if(mode==='wrapper-hp')p.damage=100;if(mode==='escrow-owner')p.owner={type:'job',jobId:20};if(mode==='apparel-owner')Object.assign(p.owner,{type:'apparel',pawnId:77});if(mode==='past-growth-clock')Object.assign(p.innerResource,{species:'oak',growth:.5,growthTick:101});
    expect(validTreePileShape(p,235,101,101,validResource)).toBe(false);
  });
  test('domain rejects duplicate original IDs and dual live custody instead of deduplicating an occurrence',()=>{
    const p=raw(),occurrence={pile:p,ownerKey:'map-piles',clock:101,active:true},input={version:235,tick:101,nextId:101,occurrences:[occurrence],resources:[],jobs:[],pawns:[],outerIds:new Set([100]),resourceValidAt:validResource,activeJobValid:()=>false};
    expect(validateTreeDomain(input)).toBeDefined();expect(validateTreeDomain({...input,occurrences:[occurrence,{...occurrence,ownerKey:'away'}]})).toBeUndefined();expect(validateTreeDomain({...input,resources:[p.innerResource]})).toBeUndefined();expect(validateTreeDomain({...input,outerIds:new Set([100,10])})).toBeUndefined();expect(validateTreeDomain({...input,tick:42100,occurrences:[{...occurrence,clock:42100}]})).toBeUndefined();
  });
  test('frozen archive is validated at its own earlier clock, but cannot contain a tree already expired when it froze',()=>{
    const p=raw(),input={version:235,tick:50000,nextId:101,occurrences:[{pile:p,ownerKey:'archive:77',clock:101,active:false}],resources:[],jobs:[],pawns:[],outerIds:new Set([100]),resourceValidAt:validResource,activeJobValid:()=>false};
    expect(validateTreeDomain(input)).toBeDefined();expect(validateTreeDomain({...input,occurrences:[{...input.occurrences[0]!,clock:p.plantPack.expiresAt}]})).toBeUndefined();
  });
  test('an impossible captured preparation duration is rejected without recomputing a worker stat',()=>{
    const j:TreeJob={...extractJob(),id:21,kind:'replant-tree',progress:0,tree:{kind:'replant',sourcePileId:100,resourceId:10,phase:'prepare',carryPileId:100,durationCore:1000000000,workCore:0}};
    expect(validTreeJobShape(j,235,101)).toBe(false);
  });
  test('ordinary domain bypass and future job own-property remain explicit',()=>{expect(hasTreeDomain([],[{id:20,kind:'wall'}])).toBe(false);expect(hasTreeDomain([],[{id:20,kind:'wall',tree:undefined}])).toBe(true);expect(validTreeJobShape({...extractJob(),tree:undefined},234,101)).toBe(false);});
  test('paused lifetime preserves birth, age, leafless time and a strict historical branch',()=>{
    const w=medicalCamp();w.tick=3000;const r:Resource={id:w.nextId++,kind:'tree',species:'oak',x:12,z:10,amount:46,growth:.8,growthTick:w.tick};w.resources=[r];prepareConstructionFlora(w);r.plantLife=createPlantLife(w,r,true);const before=structuredClone(r.plantLife),packedAt=w.tick;w.tick+=50;resumeTreeLife(r,packedAt,w.tick);
    expect(r.plantLife).toMatchObject({since:before.since,bornAt:before.bornAt,age:before.age,darkTicks:before.darkTicks,pausedTicks:50,ageTick:3050});expect(validPausedTreeLife(r,235,w)).toBe(true);expect(validPausedTreeLife(r,234,w)).toBe(false);expect(resumedTreeElapsed(r,3060)).toBe(10);recordResumedTreeCheck(r,3060);expect((r.plantLife as {ageTick:number}).ageTick).toBe(3060);
    const old:Resource={...r,plantLife:before};expect(validPausedTreeLife(old,234,{...w,tick:3000})).toBe(true);expect(Object.hasOwn(old.plantLife!,'pausedTicks')).toBe(false);expect(PLANT_LIFE_INTERVAL).toBe(200);
  });
  test('a real leafless observation resumes its remaining duration and preserves its phase witness',()=>{
    const w=medicalCamp();const r:Resource={id:w.nextId++,kind:'tree',species:'oak',x:12,z:10,amount:46,growth:.8,growthTick:w.tick};w.resources=[r];prepareConstructionFlora(w);r.plantLife=createPlantLife(w,r,true);
    w.tick=r.plantLife.nextCheck;r.plantLife.age=w.tick-r.plantLife.since;r.plantLife.nextCheck+=PLANT_LIFE_INTERVAL;r.plantLife.leaflessAt=w.tick;
    const before=structuredClone(r.plantLife),packedAt=w.tick;w.tick+=125;resumeTreeLife(r,packedAt,w.tick);
    expect(r.plantLife).toMatchObject({since:before.since,bornAt:before.bornAt,age:before.age,leaflessAt:before.leaflessAt!+125,pausedTicks:125,leaflessPausedTicks:125});expect(validPausedTreeLife(r,235,w)).toBe(true);
    expect(w.tick-r.plantLife.leaflessAt!).toBe(packedAt-before.leaflessAt!);
  });
  test('physical travel mass reads payload and does not silently make a tree portable by a 35 kg human',()=>{const p=raw();expect(physicalTravelUnitMass(p,235)).toBe(150000);expect(physicalTravelUnitMass(p,234)).toBeUndefined();expect(physicalTravelUnitMass({id:101,kind:'wood',item:'wood',quantity:1,owner:{type:'inventory',pawnId:77}},235)).toBe(400);expect(physicalTravelUnitMass(p,235)!).toBeGreaterThan(35000);});
});
