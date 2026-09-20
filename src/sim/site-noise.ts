/** Independent local generator, not the original game's random sequence.
 * A layer number separates fields and never advances the simulation RNG. */
export function siteSample(seed:number,x:number,z:number,layer:number):number {
  let n=seed^Math.imul(x,0x1f123bb5)^Math.imul(z,0x5f356495)^Math.imul(layer,0x6c8e9cf5);
  n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);
  return ((n^(n>>>16))>>>0)/4294967296;
}

const fade=(x:number):number=>x*x*x*(x*(x*6-15)+10);
const lerp=(a:number,b:number,t:number):number=>a+(b-a)*t;
// Independently constructed uniform spherical directions; no proprietary
// gradient table. Sampling at y=0 retains the projected variance of a 3D unit
// gradient, unlike unnormalised 2D diagonals that inflated our first map audit.
const gradients=Array.from({length:256},(_,i)=>{
  const y=1-2*(i+.5)/256,r=Math.sqrt(1-y*y),angle=i*Math.PI*(3-Math.sqrt(5));
  return [r*Math.cos(angle),r*Math.sin(angle)] as const;
});
function gradient(seed:number,x:number,z:number,dx:number,dz:number,layer:number):number {
  const [gx,gz]=gradients[Math.floor(siteSample(seed,x,z,layer)*gradients.length)]!;
  return gx*dx+gz*dz;
}
function coherent(seed:number,x:number,z:number,layer:number):number {
  const ix=Math.floor(x),iz=Math.floor(z),dx=x-ix,dz=z-iz,sx=fade(dx),sz=fade(dz);
  return lerp(lerp(gradient(seed,ix,iz,dx,dz,layer),gradient(seed,ix+1,iz,dx-1,dz,layer),sx),
    lerp(gradient(seed,ix,iz+1,dx,dz-1,layer),gradient(seed,ix+1,iz+1,dx-1,dz-1,layer),sx),sz)*2.12;
}
/** Unnormalised octaves retain the broad range of a gradient-noise terrain.
 * This is our 2D field; thresholds/frequencies are reference data, not a claim
 * of identical per-seed shapes or statistical equivalence to Core. */
export function siteNoise(seed:number,x:number,z:number,frequency:number,octaves:number,layer:number):number {
  let value=0,amplitude=1;
  for(let i=0;i<octaves;i++){value+=coherent(seed,x*frequency,z*frequency,layer+i)*amplitude;frequency*=2;amplitude*=.5;}
  return value;
}

export interface SiteFields { elevation:Float64Array; fertility:Float64Array }
/** Common field for the three reliefs: multiplying it must be the only relief
 * effect, so changing a menu choice cannot accidentally redraw the whole map. */
export function generateSiteFields(seed:number,width:number,height:number,factor:number):SiteFields {
  const elevation=new Float64Array(width*height),fertility=new Float64Array(width*height);
  const frequency=.015+siteSample(seed,0,0,1000)*.0075,angle=siteSample(seed,0,0,1001)*Math.PI;
  const cos=Math.cos(angle),sin=Math.sin(angle),stretch=1+siteSample(seed,0,0,1002)*.15;
  const detailFrequency=.03+siteSample(seed,0,0,1003)*.03,detailStrength=5+siteSample(seed,0,0,1004)*5;
  const warpFrequency=.01+siteSample(seed,0,0,1005)*.01,warpStrength=siteSample(seed,0,0,1006)*15;
  for(let z=0;z<height;z++)for(let x=0;x<width;x++) {
    // Nonintegral offsets avoid pinning a zero of gradient noise to the corner.
    const px=(x+137)*cos*stretch-(z+91)*sin,pz=(x+137)*sin*stretch+(z+91)*cos;
    const wx=px+siteNoise(seed,px,pz,warpFrequency,3,1020)*warpStrength;
    const wz=pz+siteNoise(seed,px,pz,warpFrequency,3,1030)*warpStrength;
    const nx=wx+siteNoise(seed,wx,wz,detailFrequency,4,1040)*detailStrength;
    const nz=wz+siteNoise(seed,wx,wz,detailFrequency,4,1050)*detailStrength;
    elevation[z*width+x]=(.5+.5*siteNoise(seed,nx,nz,frequency,3,1060))*factor;
    fertility[z*width+x]=.5+.5*siteNoise(seed,x+263,z+71,.021,6,1070);
  }
  return {elevation,fertility};
}
