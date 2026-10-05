import {afterEach,expect,test,vi} from 'vitest';
import {SnapshotDecoder,SnapshotEncoder,type SnapshotMessage} from '../src/bridge/snapshots.ts';
import {serializeWorld,deserializeWorld,validateWorld} from '../src/sim/serialization.ts';
import {applyCommand,stepWorld} from '../src/sim/engine.ts';
import {scytherCamp} from './scenarios/scyther-v213.ts';
import {createMechaMedicalRecord,commitMechanoidImpact} from '../src/sim/mechanoid-health.ts';
import {addResolvedInjury} from '../src/sim/injury-state.ts';
import {advanceMechanoidCorpses} from '../src/sim/mechanoid-corpse.ts';
import {prepareGroupScenario} from '../src/sim/group-scenario.ts';
import {mechanoidRangedProfile} from '../src/sim/mechanoid-ranged-profile.ts';
import {createRaidUI} from '../src/ui/raids.ts';
import {updateMechanoidInspector} from '../src/ui/mechanoid-inspection.ts';
import {itemInformation} from '../src/ui/item-information.ts';
import {tacticalAttackPolicy} from '../src/ui/order-menu.ts';
import type {Mechanoid} from '../src/sim/mechanoid-state.ts';
import type {World} from '../src/sim/types.ts';
import {SCHEMA_VERSION} from '../src/sim/types.ts';

function adopt(decoder:SnapshotDecoder,packet:SnapshotMessage):World {
  const result=decoder.adopt(packet);if(result.status!=='applied')throw Error(JSON.stringify(result));return result.world;
}
const noDraw=()=>{throw Error('Solid mechanical damage must not draw a biological result.');};

test('both new corpses use their original identity/body and reject mismatched anatomy atomically in checkpoints and deltas',()=>{
  for(const kind of ['lancer','pikeman'] as const)for(const checkpoint of [false,true]){
    const {world,actor}=scytherCamp();actor.mechKind=kind;expect(validateWorld(world)).toEqual([]);
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(confirmed);
    const record=createMechaMedicalRecord(world.tick,kind);addResolvedInjury(record,`${kind}-reactor`,'crack',100000,noDraw);
    expect(commitMechanoidImpact(world,actor,record,{rng:world.rng},world.tick*10)).toBe(true);advanceMechanoidCorpses(world);
    expect(validateWorld(world)).toEqual([]);const corpse=world.piles.find(p=>p.id===actor.id)!;expect(corpse.item).toBe(`${kind}-corpse`);
    const good=structuredClone(encoder.encode(world,0,0,checkpoint)),bad=structuredClone(good);
    const pile=bad.kind==='checkpoint'?bad.world.piles.find(p=>p.id===actor.id)!:bad.piles!.upserted.find(p=>p.id===actor.id)!;
    pile.mechCorpse!.health.body='scyther';expect(decoder.adopt(bad).status).toBe('resync');expect(confirmed).toEqual(frozen);
    expect(adopt(decoder,good)).toEqual(world);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
    const info=itemInformation(corpse);expect(info.rows.some(r=>r.label==='Nutrition')).toBe(false);expect(info.rows.find(r=>r.label==='Points de vie')!.value).toBe('100 / 100');
    expect(tacticalAttackPolicy(world,new Set([actor.id]),world.pawns[0]!.id,false).options).toEqual([]);
  }
});

test('196 keeps Scyther legal but refuses ranged bodies, actors and own future corpse filters without adopting a revision',()=>{
  const {world}=scytherCamp();if(world.raids?.mechanoid)delete world.raids.mechanoid.ranged;
  (world as {schemaVersion:number}).schemaVersion=196;
  // The codec validates historical196 before its number-only migration. The
  // transport below must still receive the original historical checkpoint.
  expect(deserializeWorld(JSON.stringify(world))).toEqual({...world,schemaVersion:SCHEMA_VERSION});
  const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(confirmed),good=structuredClone(encoder.encode(world,0,0,true));
  for(const kind of ['lancer','pikeman'] as const){
    for(const corrupt of [
      (packet:SnapshotMessage)=>{packet.world.mechanoids![0]!.mechKind=kind;},
      (packet:SnapshotMessage)=>{packet.world.pawns[0]!.health=createMechaMedicalRecord(world.tick,kind);},
      (packet:SnapshotMessage)=>{packet.world.stockpiles.push({id:packet.world.nextId++,x:3,z:3,priority:1,capacity:75,filters:{wood:false,food:false,'mech-corpse':true},items:{[`${kind}-corpse`]:false}});},
    ]){const bad=structuredClone(good);corrupt(bad);expect(decoder.adopt(bad).status).toBe('resync');expect(confirmed).toEqual(frozen);}
  }
  expect(adopt(decoder,good)).toEqual(world);
});

test('historical cooldown cannot alias any collective member or item after its real physical departure',()=>{
  const world=prepareGroupScenario();expect(applyCommand(world,{type:'planet-adopt'}).ok).toBe(true);
  const foods=world.piles.filter(p=>p.item==='survival-meal');
  expect(applyCommand(world,{type:'group-start',memberIds:world.pawns.slice(0,2).map(p=>p.id),destination:world.planet!.civilianTile,sources:[{pileId:foods[0]!.id,quantity:4}]}).ok).toBe(true);
  for(let i=0;i<800&&!(world.group&&'members' in world.group);i++)stepWorld(world);
  const group=world.group;if(!group||!('members' in group))throw Error('Real collective departure did not finish.');
  const core=world.tick*10,actor:Mechanoid={id:world.nextId++,mechKind:'lancer',x:1,z:1,state:'idle',heading:0,path:[],moveCooldown:0,planCooldown:0,
    ranged:{order:null,stance:{phase:'cooldown',targetKey:`pawn:${group.members[0]!.id}`,startedAtCore:core,lastAdvancedAtCore:core,remainingCore:162}}};
  world.mechanoids=[actor];expect(validateWorld(world)).toEqual([]);expect(deserializeWorld(serializeWorld(world))).toEqual(world);
  for(const checkpoint of [false,true]){
    const encoder=new SnapshotEncoder(),decoder=new SnapshotDecoder(),confirmed=adopt(decoder,structuredClone(encoder.encode(world,0,0))),frozen=structuredClone(confirmed),good=structuredClone(encoder.encode(world,0,0,checkpoint));
    for(const owner of [...group.members,...group.items]){
      const bad=structuredClone(good);bad.world.mechanoids![0]!.ranged!.stance!.targetKey=`mech:${owner.id}`;
      const forged=structuredClone(world);forged.mechanoids![0]!.ranged!.stance!.targetKey=`mech:${owner.id}`;
      expect(validateWorld(forged)).toContain('Mechanical ranged history aliases another owner.');
      expect(()=>serializeWorld(forged)).toThrow('Mechanical ranged history aliases another owner.');
      expect(decoder.adopt(bad)).toMatchObject({status:'resync',reason:'Référence ou phase de tir mécanique invalide.'});expect(confirmed).toEqual(frozen);
    }
    expect(adopt(decoder,good)).toEqual(world);
  }
});

/** Small DOM double for confirmed text, keyboard targets and request lifetime.
 * Native geometry/Tab delivery is checked in the composed browser scene. */
class NodeFixture {
  children:NodeFixture[]=[];parentElement:NodeFixture|null=null;dataset:Record<string,string>={};attributes=new Map<string,string>();
  hidden=false;disabled=false;tabIndex=-1;className='';id='';title='';open=false;onclick:(()=>void)|null=null;private text='';
  constructor(readonly tag='div'){}
  classList={toggle:(name:string,on:boolean)=>{const classes=new Set(this.className.split(' ').filter(Boolean));if(on)classes.add(name);else classes.delete(name);this.className=[...classes].join(' ');}};
  set textContent(text:string){this.text=text;this.children=[];}get textContent():string{return this.text+this.children.map(c=>c.textContent).join(' ');}
  set innerHTML(_html:string){throw Error('Snapshot strings must remain literal.');}
  append(...nodes:NodeFixture[]){for(const node of nodes){node.remove();node.parentElement=this;this.children.push(node);}}
  prepend(node:NodeFixture){node.remove();node.parentElement=this;this.children.unshift(node);}
  remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(c=>c!==this);this.parentElement=null;}
  close(){this.open=false;}showModal(){this.open=true;}
  setAttribute(key:string,value:string){this.attributes.set(key,value);}hasAttribute(key:string){return this.attributes.has(key);}removeAttribute(key:string){this.attributes.delete(key);}
  querySelector<T=NodeFixture>(selector:string):T|null{return this.querySelectorAll<T>(selector)[0]??null;}
  querySelectorAll<T=NodeFixture>(selector:string):T[]{
    const matches=(n:NodeFixture)=>{const data=/^\[data-([a-z-]+)(?:="([^"]+)")?\]$/.exec(selector);return data?Object.hasOwn(n.dataset,data[1]!.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase()))&&(data[2]===undefined||n.dataset[data[1]!.replace(/-([a-z])/g,(_,c:string)=>c.toUpperCase())]===data[2]):n.tag===selector;};
    return this.children.flatMap(c=>[...(matches(c)?[c as T]:[]),...c.querySelectorAll<T>(selector)]);
  }
}
function documentFixture(){const body=new NodeFixture('body'),nodes=new Map<string,NodeFixture>();vi.stubGlobal('document',{body,createElement:(tag:string)=>new NodeFixture(tag),getElementById:(id:string)=>nodes.get(id)??null});return {body,nodes};}
afterEach(()=>vi.unstubAllGlobals());

test('inspector switches 32/30/20 actual rows, keeps literal target names and focusable reasons, and separates suspended Busy history',()=>{
  documentFixture();const root=new NodeFixture(),{world,actor}=scytherCamp();world.pawns[0]!.name='<img src=x> & Noé';
  // Only the presentation slots are supplied; update uses its real DOM logic.
  const slots=['title','information','action','target','ranged','cannon','phase','focus','group','mass','parts'];
  for(const slot of slots){const node=new NodeFixture(slot==='parts'?'tbody':'p');node.dataset[`mech${slot[0]!.toUpperCase()}${slot.slice(1)}`]='';root.append(node);}
  for(const id of ['consciousness','moving','manipulation','sight','hearing','bloodPumping','bloodFiltration']){const row=new NodeFixture('p');row.dataset.mechCapacity=id;row.append(new NodeFixture('strong'));root.append(row);}
  for(const [kind,count] of [['scyther',32],['lancer',30],['pikeman',20]] as const){
    actor.mechKind=kind;delete actor.health;delete actor.ranged;
    if(kind!=='scyther'){const core=world.tick*10;actor.ranged={order:{targetKey:`pawn:${world.pawns[1]!.id}`,admittedAtCore:core,jobUntilCore:core+500},stance:{phase:'cooldown',targetKey:`pawn:${world.pawns[0]!.id}`,startedAtCore:core,lastAdvancedAtCore:core,remainingCore:mechanoidRangedProfile(kind)!.cooldownCoreTicks}};actor.stun={sinceCore:core,untilCore:core+45};}
    const before=JSON.stringify(world);updateMechanoidInspector(root as unknown as HTMLElement,{world,actor});expect(JSON.stringify(world)).toBe(before);
    const rows=root.querySelectorAll<NodeFixture>('[data-mech-part]');expect(rows).toHaveLength(count);expect(rows.every(r=>r.dataset.mechPart!.startsWith(`${kind}-`)&&r.tabIndex===0&&r.hasAttribute('data-tooltip'))).toBe(true);
    if(kind!=='scyther'){expect(root.querySelector<NodeFixture>('[data-mech-focus]')!.textContent).toContain(world.pawns[0]!.name);expect(root.querySelector<NodeFixture>('[data-mech-phase]')!.textContent).toContain('suspendue');expect(root.textContent).not.toContain('Core');}
  }
});

test('existing mechanical adoption stays visible for missing ranged permission and busy until the command resolves and a confirmed policy arrives',async()=>{
  const {nodes}=documentFixture(),enable=new NodeFixture('button'),mech=new NodeFixture('button'),alerts=new NodeFixture();nodes.set('enable-raids',enable);nodes.set('enable-mech-raids',mech);nodes.set('alerts',alerts);
  const {world}=scytherCamp();world.raids={profile:'cassandra-raids-v1',rng:1,nextCheck:world.tick+100,serial:0,completed:0,departed:[],mechanoid:{adoptedAt:0,rng:123}};
  let resolve!:()=>void;const send=vi.fn(()=>new Promise<void>(yes=>{resolve=yes;})),ui=createRaidUI(send,vi.fn());const before=JSON.stringify(world);ui.update(world);
  expect(mech.hidden).toBe(false);expect(mech.textContent).toContain('à distance');mech.onclick!();mech.onclick!();expect(send).toHaveBeenCalledExactlyOnceWith({type:'enable-mech-raids'});expect(mech.disabled).toBe(true);
  ui.update(structuredClone(world));expect(mech.disabled).toBe(true);expect(JSON.stringify(world)).toBe(before);
  resolve();await Promise.resolve();await Promise.resolve();await Promise.resolve();expect(mech.hidden).toBe(false);
  world.raids.mechanoid!.ranged={adoptedAt:world.tick};ui.update(world);expect(mech.hidden).toBe(true);
});
