import type { Structure } from '../sim/types';
import type { Placement } from './primitives';

/** The retained turbine shader and the construction preview share this
 * local blade shape and hub transform. */
export const WIND_BLADE_SHAPE = { sx: .24, sy: 2.55, sz: .1, offsetY: 1.56 } as const;
export const WIND_BLADE_COLOR = 0xc4cbb6;

export function windBladeInitialPhase(id: number): number {
  return (id * .61803398875 % 1) * Math.PI * 2;
}

export function windBladeHub(s: Structure): Placement {
  const ry = s.orientation * Math.PI / 2;
  return { x: s.x + Math.sin(ry) * 1.15, y: 3.73, z: s.z + Math.cos(ry) * 1.15, ry };
}

/** CPU form of WindLayer's local XY shader rotation, used only for a static
 * construction model. It does not advance the retained presentation clock. */
export function windBladeParts(s: Structure, phase = windBladeInitialPhase(s.id)): Array<Placement & { rz: number }> {
  const hub = windBladeHub(s), ry = hub.ry!;
  return Array.from({ length: 3 }, (_, blade) => {
    const rz = phase + blade * Math.PI * 2 / 3;
    const localX = -Math.sin(rz) * WIND_BLADE_SHAPE.offsetY;
    return {
      x: hub.x + Math.cos(ry) * localX,
      y: hub.y + Math.cos(rz) * WIND_BLADE_SHAPE.offsetY,
      z: hub.z - Math.sin(ry) * localX,
      sx: WIND_BLADE_SHAPE.sx, sy: WIND_BLADE_SHAPE.sy, sz: WIND_BLADE_SHAPE.sz,
      ry, rz, color: WIND_BLADE_COLOR, key: s.id,
    };
  });
}
