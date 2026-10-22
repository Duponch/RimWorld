import type {MoodThought} from './mood.ts';

export type ThermalMoodStage460=-1|0|1|2|3;
export interface ThermalMoodRange460 {readonly min:number;readonly max:number}

/** Core situation thresholds. No exposure accumulation, disease or random
 * draw is involved; an exact comfortable boundary has no thermal thought. */
export function thermalMoodStage460(excess:number):ThermalMoodStage460 {
  return excess<=0?-1:excess<10?0:excess<20?1:excess<30?2:3;
}

const coldLabels=['Un peu froid','Froid','Froid mordant','Froid extrême'] as const;
const hotLabels=['Un peu chaud','Chaud','Chaleur étouffante','Chaleur extrême'] as const;
const offsets=[-4,-8,-12,-16] as const;
const cold=coldLabels.map((label,stage):MoodThought=>Object.freeze({
  id:'environment-cold',label,offset:offsets[stage]!,kind:'situation',
  description:'La température actuelle est sous la limite confortable, après isolation des vêtements réellement portés. Un lieu plus chaud ou une tenue adaptée peut supprimer cette sensation ; elle est distincte de l’hypothermie.',
}));
const hot=hotLabels.map((label,stage):MoodThought=>Object.freeze({
  id:'environment-hot',label,offset:offsets[stage]!,kind:'situation',
  description:'La température actuelle dépasse la limite confortable, après isolation des vêtements réellement portés. Un lieu plus frais ou une tenue adaptée peut supprimer cette sensation ; elle est distincte du coup de chaleur.',
}));
const none:readonly MoodThought[]=Object.freeze([]);
const coldStages=cold.map(thought=>Object.freeze([thought]));
const hotStages=hot.map(thought=>Object.freeze([thought]));

/** Pure read from the actual owner's air and effective comfortable range.
 * The two native workers remain independent, including an inverted range. */
export function thermalMoodThoughts460(ambientTemperature:number,range:ThermalMoodRange460):readonly MoodThought[] {
  const coldStage=thermalMoodStage460(range.min-ambientTemperature),hotStage=thermalMoodStage460(ambientTemperature-range.max);
  if(coldStage<0)return hotStage<0?none:hotStages[hotStage]!;
  if(hotStage<0)return coldStages[coldStage]!;
  return [cold[coldStage]!,hot[hotStage]!];
}
