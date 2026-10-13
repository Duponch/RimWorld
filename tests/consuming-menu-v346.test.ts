import {expect,test} from 'vitest';
import {medicalCamp} from './scenarios/health';
import {addMaterial} from '../src/sim/materials';
import {applyCommand,stepWorld} from '../src/sim/engine';
import {queryOrderOptions} from '../src/sim/player-orders';
import {contextConsumesFood} from '../src/ui/order-menu';
import {draftLabel} from '../src/ui/drafting-controls';

function camp(){const w=medicalCamp(2),p=w.pawns[0]!;Object.assign(p,{x:5,z:5,hunger:30,background:{childhood:'quiet-child',adulthood:'medic'}});return {w,p,ids:new Set([p.id]),cell:{x:8,z:5}};}

test('food context routes a single pacifist to explicit choices, preserving actor and multi-selection targets',()=>{
 const {w,p,ids,cell}=camp();addMaterial(w,'food',20,{type:'ground',...cell},'rice');
 expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
 const before=structuredClone(w);expect(contextConsumesFood(w,ids,cell)).toBe(true);
 expect(contextConsumesFood(w,new Set([p.id,w.pawns[1]!.id]),cell)).toBe(false);
 expect(contextConsumesFood(w,ids,cell,w.pawns[1]!.id)).toBe(false);
 expect(contextConsumesFood(w,ids,{x:9,z:5})).toBe(false);expect(w).toEqual(before);
});

test('inedible hay and food carried by a person keep the ordinary ground routing',()=>{
 const {w,p,ids,cell}=camp();addMaterial(w,'food',20,{type:'ground',...cell},'hay');
 expect(contextConsumesFood(w,ids,cell)).toBe(false);
 w.piles=w.piles.filter(q=>q.item!=='hay');addMaterial(w,'food',1,{type:'pawn',pawnId:p.id},'simple-meal');
 expect(contextConsumesFood(w,ids,cell)).toBe(false);
});

test('civil menu keeps the source identity and displays dietary warnings without mutating policy or accepting a queue',()=>{
 const {w,p,cell}=camp();addMaterial(w,'food',20,{type:'ground',...cell},'rice');const id=w.piles.find(q=>q.item==='rice')!.id;
 p.foodPolicyId=4;const before=structuredClone(w);
 const option=queryOrderOptions(w,p.id,cell).find(o=>o.consumePileId===id);
 expect(option).toMatchObject({enabled:true,consumePileId:id});expect(option!.label).toContain('Consommer');expect(option!.warnings!.length).toBeGreaterThan(0);
 expect(queryOrderOptions(w,p.id,cell,true).find(o=>o.consumePileId===id)).toMatchObject({enabled:false,reason:expect.stringMatching(/file/)});
 expect(w).toEqual(before);
});

test('draft inspector shows a real meal and returns to waiting after the existing stop control',()=>{
 const {w,p,cell}=camp();addMaterial(w,'food',1,{type:'ground',...cell},'survival-meal');const id=w.piles.find(q=>q.item==='survival-meal')!.id;
 expect(applyCommand(w,{type:'draft',pawnIds:[p.id],enabled:true}).ok).toBe(true);
 expect(applyCommand(w,{type:'order-consume',pawnId:p.id,pileId:id,queue:false}).ok).toBe(true);expect(draftLabel(p)).toContain('rejoint l’aliment');
 for(let n=0;n<150&&!(p.need?.kind==='eat'&&p.need.phase==='ingest');n++)stepWorld(w);
 expect(p.need).toMatchObject({kind:'eat',forced:true,phase:'ingest'});expect(draftLabel(p)).toContain('mange');
 expect(applyCommand(w,{type:'draft-stop',pawnIds:[p.id]}).ok).toBe(true);expect(p.need).toBeNull();expect(draftLabel(p)).toContain('attend les ordres');
});
