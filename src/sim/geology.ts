/** Core natural stones. Ores, cut blocks and loose chunks are different content. */
export const STONE_KINDS = ['granite', 'limestone', 'marble', 'sandstone', 'slate'] as const;
export type StoneKind = typeof STONE_KINDS[number];
export const STONE_LABELS: Readonly<Record<StoneKind, string>> = Object.freeze({
  granite: 'Granite', limestone: 'Calcaire', marble: 'Marbre', sandstone: 'Grès', slate: 'Ardoise',
});
export const isStoneKind = (value: unknown): value is StoneKind => typeof value === 'string' && (STONE_KINDS as readonly string[]).includes(value);

/** Independent coordinate stream: geological samples never advance the game RNG. */
function sample(seed: number, x: number, z: number, layer: number): number {
  let n = seed ^ Math.imul(x, 0x1f123bb5) ^ Math.imul(z, 0x5f356495) ^ Math.imul(layer, 0x6c8e9cf5);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
function noise(seed: number, x: number, z: number, wavelength: number, layer: number): number {
  const gx = Math.floor(x / wavelength), gz = Math.floor(z / wavelength);
  const fx = x / wavelength - gx, fz = z / wavelength - gz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  const a = sample(seed, gx, gz, layer) * (1 - sx) + sample(seed, gx + 1, gz, layer) * sx;
  const b = sample(seed, gx, gz + 1, layer) * (1 - sx) + sample(seed, gx + 1, gz + 1, layer) * sx;
  return a * (1 - sz) + b * sz;
}
/** Local site preset until a world tile supplies its own stone list. */
export function siteStones(seed: number): StoneKind[] {
  const stones: StoneKind[] = [...STONE_KINDS];
  for (let i = stones.length - 1; i > 0; i--) {
    const j = Math.floor(sample(seed, i, 0, 901) * (i + 1));
    [stones[i], stones[j]] = [stones[j]!, stones[i]!];
  }
  return stones.slice(0, sample(seed, 0, 0, 903) < .5 ? 2 : 3);
}
/** Competing smooth fields form geological regions, independent of mountain silhouettes.
 * The returned function is generation-only; save files contain the resulting identities. */
export function geologicalField(seed: number, stones: readonly StoneKind[] = siteStones(seed)): (x: number, z: number) => StoneKind {
  return (x, z) => {
    let best = -Infinity, selected = stones[0]!;
    for (const stone of stones) {
      const layer = 911 + STONE_KINDS.indexOf(stone) * 2;
      const score = noise(seed, x, z, 80, layer) * .8 + noise(seed, x, z, 30, layer + 1) * .2;
      if (score > best) { best = score; selected = stone; }
    }
    return selected;
  };
}

/** Optional identity preserves untyped historic maps without assigning invented deposits. */
export function validStoneIdentity(value: unknown, kind: unknown, version: number): boolean {
  return value === undefined || version >= 27 && (kind === 'rock' || version >= 28 && kind === 'rough-stone') && isStoneKind(value);
}
