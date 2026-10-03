import { expect,test } from '@playwright/test';

import { meleePursuitCamp } from '../scenarios/melee-pursuit-v197.ts';
import { serializeWorld,validateWorld } from '../../src/sim/serialization.ts';
import { writeTestFileSync,testOutputPath } from '../test-output.ts';
import { expectWorld,observeErrors,panel,pause,saveKey,world } from './helpers.ts';
import { perform,revealCells } from './player-actions.ts';

type RenderedActor={x:number;z:number;walking:number;pose:number;alpha:number;travelStart:number;travelEnd:number;travelMode:number;motionEnd:number|null;cellX:number;cellZ:number};
type Frame={phase:number;tick:number;now:number;actor:RenderedActor;target:RenderedActor;attackCore:number|null};
type Capture={samples:Frame[];overflow:boolean;firstStrike:Frame|null};

// Observe attributes consumed by the native body shader, after its real frame.
// World.motion is only a contact diagnostic: at 6× the bridge can skip whole
// authoritative edges, so continuity must use GPU progress and the frame clock.
const probe=`window.__meleePursuit={active:false,phase:0,samples:[],overflow:false,firstStrike:null};
const pursuitFrameV197=ColonyRenderer.prototype.frame;
ColonyRenderer.prototype.frame=function(now){const result=pursuitFrameV197.call(this,now),b=window.__meleePursuit;
if(!b.active||this.preparing||!this.world)return result;
const g=this.pawns.pawnMesh.geometry,f=g.getAttribute('aFrom'),t=g.getAttribute('aTo'),travel=g.getAttribute('aTravel'),motion=g.getAttribute('aMotion');
const read=id=>{const i=this.world.pawns.findIndex(p=>p.id===id);if(i<0)return null;const p=this.world.pawns[i],start=travel.getX(i),end=travel.getY(i),alpha=end>start?Math.min(1,Math.max(0,(this.pawns.travelTime.value-start)/(end-start))):this.pawns.blend.value;
return {x:f.getX(i)+(t.getX(i)-f.getX(i))*alpha,z:f.getZ(i)+(t.getZ(i)-f.getZ(i))*alpha,walking:motion.getX(i),pose:motion.getZ(i),alpha,travelStart:start,travelEnd:end,travelMode:travel.getW(i),motionEnd:p.motion?.end??null,cellX:p.x,cellZ:p.z};};
const actor=read(b.actorId),target=read(b.targetId);if(!actor||!target)return result;
const pawn=this.world.pawns.find(p=>p.id===b.actorId),attack=pawn.lastAttack?.targetId===b.targetId?pawn.lastAttack.atCore:null;
const sample={phase:b.phase,tick:this.timeline.tick,now,actor,target,attackCore:attack};
if(b.samples.length<4000)b.samples.push(sample);else b.overflow=true;
if(!b.firstStrike&&attack!==null&&this.timeline.tick>=attack/10&&actor.pose===8)b.firstStrike=sample;
return result;};`;

function continuity(capture:Capture) {
  const strikeTick=capture.firstStrike?.attackCore!==null&&capture.firstStrike?.attackCore!==undefined?capture.firstStrike.attackCore/10:Infinity;
  const before=capture.samples.filter(s=>s.tick<strikeTick);
  let maximumIdleClockGap=0,idleStart:number|undefined,phase=-1,moved=false,clockProgress=0,movingIntervals=0;
  for(let i=1;i<before.length;i++) {
    const previous=before[i-1]!,current=before[i]!;
    if(previous.phase!==current.phase||phase!==current.phase){phase=current.phase;idleStart=undefined;moved=false;}
    if(previous.phase!==current.phase)continue;
    const dt=current.tick-previous.tick;
    if(dt<=0)continue;
    const distance=Math.hypot(current.actor.x-previous.actor.x,current.actor.z-previous.actor.z);
    if(distance>.001){moved=true;movingIntervals++;idleStart=undefined;}
    // Ignore startup before the first translation in each phase, then include
    // the whole pursuit through the last pre-strike frame. The small clock
    // budget covers ordinary contact scheduling without hiding a final stall.
    if(moved) {
      clockProgress+=dt;
      if(distance<=.001){idleStart??=previous.tick;maximumIdleClockGap=Math.max(maximumIdleClockGap,current.tick-idleStart);}
    }else idleStart=undefined;
  }
  return {maximumIdleClockGap,clockProgress,movingIntervals,preStrikeFrames:before.length};
}

test('V197 native unarmed raid pursuit stays visibly continuous before contact at 1×/6×, including save/resume',async({playwright})=>{
  test.setTimeout(89_000);
  const browser=await playwright.chromium.launch({channel:'chromium',args:[]});
  const page=await browser.newPage({baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000}});
  page.setDefaultTimeout(12_000);
  const errors=observeErrors(page),reports:unknown[]=[];
  let currentSpeed=0;
  const report=()=>writeTestFileSync('artifacts/melee-pursuit-v197-native.json',JSON.stringify({prepared:true,backend:'native WebGPU',idleClockBudget:1.25,firstAttemptBudget:60,reports,errors},null,2)+'\n');
  try {
    await page.route('**/src/main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:probe+await response.text()});});
    await page.goto('/?scenario=camp&e2e&size=32');
    await expect(page.locator('#loading')).toHaveCount(0);await pause(page);
    expect(await page.evaluate(()=>window.__lisiere.backend)).toBe('WebGPU');
    await panel(page,'menu');await page.locator('#save').click();await page.keyboard.press('Escape');
    for(const speed of [1,6]) {
      currentSpeed=speed;
      const {w:initial,target,chaser}=meleePursuitCamp('raid');
      await page.evaluate(({key,data})=>localStorage.setItem(key,data),{key:saveKey,data:serializeWorld(initial)});
      await panel(page,'menu');await page.locator('#load').click();await expectWorld(page,initial);await page.keyboard.press('Escape');
      await revealCells(page,[target,chaser]);
      // Change the prepared destination through the real pawn selection and
      // ground right-click, hence through the normal UI/worker command path.
      await perform(page,{reason:'Fuir le poursuivant à mains nues.',command:{type:'draft-move',pawnIds:[target.id],target:{x:79,z:48},queue:false}},{value:0});
      await expect.poll(()=>page.evaluate(id=>window.__lisiere.world.pawns.find(p=>p.id===id)?.draft?.target,target.id)).toEqual({x:79,z:48});
      await page.evaluate(({actorId,targetId})=>Object.assign((window as any).__meleePursuit,{active:true,phase:0,actorId,targetId,samples:[],overflow:false,firstStrike:null}),{actorId:chaser.id,targetId:target.id});
      await page.locator(`[data-speed="${speed}"]`).click();
      await page.waitForFunction(tick=>{const b=(window as any).__meleePursuit,s=b.samples.at(-1);return s?.tick>=tick&&s.actor.x>17;},initial.tick+6,{polling:'raf',timeout:8_000});
      await pause(page);
      const checkpoint=await world(page);
      writeTestFileSync(`artifacts/melee-pursuit-v197-${speed}x-travelling.json`,serializeWorld(checkpoint));
      await page.evaluate(()=>(window as any).__meleePursuit.active=false);
      await panel(page,'menu');await page.locator('#save').click();await page.locator('#load').click();await expectWorld(page,checkpoint);await page.keyboard.press('Escape');
      await page.evaluate(()=>Object.assign((window as any).__meleePursuit,{phase:1,active:true}));
      await page.locator(`[data-speed="${speed}"]`).click();
      // Pause only once the presented body has reached the confirmed strike.
      // A worker receipt can precede the visible contact and is not this oracle.
      await page.waitForFunction(()=>(window as any).__meleePursuit.firstStrike!==null,undefined,{polling:'raf',timeout:12_000});
      await pause(page);
      const fought=await world(page);
      const captured:Capture=await page.evaluate(()=>{const b=(window as any).__meleePursuit;b.active=false;return {samples:b.samples,overflow:b.overflow,firstStrike:b.firstStrike};});
      const metrics=continuity(captured),strike=captured.firstStrike;
      writeTestFileSync(`artifacts/melee-pursuit-v197-${speed}x-contact.json`,serializeWorld(fought));
      reports.push({speed,checkpointTick:checkpoint.tick,contactWorldTick:fought.tick,metrics,captured});
      report(); // Preserve the trace and checkpoints before any gameplay assertion.
      expect(validateWorld(checkpoint)).toEqual([]);expect(validateWorld(fought)).toEqual([]);
      const savedChaser=checkpoint.pawns.find(p=>p.id===chaser.id)!;
      expect(savedChaser.faction).toBe('outlaws');expect(savedChaser.raid?.exiting).toBe(false);
      expect(checkpoint.piles.some(p=>p.kind==='weapon'&&p.owner.type==='equipment'&&p.owner.pawnId===chaser.id)).toBe(false);
      expect(savedChaser.lastAttack).toBeUndefined();expect(savedChaser.motion).toBeDefined();
      expect(captured.overflow).toBe(false);expect(strike).not.toBeNull();
      expect(strike!.attackCore!/10-initial.tick,'First physical attempt must be prompt on this open runway.').toBeLessThan(60);
      expect(strike!.actor.x-chaser.x,'The attacker must actually traverse the runway on screen.').toBeGreaterThan(7);
      expect(strike!.target.x-target.x,'The injured target must actually retreat on screen.').toBeGreaterThan(2);
      expect(metrics.clockProgress,'Continuity must cover a substantial pre-contact pursuit.').toBeGreaterThan(8);
      expect(metrics.movingIntervals).toBeGreaterThan(10);
      expect(metrics.maximumIdleClockGap,'A rendered idle body while the scene clock advances must not hide a scheduler stall.').toBeLessThanOrEqual(1.25);
      expect(captured.samples.some(s=>s.actor.walking>0&&s.actor.pose===0)).toBe(true);
      expect(captured.samples.some(s=>s.target.walking>0&&s.target.pose===0)).toBe(true);
      expect(strike!.actor.pose).toBe(8);expect(strike!.actor.motionEnd).not.toBeNull();
      expect(strike!.actor.motionEnd!,'The attacker must finish its committed physical edge before striking.').toBeLessThanOrEqual(strike!.attackCore!/10);
      // The victim can commit its next edge later in the same simulation tick;
      // its logical destination is therefore not the historical contact cell.
      expect(Math.hypot(strike!.actor.x-strike!.target.x,strike!.actor.z-strike!.target.z),'The visible strike must occur at close range.').toBeLessThanOrEqual(2.5);
      // aTravel.w=2 is the existing local stance/heading approach, not a map
      // edge. It may still settle while striking; the committed edge must end.
      if(strike!.actor.travelMode<=1&&strike!.actor.travelEnd>strike!.actor.travelStart){expect(strike!.actor.alpha).toBe(1);expect(strike!.actor.walking).toBe(0);}
      await page.screenshot({path:testOutputPath(`artifacts/melee-pursuit-v197-${speed}x.png`)});
    }
    await expect(page.locator('#fps-counter')).toBeVisible();expect(errors).toEqual([]);
  }catch(error) {
    const captured=await page.evaluate(()=>{const b=(window as any).__meleePursuit;return b?{samples:b.samples,overflow:b.overflow,firstStrike:b.firstStrike}:null;}).catch(()=>null);
    const checkpoint=await world(page).catch(()=>null);
    if(checkpoint)writeTestFileSync(`artifacts/melee-pursuit-v197-${currentSpeed}x-failed-checkpoint.json`,serializeWorld(checkpoint));
    reports.push({failedSpeed:currentSpeed,error:String(error),captured});report();throw error;
  }finally {report();await browser.close();}
});
