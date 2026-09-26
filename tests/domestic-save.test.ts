import {expect,test} from 'vitest';
import {readFileSync} from 'node:fs';
import {applyCommand,deserializeWorld,serializeWorld,stepWorld,validateWorld} from '../src/sim/index';
import {domesticColony} from './scenarios/domestic-colony';
import {actionProgress} from '../src/render/action-feedback';

test('V105 is strictly validated before neutral V106 migration',()=>{
 const raw=JSON.parse(readFileSync('public/test-saves/v105/economie.json','utf8'));
 const expected={...raw,schemaVersion:106,pawns:raw.pawns.map((p:any)=>({...p,priorities:{...p.priorities,handle:0}}))};
 expect(deserializeWorld(JSON.stringify(raw))).toEqual(expected);
 for(const corrupt of [()=>raw.pawns[0].priorities.handle=1,()=>{raw.pawns[0].skills.animals={level:8,xp:0,dailyXp:0,passion:0};}]){
  const before=JSON.stringify(raw);corrupt();expect(()=>deserializeWorld(JSON.stringify(raw))).toThrow();Object.assign(raw,JSON.parse(before));
 }
});

test('import refuses malformed wildlife and veterinary duration without throwing in validator',()=>{
 const w=domesticColony();
 for(const value of [{animals:{}},{animals:[null]},null]){
  const bad={...w,wildlife:value};expect(()=>validateWorld(bad)).not.toThrow();expect(validateWorld(bad).length).toBeGreaterThan(0);
 }
 w.pawns[0].priorities.handle=0;
 for(let i=0;i<250&&w.pawns[0].animalCare?.phase!=='treat';i++)stepWorld(w);
 expect(w.pawns[0].animalCare?.phase).toBe('treat');expect(validateWorld(w)).toEqual([]);
 for(const patch of [{duration:6001},{duration:0},{duration:undefined},{phase:'approach',progress:0,duration:200},{phase:'pickup',progress:0,duration:200}]){
  const bad=structuredClone(w);Object.assign(bad.pawns[0].animalCare!,patch);expect(validateWorld(bad).length).toBeGreaterThan(0);
 }
});

test('all physical taming stages survive cold reload, with exact food and progress bounds',()=>{
 const w=domesticColony(),p=w.pawns[0],a=w.wildlife!.animals[0];p.priorities.doctor=0;w.rng=1;
 expect(applyCommand(w,{type:'tame',animalId:a.id,enabled:true}).ok).toBe(true);
 const stages=new Set<number>();
 for(let i=0;i<400&&!a.domestic;i++){
  stepWorld(w);const t=p.animalHandling;if(!t||t.phase!=='interact'||stages.has(t.step))continue;
  stages.add(t.step);expect(validateWorld(w)).toEqual([]);expect(deserializeWorld(serializeWorld(w))).toEqual(w);
  const total=t.step===2||t.step===4?45:t.step===5?35:27;
  expect(actionProgress(w,p)?.total).toBe(total);
  const bad=structuredClone(w);bad.pawns[0].animalHandling!.progress=total;expect(validateWorld(bad).length).toBeGreaterThan(0);
 }
 expect([...stages]).toEqual([0,1,2,3,4,5]);expect(a.domestic?.tameness).toBe(5);
});
