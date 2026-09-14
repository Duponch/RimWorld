/** Historical fixtures omit fields that their claimed schema never stored. */
export function withoutSchedules<T extends {restRules?: unknown; pawns: Array<{schedule?: unknown; restZeroTicks?: unknown; collapsePending?: unknown}>}>(data: T): T {
  delete data.restRules;
  for (const pawn of data.pawns) { delete pawn.schedule; delete pawn.restZeroTicks; delete pawn.collapsePending; }
  return data;
}
export function withoutPostV10Fields<T extends {spoiled?: unknown; piles: Array<{rot?: unknown}>; pawns: Array<{schedule?: unknown; restZeroTicks?: unknown; collapsePending?: unknown}>}>(data: T): T {
  withoutSchedules(data); delete data.spoiled;
  for (const pile of data.piles) delete pile.rot;
  return data;
}
