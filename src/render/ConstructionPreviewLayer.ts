import * as THREE from 'three/webgpu';
import { BoxMesh, configureBoxMaterial } from './BoxMesh';
import { constructionPreviewParts, type ConstructionPreviewSpec } from './construction-preview-parts';
import { createTimberGeometry } from './TimberCladdingLayer';
import type { Placement } from './primitives';
import type { World } from '../sim/types';
import {EMPTY_GROUND_OVERLAYS,GROUND_OVERLAY_RENDER_ORDER,groundOverlayRect,type GroundOverlayRect} from './ground-overlay-surfaces';

const object = new THREE.Object3D(), color = new THREE.Color(), validTint = new THREE.Color(0x9de7c9), invalidTint = new THREE.Color(0xe46f58);
type PreviewPlacement = Placement & { rx?: number; rz?: number; tint?: number };

/** The authored construction models, allocated only when a placement changes.
 * One resident pipeline; no world writes, per-frame rebuilding or shadows. */
export class ConstructionPreviewLayer {
  readonly group = new THREE.Group();
  readonly material = new THREE.MeshBasicNodeMaterial({ transparent: true, opacity: .48, depthWrite: false, depthTest: false, vertexColors:true });
  /** Only real ground-height faces; furniture/roof models are not floor fills. */
  surfaces:readonly GroundOverlayRect[]=EMPTY_GROUND_OVERLAYS;
  private readonly bases = [new THREE.BoxGeometry(1, 1, 1), createTimberGeometry(false), createTimberGeometry(true), new THREE.BoxGeometry(1, 1, 1)];
  private readonly meshes: BoxMesh[];
  private revision = 0;
  private previousWorld:World|undefined;
  private previousSignature='';

  constructor() {
    configureBoxMaterial(this.material);
    this.group.name = 'Construction ghost preview';
    this.meshes = this.bases.map((base, i) => {
      const mesh = new BoxMesh(base, this.material, 32);
      if(base.hasAttribute('color'))mesh.geometry.setAttribute('color',base.getAttribute('color').clone());
      mesh.name = `construction-ghost-${i}`; mesh.renderOrder = GROUND_OVERLAY_RENDER_ORDER.ghost; mesh.activeCount = 0;
      this.group.add(mesh); return mesh;
    });
  }

  update(world: World, valid: readonly ConstructionPreviewSpec[], invalid: readonly ConstructionPreviewSpec[], cutaway: boolean): void {
    const signature=JSON.stringify([world.tick,cutaway,valid,invalid]);
    if(this.previousWorld===world&&this.previousSignature===signature)return;
    this.revision++;
    const context = [...valid, ...invalid];
    const good = constructionPreviewParts(world, valid, cutaway, context);
    const bad = constructionPreviewParts(world, invalid, cutaway, context);
    const goodArrays = [good.boxes, good.timberWalls, good.timberEaves, good.rotatedBoxes];
    const badArrays = [bad.boxes, bad.timberWalls, bad.timberEaves, bad.rotatedBoxes];
    const surfaces:GroundOverlayRect[]=[];
    const floorKeys=new Set(context.flatMap((spec,index)=>spec.kind==='lay-floor'?[spec.key??index]:[]));
    for (let index = 0; index < this.meshes.length; index++) {
      const mesh = this.meshes[index]!, goodParts = goodArrays[index]!, badParts = badArrays[index]!;
      const count = goodParts.length + badParts.length;
      if (count > mesh.instanceMatrix.count) {
        const base=this.bases[index]!;
        mesh.allocate(base, 2 ** Math.ceil(Math.log2(count)));
        if(base.hasAttribute('color'))mesh.geometry.setAttribute('color',base.getAttribute('color').clone());
      }
      mesh.activeCount = count;
      let ordinal = 0;
      const write = (parts: readonly PreviewPlacement[], valid: boolean): void => {
        for (const part of parts) {
          object.position.set(part.x, part.y, part.z);
          object.rotation.set(part.rx ?? 0, part.ry ?? 0, part.rz ?? 0);
          object.scale.set(part.sx ?? 1, part.sy ?? 1, part.sz ?? 1); object.updateMatrix();
          mesh.setMatrixAt(ordinal, object.matrix);
          color.setHex(part.color ?? 0xffffff).multiplyScalar(part.tint ?? 1).lerp(valid ? validTint : invalidTint, valid ? .35 : .8);
          mesh.setColorAt(ordinal++, color);
          if(index===0&&floorKeys.has(part.key!)){
            const x=Math.fround(part.x),z=Math.fround(part.z),sx=Math.fround(part.sx??1),sz=Math.fround(part.sz??1);
            surfaces.push(groundOverlayRect(x-sx/2,z-sz/2,x+sx/2,z+sz/2,color,this.material.opacity));
          }
        }
      };
      write(goodParts, true); write(badParts, false);
      mesh.instanceMatrix.needsUpdate = true; mesh.colorBuffer.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
    this.surfaces=surfaces.length?surfaces:EMPTY_GROUND_OVERLAYS;
    this.previousWorld=world;this.previousSignature=signature;
  }

  hide(): void { this.surfaces=EMPTY_GROUND_OVERLAYS;this.revision++;this.previousWorld=undefined;this.previousSignature=''; for (const mesh of this.meshes) mesh.activeCount = 0; }

  prepareForCompile(): () => void {
    const revision = this.revision;
    const snapshots = this.meshes.map(mesh => {
      const state = { mesh, geometry: mesh.geometry, count: mesh.activeCount, visible: mesh.visible, culled: mesh.frustumCulled,
        sphere: mesh.boundingSphere.clone(), matrix: mesh.instanceMatrix.array.slice(0, 16), color: mesh.colorBuffer.array.slice(0, 3) };
      if (!mesh.activeCount) {
        object.position.set(0, -100, 0); object.rotation.set(0, 0, 0); object.scale.set(0, 0, 0); object.updateMatrix();
        mesh.setMatrixAt(0, object.matrix); mesh.setColorAt(0, color.setHex(0xffffff)); mesh.activeCount = 1;
        mesh.instanceMatrix.needsUpdate = true; mesh.colorBuffer.needsUpdate = true; mesh.computeBoundingSphere();
      }
      mesh.visible = true; mesh.frustumCulled = false; return state;
    });
    return () => {
      for (const state of snapshots) {
        const { mesh } = state; mesh.frustumCulled = state.culled;
        if (this.revision !== revision || mesh.geometry !== state.geometry) continue;
        mesh.instanceMatrix.array.set(state.matrix, 0); mesh.colorBuffer.array.set(state.color, 0);
        mesh.instanceMatrix.needsUpdate = true; mesh.colorBuffer.needsUpdate = true;
        mesh.activeCount = state.count; mesh.visible = state.visible; mesh.boundingSphere.copy(state.sphere);
      }
    };
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const mesh of this.meshes) mesh.dispose();
    for (const base of this.bases) base.dispose();
    this.material.dispose();
  }
}
