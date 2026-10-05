import type { PlanetState,PlanetTile } from '../sim/planet-state.ts';

type Vector=readonly [number,number,number];
export interface PlanetOverlay {
  selected:number|null;
  route:readonly number[];
  previewRoute?:readonly number[];
  groupTile?:number;
}
export interface PlanetView {
  setPlanet(planet:PlanetState|undefined):void;
  setOverlay(overlay:PlanetOverlay):void;
  setVisible(visible:boolean):void;
  dispose():void;
}
const SVG='http://www.w3.org/2000/svg';
const dot=(a:Vector,b:Vector)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a:Vector,b:Vector):Vector=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
function unit(v:Vector):Vector {
  const n=Math.hypot(...v);if(!Number.isFinite(n)||n<1e-10)throw Error('Centre géographique invalide.');
  return [v[0]/n,v[1]/n,v[2]/n];
}
const add=(a:Vector,b:Vector,c:Vector):Vector=>[a[0]+b[0]+c[0],a[1]+b[1]+c[1],a[2]+b[2]+c[2]];
const biomeLabel=(tile:PlanetTile)=>({ocean:'Océan','temperate-forest':'Forêt tempérée','boreal-forest':'Forêt boréale','arid-shrubland':'Broussailles arides'})[tile.biome];
const reliefLabel=(tile:PlanetTile)=>({flat:'plat','small-hills':'petites collines','large-hills':'grandes collines',mountainous:'montagnes'})[tile.hilliness];
export function planetTileLabel(planet:PlanetState,id:number):string {
  const tile=planet.tiles.find(t=>t.id===id);if(!tile)throw Error('Case géographique absente.');
  const site=id===planet.homeTile?'Foyer':id===planet.civilianTile?'Comptoir civil':`Case ${id}`;
  return `${site} · ${biomeLabel(tile)} · ${reliefLabel(tile)}`;
}

/** Dual polygons are presentation-only derivatives of saved primal centres and
 * canonical adjacency. No latitude, longitude, corner or route is fabricated. */
function geometry(planet:PlanetState):Map<number,{center:Vector;corners:Vector[]}> {
  if(planet.tiles.length!==162)throw Error('Le globe attend les 162 cases canoniques.');
  const tiles=new Map(planet.tiles.map(t=>[t.id,t]));
  if(tiles.size!==162||!tiles.has(planet.homeTile)||!tiles.has(planet.civilianTile))throw Error('Identités géographiques incomplètes.');
  const output=new Map<number,{center:Vector;corners:Vector[]}>();
  for(const tile of planet.tiles) {
    if(tile.center.length!==3||tile.center.some(n=>!Number.isFinite(n))||Math.abs(Math.hypot(...tile.center)-1)>1e-6)
      throw Error('Centre géographique non unitaire.');
    if(![5,6].includes(tile.neighbours.length)||new Set(tile.neighbours).size!==tile.neighbours.length)
      throw Error('Voisinage géographique incomplet.');
    const p:Vector=tile.center,axis:Vector=Math.abs(p[1])>.9?[1,0,0]:[0,1,0];
    const x=unit(cross(axis,p)),y=cross(p,x);
    const ring=tile.neighbours.map(id=>{
      const n=tiles.get(id);if(!n||id===tile.id||!n.neighbours.includes(tile.id))throw Error('Voisinage géographique non réciproque.');
      return n;
    }).sort((a,b)=>Math.atan2(dot(a.center,y),dot(a.center,x))-Math.atan2(dot(b.center,y),dot(b.center,x)));
    const corners=ring.map((n,i)=>{
      const next=ring[(i+1)%ring.length]!;
      if(!n.neighbours.includes(next.id))throw Error('Les centres ne forment pas un dual triangulé canonique.');
      return unit(add(p,n.center,next.center));
    });
    output.set(tile.id,{center:p,corners});
  }
  return output;
}
function horizon(a:Vector,b:Vector):Vector {
  const t=a[2]/(a[2]-b[2]);return unit([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,0]);
}
function clippedPolygon(points:readonly Vector[]):Vector[] {
  const result:Vector[]=[];
  for(let i=0;i<points.length;i++) {
    const a=points[i]!,b=points[(i+1)%points.length]!,front=a[2]>=0,nextFront=b[2]>=0;
    if(front)result.push(a);if(front!==nextFront)result.push(horizon(a,b));
  }
  return result;
}
const screen=(p:Vector)=>`${(250+p[0]*220).toFixed(3)},${(250-p[1]*220).toFixed(3)}`;
const polygonPath=(p:readonly Vector[])=>p.length>2?`M${p.map(screen).join('L')}Z`:'';
function routePath(ids:readonly number[],centres:ReadonlyMap<number,{center:Vector}>,rotate:(p:Vector)=>Vector):string {
  let result='';
  for(let i=1;i<ids.length;i++) {
    const a=centres.get(ids[i-1]!),b=centres.get(ids[i]!);if(!a||!b)throw Error('Une route référence une case absente.');
    let previous=rotate(a.center);
    // Six pieces per canonical edge; one shared SVG path, no DOM per segment.
    for(let n=1;n<=6;n++) {
      const t=n/6,current=rotate(unit([a.center[0]*(1-t)+b.center[0]*t,a.center[1]*(1-t)+b.center[1]*t,a.center[2]*(1-t)+b.center[2]*t]));
      const af=previous[2]>=0,bf=current[2]>=0;
      if(af||bf)result+=`M${screen(af?previous:horizon(previous,current))}L${screen(bf?current:horizon(previous,current))}`;
      previous=current;
    }
  }
  return result;
}

/** Orthographic SVG projection only. Pointer/keyboard rotation reads cached
 * geometry; it never consults World, invokes a solver or sends a command. */
export function createPlanetView(host:HTMLElement,onSelect:(tileId:number)=>void):PlanetView {
  const abort=new AbortController(),element=document.createElement('section');element.className='planet-view';
  const intro=document.createElement('p');intro.textContent='Visualisation du globe. Tournez par glissement ou avec les flèches ; choisissez une case dans la liste.';
  const svg=document.createElementNS(SVG,'svg');svg.setAttribute('viewBox','0 0 500 500');svg.setAttribute('role','img');
  svg.setAttribute('aria-label','Globe orthographique : rotation visuelle');svg.setAttribute('tabindex','0');
  const disc=document.createElementNS(SVG,'circle');disc.setAttribute('cx','250');disc.setAttribute('cy','250');disc.setAttribute('r','220');disc.setAttribute('class','planet-disc');
  const faces=document.createElementNS(SVG,'g'),preview=document.createElementNS(SVG,'path'),route=document.createElementNS(SVG,'path');
  preview.setAttribute('class','planet-route planet-route-preview');route.setAttribute('class','planet-route');
  const markers=document.createElementNS(SVG,'g');markers.setAttribute('class','planet-markers');
  const circles=new Map<string,SVGCircleElement>();
  for(const [key,label] of [['home','Foyer'],['civilian','Comptoir civil'],['group','Groupe'],['selection','Case choisie']]) {
    const circle=document.createElementNS(SVG,'circle'),title=document.createElementNS(SVG,'title');title.textContent=label!;
    circle.setAttribute('class',`planet-marker planet-marker-${key}`);circle.setAttribute('r',key==='selection'?'10':'6');
    circle.append(title);markers.append(circle);circles.set(key!,circle);
  }
  svg.append(disc,faces,preview,route,markers);
  const choiceLabel=document.createElement('label');choiceLabel.textContent='Choisir une case';
  const choice=document.createElement('select');choice.dataset.planetSelection='';choice.setAttribute('aria-label','Choisir une case du globe');choiceLabel.append(choice);
  const selectedText=document.createElement('p');selectedText.className='planet-selection';selectedText.setAttribute('aria-live','polite');
  element.append(intro,svg,choiceLabel,selectedText);host.append(element);
  let planet:PlanetState|undefined,shapeKey='',labelKey='',centres=new Map<number,{center:Vector;corners:Vector[]}>();
  const nodes=new Map<number,{path:SVGPathElement;title:SVGTitleElement}>();
  let overlay:PlanetOverlay={selected:null,route:[]},yaw=0,pitch=0,visible=true,frame=0,disposed=false;
  let drag:{id:number;x:number;y:number;yaw:number;pitch:number;tile:number|null;moved:boolean}|undefined;
  const rotate=(p:Vector):Vector=>{
    const x=p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),z=p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw);
    return [x,p[1]*Math.cos(pitch)-z*Math.sin(pitch),p[1]*Math.sin(pitch)+z*Math.cos(pitch)];
  };
  function schedule():void {if(!disposed&&visible&&!frame)frame=requestAnimationFrame(paint);}
  function paint():void {
    frame=0;if(!planet||!visible||disposed)return;
    for(const tile of planet.tiles) {
      const g=centres.get(tile.id)!,node=nodes.get(tile.id)!,path=polygonPath(clippedPolygon(g.corners.map(rotate)));
      node.path.setAttribute('d',path);node.path.style.display=path?'':'none';
      node.path.setAttribute('data-selected',String(tile.id===overlay.selected));
    }
    route.setAttribute('d',routePath(overlay.route,centres,rotate));
    preview.setAttribute('d',routePath(overlay.previewRoute??[],centres,rotate));
    const positions:{[key:string]:number|undefined}={home:planet.homeTile,civilian:planet.civilianTile,group:overlay.groupTile,selection:overlay.selected??undefined};
    for(const [key,node] of circles) {
      const id=positions[key],center=id===undefined?undefined:centres.get(id)?.center,p=center?rotate(center):undefined;
      node.style.display=p&&p[2]>=0?'':'none';
      if(p){node.setAttribute('cx',(250+p[0]*220).toFixed(3));node.setAttribute('cy',(250-p[1]*220).toFixed(3));}
    }
  }
  function select(id:number):void {
    if(!planet||!centres.has(id))return;
    overlay={...overlay,selected:id};choice.value=String(id);selectedText.textContent=planetTileLabel(planet,id);schedule();onSelect(id);
  }
  choice.addEventListener('change',()=>select(Number(choice.value)),{signal:abort.signal});
  svg.addEventListener('pointerdown',event=>{
    if(event.button!==0||!planet)return;
    const target=event.target instanceof Element?event.target.closest('[data-planet-tile]'):null;
    const id=target?.getAttribute('data-planet-tile');
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,yaw,pitch,tile:id===null||id===undefined?null:Number(id),moved:false};
    svg.setPointerCapture(event.pointerId);
  },{signal:abort.signal});
  svg.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(dx,dy)>4)drag.moved=true;
    if(drag.moved){yaw=drag.yaw+dx*.008;pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,drag.pitch+dy*.008));schedule();}
  },{signal:abort.signal});
  svg.addEventListener('pointerup',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const end=drag;drag=undefined;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);
    if(!end.moved&&end.tile!==null)select(end.tile);
  },{signal:abort.signal});
  svg.addEventListener('pointercancel',()=>{drag=undefined;},{signal:abort.signal});
  svg.addEventListener('keydown',event=>{
    const step=.12;
    if(event.key==='ArrowLeft')yaw-=step;else if(event.key==='ArrowRight')yaw+=step;
    else if(event.key==='ArrowUp')pitch=Math.max(-Math.PI/2,pitch-step);else if(event.key==='ArrowDown')pitch=Math.min(Math.PI/2,pitch+step);else return;
    event.preventDefault();schedule();
  },{signal:abort.signal});
  return {
    setPlanet(next) {
      planet=next;
      if(!next){shapeKey=labelKey='';centres.clear();nodes.clear();faces.replaceChildren();choice.replaceChildren();selectedText.textContent='Géographie non adoptée.';element.hidden=true;return;}
      element.hidden=!visible;
      const key=JSON.stringify(next.tiles.map(t=>[t.id,t.center,t.neighbours]));
      if(shapeKey!==key) {
        centres=geometry(next);shapeKey=key;labelKey='';nodes.clear();faces.replaceChildren();
        for(const tile of next.tiles) {
          const path=document.createElementNS(SVG,'path'),title=document.createElementNS(SVG,'title');
          path.setAttribute('data-planet-tile',String(tile.id));path.setAttribute('class','planet-tile');path.append(title);faces.append(path);nodes.set(tile.id,{path,title});
        }
      }
      const labels=JSON.stringify([next.homeTile,next.civilianTile,next.tiles.map(t=>[t.id,t.biome,t.hilliness])]);
      if(labelKey!==labels){
        labelKey=labels;choice.replaceChildren(...next.tiles.map(tile=>new Option(planetTileLabel(next,tile.id),String(tile.id))));
        for(const tile of next.tiles) {
          const node=nodes.get(tile.id)!;node.title.textContent=planetTileLabel(next,tile.id);
          node.path.setAttribute('data-biome',tile.biome);node.path.setAttribute('data-hilliness',tile.hilliness);
        }
      }
      if(overlay.selected!==null&&!centres.has(overlay.selected))overlay={selected:null,route:[]};
      if(svg.querySelectorAll('*').length+1>512)throw Error('Budget de nœuds SVG dépassé.');
      schedule();
    },
    setOverlay(next) {
      if(planet)for(const path of [next.route,next.previewRoute??[]])for(let i=0;i<path.length;i++) {
        const tile=planet.tiles.find(t=>t.id===path[i]);if(!tile||i>0&&path[i-1]!==path[i]&&!tile.neighbours.includes(path[i-1]!))throw Error('Route géographique non canonique.');
      }
      overlay=next;
      if(planet&&next.selected!==null){choice.value=String(next.selected);selectedText.textContent=planetTileLabel(planet,next.selected);}
      schedule();
    },
    setVisible(next) {visible=next;element.hidden=!next||!planet;if(!next){cancelAnimationFrame(frame);frame=0;}else schedule();},
    dispose() {disposed=true;abort.abort();cancelAnimationFrame(frame);element.remove();nodes.clear();centres.clear();},
  };
}
