import { addMaterial } from './materials.ts';
import type { LocalSite } from './site.ts';
import { soilFertility } from './soil.ts';
import { siteNoise,siteSample } from './site-noise.ts';
import type { World } from './types.ts';

/** Physical fragments already supported by hauling/stonecutting. Starts have
 * reference probability .006; that is not the final fraction of occupied cells.
 * Rubble filth is absent. Each walk ends on occupied or unsupported ground. */
export function generateSiteChunks(world:World,site:LocalSite,elevation:Float64Array):void {
  const {seed,width,height}=world,occupied=new Uint8Array(width*height);
  const directions=[[1,0],[-1,0],[0,1],[0,-1]] as const;
  for(let root=0;root<elevation.length;root++) {
    const rx=root%width,rz=Math.floor(root/width),density=Math.max(0,1+siteNoise(seed,rx+47,rz+193,.015,6,1200));
    if(elevation[root]!>=.55||siteSample(seed,root,0,1210)>=.006*density)continue;
    const stone=site.stones[Math.floor(siteSample(seed,root,0,1211)*site.stones.length)]!;
    const excluded=Math.floor(siteSample(seed,root,0,1212)*4);
    let x=rx,z=rz;
    for(let step=0;step<width*height;step++) {
      // A fixed forbidden direction makes a finite, irregular local trail.
      let dir=Math.floor(siteSample(seed,root,step,1213)*3);if(dir>=excluded)dir++;
      const [dx,dz]=directions[dir]!;x+=dx;z+=dz;
      if(x<0||z<0||x>=width||z>=height)break;
      const i=z*width+x;
      if(occupied[i]||elevation[i]!>.55||world.tiles[i]!.terrain==='rock'||world.tiles[i]!.terrain==='water')break;
      occupied[i]=1;
      addMaterial(world,'chunk',1,{type:'ground',x,z},`${stone}-chunk`);
    }
  }
}

/** Marginal projection onto the two implemented plant resources. Missing low
 * vegetation never becomes extra trees/berries. Spatial saturation and plant
 * succession from Core remain absent; the grove field is our explicit adaptation. */
export function generateSiteVegetation(world:World):void {
  const {seed,width,height}=world,occupied=new Set(world.piles.flatMap(p=>p.owner.type==='ground'?[p.owner.z*width+p.owner.x]:[]));
  for(let z=0;z<height;z++)for(let x=0;x<width;x++) {
    const i=z*width+x,fertility=soilFertility(world.tiles[i]!.terrain);
    if(fertility<.5||occupied.has(i))continue;
    const groves=Math.max(0,Math.min(2,1+siteNoise(seed,x+47,z+193,.028,3,1250)));
    const plants=Math.min(1,.65*fertility*fertility)*groves;
    const roll=siteSample(seed,x,z,1260),treeChance=plants/10.2,berryChance=plants*.05/10.2;
    const kind=roll<treeChance?'tree':roll<treeChance+berryChance?'berries':null;
    if(kind)world.resources.push({id:world.nextId++,x,z,kind,amount:kind==='berries'?10:7+Math.floor(siteSample(seed,x,z,1261)*7),
      ...kind==='berries'?{growth:Math.min(1,.15+siteSample(seed,x,z,1262)*1.35),growthTick:0}:{}});
  }
}
