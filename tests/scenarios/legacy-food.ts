/** Test fixtures imitating V1–V10 must omit fields those versions never stored. */
export function withoutPreservation<T extends { spoiled?: unknown; piles: Array<{ rot?: unknown }> }>(data: T): T {
  delete data.spoiled;
  for (const pile of data.piles) delete pile.rot;
  return data;
}
