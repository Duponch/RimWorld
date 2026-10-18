import type {CDPSession} from '@playwright/test';

/** Types only for the retained V254 private JS controller. No runtime wrapper. */
export interface SourceProfilerIdentity {
 source:{targetInfo:{url:string;targetId:string;type:string};sessionId:string;live:boolean};
 workerIsolateId:string;mainIsolateId:string;clock:{now:number;timeOrigin:number};
}
export interface SourceProfilerReport {
 state:string;enabled:boolean;running:boolean;startRequested:boolean;stopRequested:boolean;debuggerEnabled:boolean;
 cleanupErrors:string[];identity?:SourceProfilerIdentity;
 tunnel:{state:string;pending:number;ownedSessions:string[];faults:unknown[];faultCount:number;mainProfilerStarted:boolean;[key:string]:unknown};
 [key:string]:unknown;
}
export interface SourceProfiler {
 attach():Promise<SourceProfilerIdentity>;
 beforeWindow():Promise<unknown>;
 start():Promise<unknown>;
 stop(window:{startAbsolute:number;endAbsolute:number}):Promise<Record<string,unknown>>;
 captureSources():Promise<unknown>;
 close():Promise<SourceProfilerReport>;
 report():SourceProfilerReport;
}
export function createSourceProfiler(pageSession:CDPSession,options:{origin:string;output:string;timeoutMs?:number}):SourceProfiler;
