/// <reference lib="webworker" />
import {startSimulationWorker} from './simulation-runtime';
import {residentPublication} from './resident-protocol';
import {TerrainJournalSnapshotEncoder} from './terrain-journal-encoder';
const scope=self as unknown as DedicatedWorkerGlobalScope;
startSimulationWorker(scope,message=>scope.postMessage(residentPublication(message)),new TerrainJournalSnapshotEncoder());
