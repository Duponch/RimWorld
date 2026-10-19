import {ResidentMotionRecorder} from './resident-motion';
/// <reference lib="webworker" />
import {startSimulationWorker} from './simulation-runtime';
import {residentPublication} from './resident-protocol';
import {TerrainJournalSnapshotEncoder} from './terrain-journal-encoder';
import {WorkerNaturalAppearance} from './worker-natural-appearance';
import {ResidentAuxiliaryEncoder} from './resident-auxiliary-sections';
const scope=self as unknown as DedicatedWorkerGlobalScope;
const natural=new WorkerNaturalAppearance();
const auxiliary=new ResidentAuxiliaryEncoder();
startSimulationWorker(scope,message=>{
 if(message.type==='campaign-only'){natural.clear();auxiliary.clear();}
 scope.postMessage(residentPublication(message));
},new TerrainJournalSnapshotEncoder(),(world,publication)=>{
 // Natural observes the complete confirmed value before auxiliary capture
 // replaces both retained sections and ordered filth with private wire data.
 const appearance=natural.capture(world,publication),resident=auxiliary.capture(publication);
 scope.postMessage(residentPublication(resident.publication,appearance,resident.auxiliary));
},()=>new ResidentMotionRecorder());
