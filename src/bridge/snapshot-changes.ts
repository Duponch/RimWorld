// Read-only facade: keeping publication in the decoder module makes the
// accepted-World witness unforgeable through this API. No inverse runtime import.
export { readSnapshotChanges, sameSnapshotChangeDomain, type SnapshotChanges } from './snapshots.ts';
export { readSnapshotResourceStructure, type SnapshotResourceStructure,
  type SnapshotResourceStructureEdge, type SnapshotResourceRemoval,
  type SnapshotResourcePlacement } from './snapshots.ts';
