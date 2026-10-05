import { selectBulletPart,validateUnarmoredBullet,type UnarmoredBullet } from './bullet-impact.ts';
import { medicalModel } from './body-model.ts';
import { HP_UNIT,injuryPartRules } from './injury-rules.ts';
import { addResolvedInjuryBatch,partMissing,remainingPartHealth,type ResolvedInjury } from './injury-state.ts';
import type { BodyPartId } from './body-definition.ts';
import type { ImpactProtection } from './apparel-protection.ts';
import type { MedicalRandom,MedicalRecord } from './injury-types.ts';

export interface BombImpactResult {record:MedicalRecord;fragments:number;selected:BodyPartId[];layers:ResolvedInjury[];preserved:boolean}
/** Natural body / ordinary propagation. Integer milli-HP distributes a third's
 * rounding remainder to earlier fragments; no hidden float injury or World RNG. */
export function resolveBombImpact(record:MedicalRecord,hit:UnarmoredBullet,random:MedicalRandom,protect?:ImpactProtection):BombImpactResult {
  const model=medicalModel(record),rules=injuryPartRules(model);validateUnarmoredBullet(hit,model);
  const result:BombImpactResult={record:structuredClone(record),fragments:0,selected:[],layers:[],preserved:false},next=result.record;
  if(record.death||!hit.damage)return result;
  const draw=()=>{const value=random();if(!Number.isFinite(value)||value<0||value>=1)throw new RangeError('Invalid bomb random');return value;};
  const count=hit.damage>=15?2+Math.floor(draw()*3):1,total=hit.damage*HP_UNIT,base=Math.floor(total/count),extra=total%count;
  result.fragments=count;
  for(let n=0;n<count&&!next.death;n++){
    const part=hit.part??selectBulletPart(next,draw,hit.height,hit.depth);if(!part||partMissing(next,part))continue;
    result.selected.push(part);
    const amount=(base+(n<extra?1:0))/HP_UNIT,guarded=protect?.(part,amount),damage=guarded?.amount??amount;
    if(!damage)continue;
    const kind=(id:BodyPartId)=>guarded?.converted?rules[id].solid?'crack' as const:rules[id].skin?'bruise' as const:'crush' as const:rules[id].solid?'crack' as const:'shredded' as const;
    const definition=model.byId[part],hp=remainingPartHealth(next,part);let severity=Math.round(damage*HP_UNIT);
    if(definition.depth==='outside'&&part!=='torso'&&severity>=hp){
      const chance=Math.min(1,(severity-hp)/(definition.hp*HP_UNIT*.7));
      if(draw()>=chance){severity=Math.max(0,hp-HP_UNIT);result.preserved=true;}
    }
    const layers:ResolvedInjury[]=[{part,kind:kind(part),severity}];
    if(definition.depth==='inside')for(let parent=definition.parent;parent!==null;parent=model.byId[parent].parent){
      const outer=model.byId[parent];
      if(remainingPartHealth(next,parent)>0&&model.coverage[model.index[parent]]>0)layers.push({part:parent,kind:kind(parent),severity:Math.max(HP_UNIT,severity)});
      if(outer.depth==='outside')break;
    }
    addResolvedInjuryBatch(next,layers,draw);result.layers.push(...layers);
  }
  return result;
}
