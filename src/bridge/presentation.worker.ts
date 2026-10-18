/// <reference lib="webworker" />
import {startSimulationWorker} from './simulation-runtime';
import {residentPublication} from './resident-protocol';
import {TerrainJournalSnapshotEncoder} from './terrain-journal-encoder';
import {WorkerNaturalAppearance} from './worker-natural-appearance';
const scope=self as unknown as DedicatedWorkerGlobalScope;
const natural=new WorkerNaturalAppearance();
startSimulationWorker(scope,message=>{
 if(message.type==='campaign-only')natural.clear();
 scope.postMessage(residentPublication(message));
},new TerrainJournalSnapshotEncoder(),(world,publication)=>{
 scope.postMessage(residentPublication(publication,natural.capture(world,publication)));
});
