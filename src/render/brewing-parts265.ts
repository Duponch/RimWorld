import type {Structure,World} from '../sim/types';
import type {Placement} from './primitives';

/** Original closed vessels and timber supports. Every piece joins the shared
 * prepared furniture batch; contents are saved scalar owners, never fake piles. */
export function brewingParts265(world:Pick<World,'structures'>):Placement[] {
 const out:Placement[]=[];
 for(const s of world.structures){
  if(s.kind!=='brewery'&&s.kind!=='fermenting-barrel')continue;
  const ry=s.orientation*Math.PI/2,c=Math.cos(ry),n=Math.sin(ry);
  const box=(x:number,y:number,z:number,sx:number,sy:number,sz:number,color:number,turn=0)=>out.push({key:s.id,targetId:s.id,x:s.x+x*c+z*n,y,z:s.z+z*c-x*n,sx,sy,sz,color,ry:ry+turn});
  if(s.kind==='brewery'){
   box(0,.72,0,2.86,.14,.87,0xbda177);box(0,.18,0,2.62,.09,.70,0x8f795a);
   for(const x of [-1.22,1.22])for(const z of [-.30,.30])box(x,.35,z,.12,.7,.12,0x806b50);
   box(-.80,1.01,0,.67,.45,.65,0xa2a98d);box(-.80,1.26,0,.72,.07,.68,0x687d70);
   box(-.80,1.32,0,.20,.06,.17,0xb9c6ae);box(-.80,.97,.355,.20,.16,.065,0x6b8276);
   box(-.12,1.04,-.24,.12,.51,.12,0xc2af78);box(.24,1.28,-.24,.83,.08,.10,0xb39b6a);
   box(.61,1.12,-.24,.10,.35,.10,0xb39b6a);box(.71,.91,.04,.56,.24,.49,0x768d7d);
   box(.71,1.05,.04,.59,.05,.52,0xb8bea0);box(1.12,.94,.18,.15,.29,.15,0x8b9c75);
   box(1.12,1.10,.18,.17,.04,.17,0xc6c2a3);
  }else{
   box(0,.09,0,.81,.18,.81,0x736b56);box(0,.51,0,.56,.72,.56,0x947c56);
   for(let i=0;i<8;i++){
    const a=i*Math.PI/4,x=Math.sin(a)*.29,z=Math.cos(a)*.29;
    box(x,.53,z,.29,.79,.10,i%2?0xb09a6c:0xc1aa7b,a);
    for(const y of [.22,.77])box(x,y,z,.32,.065,.12,0x5e766c,a);
   }
   box(0,.96,0,.70,.08,.70,0xc5ae7d);box(0,1.015,0,.15,.045,.14,0x806e51);
   box(0,1.06,.23,.76,.025,.13,0x3f5851);
   box(0,.46,.394,.12,.12,.06,0x667f6b);
  }
 }
 return out;
}

/** Bounded confirmed status geometry; quantity controls length, fermentation
 * controls pigment. A closed opaque barrel never pretends to expose liquid. */
export function fermentationStatusParts265(s:Structure):Placement[] {
 if(s.kind!=='fermenting-barrel'||!s.fermentation||s.fermentation.wort<=0&&s.fermentation.ruin<1)return [];
 const {wort,progress,ruin}=s.fermentation,fraction=ruin>=1?.12:Math.max(0,Math.min(25,wort))/25,stage=Math.max(0,Math.min(20,Math.floor(progress*20))),ry=s.orientation*Math.PI/2;
 const dx=-.35+.35*fraction,dz=.23,c=Math.cos(ry),n=Math.sin(ry),color=ruin>=1?0xba745d:stage>=20?0xd7c76b:stage>=10?0xc1a875:0xa98a61;
 return [{key:s.id,targetId:s.id,x:s.x+dx*c+dz*n,y:1.08,z:s.z+dz*c-dx*n,sx:.70*fraction,sy:.016,sz:.09,ry,color}];
}
export const fermentationStatusKey265=(s:Structure):string=>s.kind==='fermenting-barrel'?`${s.id}:barrel:${s.x}:${s.z}:${s.orientation}:${s.fermentation?.wort??0}:${Math.floor((s.fermentation?.progress??0)*20)}:${(s.fermentation?.ruin??0)>=1}`:'';
