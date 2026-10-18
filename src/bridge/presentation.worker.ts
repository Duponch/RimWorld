/// <reference lib="webworker" />
import {startSimulationWorker} from './simulation-runtime';
import {residentPublication} from './resident-protocol';
const scope=self as unknown as DedicatedWorkerGlobalScope;
startSimulationWorker(scope,message=>scope.postMessage(residentPublication(message)));
