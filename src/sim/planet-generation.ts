/** Original discrete globe. Centers/neighbours are its sole saved geometry. */
import type { PlanetState, PlanetTile } from './planet-state.ts';
import type { World } from './types.ts';
import { siteClimateDefinition } from './site-climate.ts';
import { validatePlanetTopology } from './planet-save.ts';

type Vector = PlanetTile['center'];
export interface PlanetHomeInput {
  biome: Exclude<PlanetTile['biome'], 'ocean'>;
  latitude: number;
  longitude: number;
  meanTemperature: number;
  rainfall: number;
  hilliness?: PlanetTile['hilliness'];
}
const biomes = ['temperate-forest', 'boreal-forest', 'arid-shrubland'] as const;
const hills = ['flat', 'small-hills', 'large-hills', 'mountainous'] as const;
const finite = (n: unknown, min: number, max: number): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
function validHome(value: unknown): value is PlanetHomeInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const h = value as Record<string, unknown>;
  return Object.keys(h).every(k => ['biome', 'latitude', 'longitude', 'meanTemperature', 'rainfall', 'hilliness'].includes(k))
    && biomes.some(b => b === h.biome) && finite(h.latitude, -90, 90) && finite(h.longitude, -180, 180)
    && finite(h.meanTemperature, -100, 100) && finite(h.rainfall, 0, 10000)
    && (!Object.hasOwn(h, 'hilliness') || hills.some(t => t === h.hilliness));
}
const unit = (p: Vector): Vector => { const n = Math.hypot(...p); return [p[0] / n, p[1] / n, p[2] / n]; };
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vector, b: Vector): Vector => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const plus = (a: Vector, b: Vector): Vector => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vector, n: number): Vector => [a[0] * n, a[1] * n, a[2] * n];
function rotateFromTo(from: Vector, to: Vector): (p: Vector) => Vector {
  const c = Math.max(-1, Math.min(1, dot(from, to))), v = cross(from, to), s = Math.hypot(...v);
  if (s < 1e-12) {
    if (c > 0) return p => [...p];
    const axis = unit(cross(from, Math.abs(from[0]) < .9 ? [1, 0, 0] : [0, 1, 0]));
    return p => plus(scale(axis, 2 * dot(axis, p)), scale(p, -1));
  }
  const k = scale(v, 1 / s);
  return p => unit(plus(plus(scale(p, c), scale(cross(k, p), s)), scale(k, dot(k, p) * (1 - c))));
}

/** Reads existing location/profile only. No adoptSiteClimate or World mutation.
 * Legacy non-adopted local temperature remains21; planetary seasonal costs
 * use this explicit reference profile as an adaptation, not thermal identity. */
export function planetHomeInput(world: World): PlanetHomeInput {
  const c = siteClimateDefinition(world);
  return { biome: world.site?.revision === 2 ? world.site.biome : 'temperate-forest',
    latitude: c.latitude, longitude: c.longitude, meanTemperature: c.meanTemperature, rainfall: c.rainfall,
    hilliness: 'flat' }; // Existing local site has no hilliness authority.
}

/** Called only by explicit adoption/new-start dispatcher. No World/Thing draw. */
export function generatePlanet(seed: number, home: PlanetHomeInput, adoptedAt: number): PlanetState {
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff || !validHome(home)
    || !Number.isSafeInteger(adoptedAt) || adoptedAt < 0) throw new Error('Invalid planet generation input');
  let rng = (seed ^ 0x5c1f73a9) >>> 0; if (!rng) rng = 1;
  const draw = () => { rng ^= rng << 13; rng ^= rng >>> 17; rng ^= rng << 5; rng >>>= 0; return rng / 4294967296; };
  const t = (1 + Math.sqrt(5)) / 2;
  const vertices: Vector[] = ([[-1,t,0],[1,t,0],[-1,-t,0],[1,-t,0],[0,-1,t],[0,1,t],
    [0,-1,-t],[0,1,-t],[t,0,-1],[t,0,1],[-t,0,-1],[-t,0,1]] satisfies Vector[]).map(unit);
  let faces: [number, number, number][] = [[0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],[1,5,9],[5,11,4],
    [11,10,2],[10,7,6],[7,1,8],[3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],[4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]];
  for (let level = 0; level < 2; level++) {
    const midpoints = new Map<string, number>();
    const midpoint = (a: number, b: number) => {
      const key = `${Math.min(a,b)}:${Math.max(a,b)}`, old = midpoints.get(key); if (old !== undefined) return old;
      const id = vertices.length; vertices.push(unit(plus(vertices[a]!, vertices[b]!))); midpoints.set(key,id); return id;
    };
    const next: [number, number, number][] = [];
    for (const [a,b,c] of faces) { const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);
      next.push([a,ab,ca],[b,bc,ab],[c,ca,bc],[ab,bc,ca]); }
    faces = next;
  }
  const radians = Math.PI / 180, lat = home.latitude * radians, lon = home.longitude * radians;
  const rotate = rotateFromTo(vertices[0]!, [Math.cos(lat)*Math.cos(lon), Math.sin(lat), Math.cos(lat)*Math.sin(lon)]);
  const centers = vertices.map(rotate), neighbours = centers.map(() => new Set<number>());
  for (const [a,b,c] of faces) for (const [id,x,y] of [[a,b,c],[b,c,a],[c,a,b]]) {
    neighbours[id!]!.add(x!); neighbours[id!]!.add(y!);
  }
  const continents = Array.from({length:3}, () => centers[Math.floor(draw()*centers.length)]!);
  const tiles: PlanetTile[] = centers.map((center,id) => {
    const meanTemperature=28-40*Math.abs(center[1])+(draw()-.5)*8, rainfall=400+draw()*1200, relief=draw();
    const land = continents.some(c => dot(center,c) > .55);
    return { id, center, neighbours:[...neighbours[id]!].sort((a,b)=>a-b),
      biome: land ? meanTemperature<8 ? 'boreal-forest' : rainfall<700 ? 'arid-shrubland' : 'temperate-forest' : 'ocean',
      hilliness: relief<.55 ? 'flat' : relief<.8 ? 'small-hills' : relief<.95 ? 'large-hills' : 'mountainous', meanTemperature, rainfall };
  });
  // Original constraint, not Core continent/site frequencies: connected post at three hops.
  const distances=Array<number>(tiles.length).fill(-1), parents=Array<number>(tiles.length).fill(-1), queue=[0]; distances[0]=0;
  for (let head=0;head<queue.length;head++) for (const n of tiles[queue[head]!]!.neighbours) if (distances[n]===-1) {
    distances[n]=distances[queue[head]!]!+1; parents[n]=queue[head]!; queue.push(n);
  }
  const choices=tiles.filter(tile=>distances[tile.id]===3), post=choices[Math.floor(draw()*choices.length)]!.id;
  for (let cursor=post;cursor!==-1;cursor=parents[cursor]!) if (tiles[cursor]!.biome==='ocean') {
    const tile=tiles[cursor]!; tile.biome=tile.meanTemperature<8?'boreal-forest':tile.rainfall<700?'arid-shrubland':'temperate-forest';
  }
  Object.assign(tiles[0]!, {biome:home.biome,meanTemperature:home.meanTemperature,rainfall:home.rainfall,hilliness:home.hilliness??'flat'});
  const planet:PlanetState={revision:1,adoptedAt,generationSeed:seed,tiles,homeTile:0,civilianTile:post,nextGroupId:1};
  if (!validPlanetTopology(planet)) throw new Error('Invalid original planet topology');
  return planet;
}

/** Domain topology check; root still owns full version/shape/save guard. */
export function validPlanetTopology(planet: PlanetState): boolean {
  return validatePlanetTopology(planet.tiles).length===0
    &&Number.isSafeInteger(planet.homeTile)&&Number.isSafeInteger(planet.civilianTile)
    &&!!planet.tiles[planet.homeTile]&&!!planet.tiles[planet.civilianTile]
    &&planet.homeTile!==planet.civilianTile&&planet.tiles[planet.homeTile]!.biome!=='ocean'
    &&planet.tiles[planet.civilianTile]!.biome!=='ocean';
}

/** Derived presentation values: never another persisted authority. */
export function tileCoordinates(tile: PlanetTile): {latitude:number;longitude:number} {
  return {latitude:Math.asin(Math.max(-1,Math.min(1,tile.center[1])))*180/Math.PI,
    longitude:Math.atan2(tile.center[2],tile.center[0])*180/Math.PI};
}
export function tileCorners(planet: PlanetState, id: number): Vector[] {
  const tile=planet.tiles[id]; if(!tile)throw new Error('Unknown planet tile');
  const corners:Vector[]=[];
  for(let a=0;a<tile.neighbours.length;a++)for(let b=a+1;b<tile.neighbours.length;b++) {
    const x=planet.tiles[tile.neighbours[a]!]!,y=planet.tiles[tile.neighbours[b]!]!;
    if(x.neighbours.includes(y.id))corners.push(unit(plus(plus(tile.center,x.center),y.center)));
  }
  const east=unit(cross(Math.abs(tile.center[1])<.99?[0,1,0]:[1,0,0],tile.center)),north=cross(tile.center,east);
  return corners.sort((a,b)=>Math.atan2(dot(a,north),dot(a,east))-Math.atan2(dot(b,north),dot(b,east)));
}
