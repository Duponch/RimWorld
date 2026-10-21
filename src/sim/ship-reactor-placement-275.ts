import {footprintCells,STRUCTURE_DEFINITIONS} from './definitions.ts';
import {foggedCell256} from './exploration-state-256.ts';
import {marshSupportsFootprint} from './marsh.ts';
import {sharesConstructionLayer} from './power-grid.ts';
import {isRoofed} from './roof-rules.ts';
import {isSchema275OrLater} from './schema-compatibility-257.ts';
import {SHIP_REACTOR_PHYSICS_275,shipReactorCells275,shipReactorContains275} from './ship-reactor-content-275.ts';
import type {Cell,Orientation,World} from './types.ts';

/** Shared by designation and final materialization. Plants and movable goods
 * retain the ordinary clearing/delivery jobs, never vanish during admission. */
export function shipReactorPlacementRefusal275(world:World,building:Cell&{orientation?:Orientation},ignoredJobId?:number):string|undefined {
 if(!isSchema275OrLater(world.schemaVersion))return 'Le réacteur stellaire exige le schéma 275.';
 const orientation=building.orientation??SHIP_REACTOR_PHYSICS_275.defaultOrientation;
 if(!Number.isInteger(building.x)||!Number.isInteger(building.z)||!Number.isInteger(orientation)||orientation<0||orientation>3)return 'Position ou orientation du réacteur invalide.';
 const candidate={...building,kind:'ship-reactor' as const,orientation},cells=shipReactorCells275(building,orientation);
 if(cells.some(c=>c.x<0||c.z<0||c.x>=world.width||c.z>=world.height))return 'Empreinte du réacteur hors de la carte.';
 if(cells.some(c=>foggedCell256(world,c.z*world.width+c.x)))return 'Toute l’empreinte du réacteur doit être découverte.';
 if(cells.some(c=>isRoofed(world,c.z*world.width+c.x)))return 'Le réacteur doit être construit sans toit sur ses 42 cases.';
 if(!marshSupportsFootprint(world,cells,candidate))return 'Le terrain doit porter une construction lourde sur les 42 cases.';
 const overlaps=(other:Parameters<typeof footprintCells>[0])=>footprintCells(other).some(c=>shipReactorContains275(building,c,orientation));
 if(world.structures.some(s=>sharesConstructionLayer(s.kind,candidate.kind)&&overlaps(s)))return 'Un ouvrage occupe déjà l’empreinte du réacteur.';
 if(world.jobs.some(j=>j.id!==ignoredJobId&&(j.kind==='install'||Object.hasOwn(STRUCTURE_DEFINITIONS,j.kind))&&sharesConstructionLayer(j.furniture?.kind??j.kind,candidate.kind)&&overlaps(j)))return 'Un plan ou cadre occupe déjà l’empreinte du réacteur.';
 if(world.resources.some(r=>r.kind==='rock'&&shipReactorContains275(building,r,orientation)))return 'Dégagez les roches de l’empreinte du réacteur.';
 if(world.pawns.some(p=>p.haul?.destination.type==='aside'&&shipReactorContains275(building,p.haul.destination,orientation)))return 'Une livraison réserve encore l’empreinte du réacteur.';
 return undefined;
}
