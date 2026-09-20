import type { BodyPartId } from './body-definition.ts';
import { medicalModel,modelHasPart } from './body-model.ts';
import type { ImpactProtection } from './apparel-protection.ts';
import { HP_UNIT,injuryPartRules,isWithinPart,type InjuryKind } from './injury-rules.ts';
import { addResolvedInjuryBatch,partMissing,remainingPartHealth,type ResolvedInjury } from './injury-state.ts';
import type { MedicalRecord } from './injury-types.ts';
import { curve,type MeleeDamage } from './melee-statistics.ts';

export interface MeleeImpact { damage:number;kind:MeleeDamage;part?:BodyPartId }
export interface MeleeImpactResult {record:MedicalRecord;selected:BodyPartId|null;layers:ResolvedInjury[];stun:boolean}
/** Unarmored natural adult. Independent resolution, explicit random stream;
 * actor, XP, cadence and attack commands belong to the combat controller. */
export function resolveUnarmoredMelee(record:MedicalRecord,hit:MeleeImpact,random:()=>number,protect?:ImpactProtection):MeleeImpactResult {
  const model=medicalModel(record),{parts:HUMAN_BODY,byId:BODY_PARTS,index:BODY_INDEX,coverage:BODY_COVERAGE}=model,PART_INJURY_RULES=injuryPartRules(model);
  if(!Number.isFinite(hit.damage)||hit.damage<0||hit.damage>1000000||!['blunt','poke','bite','cut','stab'].includes(hit.kind)||hit.part!==undefined&&(!modelHasPart(model,hit.part)||BODY_PARTS[hit.part].conceptual||BODY_PARTS[hit.part].depth!=='outside'))throw new RangeError('Invalid melee impact');
  const next=structuredClone(record),result:MeleeImpactResult={record:next,selected:null,layers:[],stun:false};
  if(record.death||!hit.damage||hit.part&&partMissing(record,hit.part))return result;
  const draw=()=>{const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw new RangeError('Invalid impact random');return n;};
  const select=(predicate:(id:BodyPartId)=>boolean):BodyPartId|null=>{
    const candidates=HUMAN_BODY.filter(p=>!p.conceptual&&!partMissing(next,p.id)&&predicate(p.id)&&BODY_COVERAGE[BODY_INDEX[p.id]]>0&&!(hit.kind==='blunt'&&p.id.endsWith('-eye')));
    const total=candidates.reduce((n,p)=>n+BODY_COVERAGE[BODY_INDEX[p.id]],0);if(!total)return null;
    let roll=draw()*total;for(const p of candidates){roll-=BODY_COVERAGE[BODY_INDEX[p.id]];if(roll<0)return p.id;}return candidates.at(-1)!.id;
  };
  let part=hit.part??select(id=>BODY_PARTS[id].depth==='outside');if(!part)return result;
  if((hit.kind==='poke'||hit.kind==='stab')&&draw()<(hit.kind==='stab'?.6:.4))part=select(id=>BODY_PARTS[id].depth==='inside'&&isWithinPart(id,part!,model))??part;
  result.selected=part;
  const guarded=protect?.(part,hit.damage),amount=guarded?.amount??hit.damage;if(!amount)return result;
  const kind=(id:BodyPartId):InjuryKind=>PART_INJURY_RULES[id].solid?'crack':!guarded?.converted&&(hit.kind==='bite'||hit.kind==='cut'||hit.kind==='stab')?hit.kind:PART_INJURY_RULES[id].skin?'bruise':'crush';
  const add=(id:BodyPartId,damage:number)=>{
    const severity=Math.round(damage*HP_UNIT),hp=remainingPartHealth(next,id)/HP_UNIT;
    if(severity>0){const layer={part:id,kind:kind(id),severity};result.layers.push(layer);delete next.death;addResolvedInjuryBatch(next,[layer],draw);}
    return Math.min(damage,hp);
  };
  const preserve=(id:BodyPartId,damage:number,min:number,max:number)=>{
    const hp=remainingPartHealth(next,id)/HP_UNIT;
    if(id==='torso'||BODY_PARTS[id].depth==='inside'||damage<hp)return damage;
    const chance=Math.max(0,Math.min(1,((damage-hp)/BODY_PARTS[id].hp-min)/(max-min)));
    return draw()<chance?damage:Math.max(0,hp-1);
  };
  if(hit.kind==='cut') {
    // Core cuts may spread across neighbouring anatomical parts, not across
    // nearby pawns. Pick neighbours before filtering conceptual/zero coverage.
    const extra=curve(draw(),[[0,0],[.6,1],[.9,2],[1,3]]),count=Math.floor(extra)+(draw()<extra-Math.floor(extra)?1:0);
    const parent=BODY_PARTS[part].parent,candidates=HUMAN_BODY.filter(p=>p.id!==part&&(p.parent===part||p.id===parent||parent&&BODY_PARTS[parent].parent&&p.parent===parent)).map(p=>p.id);
    const neighbours:BodyPartId[]=[];
    for(let n=0;n<count&&candidates.length;n++){
      const index=Math.floor(draw()*candidates.length),id=candidates.splice(index,1)[0]!;
      if(!BODY_PARTS[id].conceptual&&BODY_COVERAGE[BODY_INDEX[id]]>0)neighbours.push(id);
    }
    const targets=[...neighbours,part],spread=amount*2.4/(targets.length+1.4),damage=count===0?preserve(part,spread,0,.1):spread;
    for(const id of targets)if(!partMissing(next,id))add(id,damage);
  } else if(hit.kind==='blunt') {
    const inner=draw()<.4,converted=inner?.1+draw()*.1:0;
    let remainder=amount*(1-converted);
    // Blunt uses excess propagation, not the generic outside-preservation roll.
    for(;;){remainder-=add(part,remainder);if(!partMissing(next,part)||remainder<=1||!BODY_PARTS[part].parent)break;part=BODY_PARTS[part].parent!;}
    if(inner&&!PART_INJURY_RULES[part].solid&&BODY_PARTS[part].depth==='outside') {
      const bone=select(id=>BODY_PARTS[id].parent===part&&BODY_PARTS[id].depth==='inside'&&PART_INJURY_RULES[id].solid);
      if(bone)add(bone,amount*(converted+.2+draw()*.15));
    }
    if(!next.death) {
      const head=isWithinPart(part,'neck',model);
      if(part==='torso'||head)result.stun=draw()<curve(amount/BODY_PARTS.torso.hp,head?[[.04,.2],[.5,1]]:[[.4,0],[.9,.15]]);
    }
  } else {
    const damage=preserve(part,amount,hit.kind==='bite'?0:.4,hit.kind==='bite'?.1:1);
    const inner=BODY_PARTS[part].depth==='inside';
    for(let id:BodyPartId|null=part;id!==null;id=BODY_PARTS[id].parent){const outside=BODY_PARTS[id].depth==='outside';add(id,damage*(inner?(outside?.75:.4):1));if(outside)break;}
  }
  return result;
}
