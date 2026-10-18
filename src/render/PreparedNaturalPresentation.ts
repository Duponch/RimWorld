import {readPreparedNaturalFrame,collectPreparedNaturalChanges,type PreparedNaturalFrame} from '../bridge/prepared-natural-frame';
import type {World,Resource} from '../sim/types';
import type {NaturalPresentationChange} from './NaturalResourcePresentation';
import type {NaturalAppearanceReader} from './natural-appearance-pass';
import {isResidentCrop} from './flora-presentation';
import {readSceneResourceFrame,type SceneResourceFrame} from './scene-resource-index';

/** MAIN consumes scalars of the exact admitted World being played. No plant
 * query, forecast, growth integral, World facade or copied Shape ledger. */
export class PreparedNaturalPresentation {
 private previous:PreparedNaturalFrame|undefined;
 private previousWorld:World|undefined;
 private ids=new Set<number>();
 readonly changes=new Map<number,NaturalPresentationChange>();
 appearance:NaturalAppearanceReader|undefined;
 get active():boolean {return this.previous!==undefined;}
 hasFrameChange(world:World):boolean {return readPreparedNaturalFrame(world)!==this.previous;}
 clear():void {this.previous=undefined;this.previousWorld=undefined;this.ids.clear();this.changes.clear();this.appearance=undefined;}
 readScene(world:World,reset=false,index?:SceneResourceFrame):{changed:boolean}|undefined {
  const frame=readPreparedNaturalFrame(world);if(!frame)return;
  this.changes.clear();
  if(!reset&&frame===this.previous)return {changed:false};
  const access=readSceneResourceFrame(index,world,reset?undefined:this.previousWorld);if(!access)throw Error('Prepared vegetation requires the current scene resource index and played predecessor');
  const read=(resource:Resource)=>{
   const value=frame.lookup(resource.id);if(!value)throw Error('Missing prepared natural observation for '+resource.id);return value;
  };
  this.appearance={read,harvestable:resource=>read(resource).harvestable};
  const affected=!reset&&this.previous?collectPreparedNaturalChanges(this.previous,frame):undefined;
  if(affected===undefined){
   // Initial/reset/domain gaps still read numbers only. Retire old same-map
   // IDs explicitly: a checkpoint need not trigger the renderer's newMap flag.
   const old=this.ids;this.ids=new Set();
   for(const resource of world.resources){
    const observation=frame.lookup(resource.id);
    if(isResidentCrop(resource)){if(observation)throw Error('Prepared natural frame contains a resident crop');continue;}
    if(!observation)throw Error('Incomplete prepared natural frame for '+resource.id);
    this.ids.add(resource.id);this.changes.set(resource.id,{resource,size:observation.size});
   }
   if(this.ids.size!==frame.naturalCount)throw Error('Prepared natural frame population mismatch');
   const removed=[...old].filter(id=>!this.ids.has(id)).sort((a,b)=>access.previousResourceSource(a)!-access.previousResourceSource(b)!);
   for(const id of removed)this.changes.set(id,{resource:undefined,size:0});
  }else{
   const present:{source:number;resource:Resource;size:number}[]=[],absent:number[]=[];
   for(const id of affected){
    const source=access.resourceSource(id),resource=source===undefined?undefined:world.resources[source],observation=frame.lookup(id);
    if(observation){
     if(!resource||resource.id!==id||isResidentCrop(resource))throw Error('Prepared natural identity mismatch for '+id);
     this.ids.add(id);present.push({source:source!,resource,size:observation.size});
    }else{
     if(resource&&!isResidentCrop(resource))throw Error('Missing current prepared natural observation for '+id);
     if(this.ids.delete(id))absent.push(id);
    }
   }
   // Keep actual current source order followed by previous source removals,
   // including cluster free-slot order when removals and births coincide.
   present.sort((a,b)=>a.source-b.source);
   for(const entry of present)this.changes.set(entry.resource.id,{resource:entry.resource,size:entry.size});
   absent.sort((a,b)=>access.previousResourceSource(a)!-access.previousResourceSource(b)!);
   for(const id of absent)this.changes.set(id,{resource:undefined,size:0});
   if(this.ids.size!==frame.naturalCount)throw Error('Prepared natural delta population mismatch');
  }
  this.previous=frame;
  this.previousWorld=world;
  return {changed:reset||affected===undefined||this.changes.size>0};
 }
}
