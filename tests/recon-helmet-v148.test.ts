import {expect,test} from 'vitest';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index.ts';
import {APPAREL,armorPiece,newApparelState} from '../src/sim/apparel-rules.ts';
import {createDefaultApparelPolicyRegistry} from '../src/sim/apparel-policy.ts';
import {apparelCompatible,resolveArmor} from '../src/sim/armor.ts';
import {apparelAppearance,APPAREL_CARGO,foldedApparel} from '../src/render/character-apparel.ts';
import {appearanceOf} from '../src/sim/pawn-appearance.ts';
import {portraitDataUrl} from '../src/ui/pawn-portrait.ts';
import {pawnGeometry,RECON_HELMET_DYE} from '../src/render/pawn-geometry.ts';
import {PawnLayer} from '../src/render/PawnLayer.ts';
import {cancelFlakWork} from '../src/sim/flak-work.ts';
import {addGroundMaterial,addMaterial} from '../src/sim/materials.ts';
import {productionResearchUnlocked,productionWorkerQualified,validFlakIngredients} from '../src/sim/machining.ts';
import {PRODUCTION_RECIPES,productionWorkTotal,recipeProduct} from '../src/sim/production-recipes.ts';
import {CLOTHING_RESEARCH_COST,researchCost,researchStationUsable,selectResearch} from '../src/sim/research.ts';
import {prepareAdvancedIndustryDemo} from '../scripts/generate-advanced-industry-demo-v139.ts';
import type {MaterialPile,World} from '../src/sim/types.ts';

const amount=(w:World,item:string)=>w.piles.filter(p=>p.item===item).reduce((n,p)=>n+p.quantity,0);
function prepared():World {
  const w=prepareAdvancedIndustryDemo(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!;
  bench.bills=[];
  w.research!.points=CLOTHING_RESEARCH_COST;w.research!.completedAt=1000;
  w.research!.reconArmor={points:researchCost('recon-armor'),completedAt:w.tick};
  const pawn=w.pawns[0]!;pawn.schedule.fill('work');pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;
  addGroundMaterial(w,'plasteel',30,{x:10,z:11},'plasteel');
  addGroundMaterial(w,'advanced-component',1,{x:9,z:11},'advanced-component');
  expect(validateWorld(w)).toEqual([]);
  return w;
}
function advance(w:World,done:()=>boolean,limit:number):void {
  for(let i=0;i<limit&&!done();i++){
    for(const pawn of w.pawns){pawn.hunger=100;pawn.rest=100;pawn.recreation.level=100;}
    stepWorld(w);
  }
  expect(done(),`tick ${w.tick}; ${JSON.stringify(w.pawns.map(p=>({state:p.state,cooking:p.cooking})))}`).toBe(true);
}

test('recon research and fabrication bill require the right bench, prerequisites and two exact materials',()=>{
  const w=prepared(),pawn=w.pawns[0]!;
  expect(researchCost('recon-armor')).toBe(6_000_000_000);
  expect(PRODUCTION_RECIPES['make-recon-helmet']).toMatchObject({station:'fabrication-bench',workTicks:1575,outputUnits:1});
  expect(productionWorkTotal('make-recon-helmet')).toBe(15_750_000);
  expect(recipeProduct('make-recon-helmet',[])).toBe('recon-helmet');
  expect(productionResearchUnlocked(w,'make-recon-helmet')).toBe(true);
  expect(productionWorkerQualified(pawn,'make-recon-helmet')).toBe(true);
  pawn.skills.crafting!.level=5;expect(productionWorkerQualified(pawn,'make-recon-helmet')).toBe(false);
  expect(validFlakIngredients('make-recon-helmet',[{item:'plasteel',quantity:30},{item:'advanced-component',quantity:1}])).toBe(true);
  expect(validFlakIngredients('make-recon-helmet',[{item:'plasteel',quantity:30},{item:'component',quantity:1}])).toBe(false);
  expect(validFlakIngredients('make-recon-helmet',[{item:'plasteel',quantity:29},{item:'advanced-component',quantity:2}])).toBe(false);
  delete w.research!.reconArmor;expect(productionResearchUnlocked(w,'make-recon-helmet')).toBe(false);
  expect(selectResearch(w,'recon-armor')).toMatchObject({ok:true});
  delete w.research!.fabrication;expect(selectResearch(w,'recon-armor')).toMatchObject({ok:false});
  const desk={id:w.nextId++,kind:'hi-tech-research-bench' as const,x:20,z:8,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:{on:true,parentId:null}};
  const analyzer={id:w.nextId++,kind:'multi-analyzer' as const,x:22,z:10,orientation:0 as const,footprint:'standard' as const,material:'steel' as const,power:{on:true,parentId:null}};
  w.structures.push(desk,analyzer);
  expect(researchStationUsable(w,desk,'recon-armor',analyzer.id)).toBe(true);
  analyzer.power.on=false;expect(researchStationUsable(w,desk,'recon-armor',analyzer.id)).toBe(false);
});

test('physical bill incorporates authored parts, resumes exactly, then produces a wearable counted helmet',()=>{
  const w=prepared(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!,pawn=w.pawns[0]!;
  const before=[amount(w,'plasteel'),amount(w,'advanced-component')];
  expect(applyCommand(w,{type:'bill-add',structureId:bench.id,recipe:'make-recon-helmet'})).toMatchObject({ok:true});
  advance(w,()=>w.piles.some(p=>p.item==='unfinished-recon-helmet'&&!!p.flakWork?.progress),3000);
  const piece=w.piles.find(p=>p.item==='unfinished-recon-helmet')!,work=piece.flakWork!;
  expect(work).toMatchObject({recipe:'make-recon-helmet',authorId:pawn.id,billId:bench.bills![0]!.id});
  expect(work.parts.filter(p=>p.item==='plasteel').reduce((n,p)=>n+p.quantity,0)).toBe(30);
  expect(work.parts.filter(p=>p.item==='advanced-component').reduce((n,p)=>n+p.quantity,0)).toBe(1);
  expect([amount(w,'plasteel'),amount(w,'advanced-component')]).toEqual([before[0]!-30,before[1]!-1]);
  const resumed=deserializeWorld(serializeWorld(w));
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  for(let i=0;i<25;i++){stepWorld(w);stepWorld(resumed);}
  expect(serializeWorld(resumed)).toBe(serializeWorld(w));
  advance(w,()=>w.piles.some(p=>p.item==='recon-helmet'&&p.owner.type==='ground'),4000);
  expect(w.piles.some(p=>p.id===piece.id)).toBe(false);
  const helmet=w.piles.find(p=>p.item==='recon-helmet')!;
  expect(helmet.apparel?.quality).toBeDefined();
  expect(applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:helmet.id,action:'wear',queue:false})).toMatchObject({ok:true});
  advance(w,()=>helmet.owner.type==='apparel',300);
  expect(helmet.owner).toMatchObject({type:'apparel',pawnId:pawn.id});
  expect(validateWorld(w)).toEqual([]);
});

test('cancellation refuses impossible deposits atomically and returns the original material types',()=>{
  const w=prepared(),bench=w.structures.find(s=>s.kind==='fabrication-bench')!;
  expect(applyCommand(w,{type:'bill-add',structureId:bench.id,recipe:'make-recon-helmet'})).toMatchObject({ok:true});
  advance(w,()=>w.piles.some(p=>p.item==='unfinished-recon-helmet'&&!!p.flakWork?.progress),3000);
  const piece=w.piles.find(p=>p.item==='unfinished-recon-helmet')!;
  const tiles=w.tiles;w.tiles=tiles.map(()=>({terrain:'rock'}));
  const before=JSON.stringify(w),rng=w.rng,nextId=w.nextId;
  expect(cancelFlakWork(w,piece.id).ok).toBe(false);
  expect(JSON.stringify(w)).toBe(before);expect(w.rng).toBe(rng);expect(w.nextId).toBe(nextId);
  w.tiles=tiles;
  const prior=[amount(w,'plasteel'),amount(w,'advanced-component')];
  expect(cancelFlakWork(w,piece.id).ok).toBe(true);
  expect(w.piles.some(p=>p.id===piece.id)).toBe(false);
  expect(amount(w,'plasteel')).toBeGreaterThan(prior[0]!);
  expect(amount(w,'advanced-component')).toBeGreaterThanOrEqual(prior[1]!);
  expect(validateWorld(w)).toEqual([]);
});

test('full-head recon protection reaches eyes and jaw while preserving flak helmet and torso layers',()=>{
  const w=prepared(),pawn=w.pawns[0]!;
  const pile:MaterialPile={id:w.nextId++,item:'recon-helmet',kind:'apparel',quantity:1,owner:{type:'apparel',pawnId:pawn.id},apparel:newApparelState('recon-helmet')};
  const piece=armorPiece(pile),def=APPAREL['recon-helmet'];
  expect(def).toMatchObject({hitPoints:120,ratings:{sharp:.92,blunt:.4,heat:.46},moveOffset:0,coldInsulation:4,heatInsulation:2});
  for(const part of ['brain','left-eye','right-ear','nose','jaw'])expect(piece.coverage.parts).toContain(part);
  expect(piece.coverage.parts).not.toContain('torso');
  const bare={sharp:0,blunt:0,heat:0},hit={amount:12,penetration:.2,category:'sharp' as const,part:'left-eye' as const};
  expect(resolveArmor(hit,[piece],bare,()=>.5).wear).toHaveLength(1);
  expect(resolveArmor({...hit,part:'torso'},[piece],bare,()=>.5).wear).toHaveLength(0);
  expect(createDefaultApparelPolicyRegistry().apparelPolicies.every(p=>p.allowedItems.includes('recon-helmet'))).toBe(true);
  expect(createDefaultApparelPolicyRegistry(false).apparelPolicies.every(p=>!p.allowedItems.includes('recon-helmet'))).toBe(true);
});

test('wearing recon over flak removes the conflicting headgear through the physical equipment task',()=>{
  const w=prepared(),pawn=w.pawns[0]!;
  expect(apparelCompatible(APPAREL['flak-helmet'].coverage,APPAREL['recon-helmet'].coverage)).toBe(false);
  addMaterial(w,'apparel',1,{type:'ground',x:pawn.x,z:pawn.z},'flak-helmet');
  const flak=w.piles.at(-1)!;
  expect(applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:flak.id,action:'wear',queue:false})).toMatchObject({ok:true});
  advance(w,()=>flak.owner.type==='apparel',300);
  addMaterial(w,'apparel',1,{type:'ground',x:pawn.x,z:pawn.z},'recon-helmet');
  const recon=w.piles.at(-1)!;
  expect(applyCommand(w,{type:'order-equipment',pawnId:pawn.id,itemId:recon.id,action:'wear',queue:false})).toMatchObject({ok:true});
  advance(w,()=>recon.owner.type==='apparel',300);
  expect(flak.owner.type).toBe('ground');
  expect(w.piles.filter(p=>p.owner.type==='apparel'&&p.owner.pawnId===pawn.id&&['flak-helmet','recon-helmet'].includes(p.item)).map(p=>p.id)).toEqual([recon.id]);
  expect(validateWorld(w)).toEqual([]);
});

test('recon cargo and portrait keep their own silhouette and item identity',()=>{
  const w=prepared(),pawn=w.pawns[0]!;
  const recon:MaterialPile={id:w.nextId++,item:'recon-helmet',kind:'apparel',quantity:1,owner:{type:'apparel',pawnId:pawn.id},apparel:newApparelState('recon-helmet')};
  const flak:MaterialPile={...recon,id:w.nextId++,item:'flak-helmet',apparel:newApparelState('flak-helmet')};
  expect(Object.keys(APPAREL_CARGO)).toHaveLength(38); // V190 adds all five foxfur garments.
  expect(Object.keys(APPAREL_CARGO).filter(item=>item.startsWith('foxfur-'))).toHaveLength(5);
  expect(APPAREL_CARGO['recon-helmet']).not.toBe(APPAREL_CARGO['flak-helmet']);
  expect(foldedApparel('recon-helmet')).toHaveLength(3); // coque, rebord et visière fermée
  expect(apparelAppearance([recon])).toMatchObject({helmet:true,reconHelmet:true});
  const face=appearanceOf(pawn,w.seed);
  const portrait=(piece:MaterialPile)=>decodeURIComponent(portraitDataUrl(face,apparelAppearance([piece])).split(',')[1]!);
  expect(portrait(recon)).toContain('data-recon-helmet="true"');
  expect(portrait(recon)).not.toBe(portrait(flak));
  const geometry=pawnGeometry(),dye=geometry.getAttribute('dye'),bone=geometry.getAttribute('boneId');
  let vertices=0;
  for(let i=0;i<dye.count;i++)if(dye.getX(i)===RECON_HELMET_DYE){vertices++;expect(bone.getX(i)).toBe(1);}
  expect(vertices).toBe(202);
  expect(geometry.getAttribute('position').count).toBe(2442);
  geometry.dispose();
  w.piles.push(recon);
  const layer=new PawnLayer();layer.update(w,1,true);
  expect(layer.feedbackSource!.getAttribute('aEquipment').getZ(0)).toBe(4);
});
