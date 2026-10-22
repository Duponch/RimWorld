import {deconstructionCamp} from './deconstruction.ts';
import {applyCommand} from '../../src/sim/engine.ts';
import {addMaterial,addGroundMaterial,refreshStock} from '../../src/sim/materials.ts';
import {CLOTHING_RESEARCH_COST} from '../../src/sim/research.ts';
import type {Command,Structure} from '../../src/sim/types.ts';

export const APPAREL_RESERVES_PREPARATION455='Declared legacy control map32² at its original tick0; two original colonists, cleared terrain, completed manual wooden tailor bench, Complex Clothing knowledge, 180 finite cloth, one normal shirt at50/100HP already worn, initial hunger/rest at100 and Crafting8. The maintained policy is prepared with normal minimum quality. No finished new garment, author work, quality draw, replacement or material acquisition is supplied. Subsequent work, interruption, output, storage and policy changes are actually played.';

export function apparelReserveWorkshop455(){
 const w=deconstructionCamp(2,32),author=w.pawns[0]!,wearer=w.pawns[1]!;
 const command=(c:Command)=>{const result=applyCommand(w,c);if(!result.ok)throw Error(result.reason);};
 author.name='Artisane déclarée';wearer.name='Habitant déclaré';
 for(const [i,p]of w.pawns.entries()){
  for(const work of Object.keys(p.priorities)as(keyof typeof p.priorities)[])p.priorities[work]=0;
  p.priorities.basic=3;p.priorities.craft=i===0?1:0;p.schedule.fill('work');p.apparelAutomation=false;
 }
 author.skills.crafting={level:8,xp:0,dailyXp:0,passion:1};
 w.research={project:null,points:CLOTHING_RESEARCH_COST,completedAt:0};
 const station:Structure={id:w.nextId++,kind:'tailor-bench',x:10,z:10,orientation:0,footprint:'standard',material:'wood',bills:[]};w.structures.push(station);
 addGroundMaterial(w,'textile',180,{x:8,z:8},'cloth');
 addMaterial(w,'apparel',1,{type:'apparel',pawnId:wearer.id},'cloth-shirt');
 const old=w.piles.find(p=>p.item==='cloth-shirt'&&p.owner.type==='apparel'&&p.owner.pawnId===wearer.id);
 if(!old?.apparel)throw Error('Declared original worn shirt missing');old.apparel.hitPoints=50;old.apparel.quality='normal';
 const policyIndex=w.apparelPolicies?.findIndex(p=>p.id===2)??-1;if(policyIndex<0)throw Error('Maintained policy missing');
 w.apparelPolicies![policyIndex]={...w.apparelPolicies![policyIndex]!,minQuality:'normal'};
 command({type:'apparel-policy-assign',pawnId:wearer.id,policyId:2,automatic:true});
 for(let x=12;x<18;x++)command({type:'stockpile',enabled:true,x,z:10,filters:{wood:false,food:false,apparel:true,unfinished:true}});
 command({type:'bill-add',structureId:station.id,recipe:'shirt'});const bill=station.bills![0]!;
 command({type:'bill-update',structureId:station.id,billId:bill.id,settings:{...bill,mode:'until',target:1,apparelCount:{hpMin:51,hpMax:100,qualityMin:'normal',qualityMax:'legendary',includeEquipped:false}}});
 refreshStock(w);return {w,author,wearer,station,bill,old,preparation:APPAREL_RESERVES_PREPARATION455};
}
