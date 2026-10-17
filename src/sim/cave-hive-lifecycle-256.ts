/** Actual reference cleanup, called only at a real DeSpawn/loss transition. */
import type {World} from './types.ts';
import type {WildAnimal} from './wildlife-state.ts';
import type {ActualHive256} from './cave-hive-state-256.ts';
export function detachHiveInsect256(w:World,a:WildAnimal):void {
 delete (a as import('./cave-hive-maintenance-256.ts').HiveMaintenanceActor256).hiveJob;
 const h=a.hive;if(!h)return;
 const spawner=w.structures.find((s):s is ActualHive256=>s.kind==='insect-hive'&&s.id===h.spawnerId);
 if(spawner)spawner.caveHive={...spawner.caveHive,spawnedPawnIds:spawner.caveHive.spawnedPawnIds.filter(id=>id!==a.id)};
 const lord=w.wildlife?.hiveLords?.find(l=>l.id===h.lordId);
 if(lord&&w.wildlife)w.wildlife.hiveLords=w.wildlife.hiveLords!.map(l=>l===lord?{...l,memberIds:l.memberIds.filter(id=>id!==a.id),assignedHives:l.assignedHives.filter(r=>r.pawnId!==a.id)}:l);
 h.lordId=null;h.spawnerId=null;
 // Faction belongs to the original Pawn, not to the map/Lord. Its original
 // remains in whichever real corpse/group/abandoned owner receives it.
}
/** The caller has already removed this actual Hive from the local structure
 * owner; no resource, actor, memory or allocator is fabricated here. */
export function notifyActualHiveRemoved256(w:World,hive:ActualHive256):void {
 if(w.structures.includes(hive))throw Error('Hive removal must precede reference cleanup');
 for(const a of w.wildlife?.animals??[])if(a.hive?.spawnerId===hive.id)a.hive.spawnerId=null;
 if(w.wildlife?.hiveLords)w.wildlife.hiveLords=w.wildlife.hiveLords.map(l=>({...l,assignedHives:l.assignedHives.filter(r=>r.hiveId!==hive.id)}));
 const insect=w.worldFactions?.factions.find(f=>f.def==='Insect')?.id;
 // HiveUtility.Notify_HiveDespawned: only actual Claimable GlowPods in the
 // radius are neutralized, and only after the final nearby Hive has gone.
 for(const s of w.structures)if(s.kind==='glow-pod'&&s.factionId===insect&&(s.x-hive.x)**2+(s.z-hive.z)**2<=4&&!w.structures.some(h=>h.kind==='insect-hive'&&(s.x-h.x)**2+(s.z-h.z)**2<=4))s.factionId=null;
}
export function detachHiveMapOwners256(w:World):void {for(const a of w.wildlife?.animals??[])detachHiveInsect256(w,a);if(w.wildlife)delete w.wildlife.hiveLords;}

export function tameHiveInsect256(w:World,a:WildAnimal):void {
 if(!a.hive)return;const id=w.worldFactions?.playerFactionId;if(!id)throw Error('Missing actual player faction for tamed insect');detachHiveInsect256(w,a);a.hive.factionId=id;
}
