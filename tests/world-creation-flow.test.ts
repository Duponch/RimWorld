import {expect,test,vi} from 'vitest';
import {createWorldCreationFlow256} from '../src/ui/world-creation-flow';
import {defaultWorldGenerationSettings} from '../src/sim/world-generation-settings';
import type {WorldCreationCallbacks256,WorldCreationPreview256,WorldCreationRequest256} from '../src/ui/world-creation-contract';
const request=()=>({seed:'  graine🪐  ',settings:defaultWorldGenerationSettings(),player:{scenario:'crashlanded',playerDef:'PlayerColony' as const,playerName:'Équipe du départ'}});
test('no confirmed draft means confirm/start never call the worker backend',async()=>{
 const backend:WorldCreationCallbacks256={generate:vi.fn(),confirmSite:vi.fn(),start:vi.fn()},flow=createWorldCreationFlow256(backend);
 await expect(flow.confirmSite(0)).rejects.toThrow();await expect(flow.start({} as never)).rejects.toThrow();expect(backend.confirmSite).not.toHaveBeenCalled();expect(backend.start).not.toHaveBeenCalled();
});
test('cancel aborts real generation context and ignores late progress/result without adopting anything',async()=>{
 let resolve!:(value:WorldCreationPreview256)=>void,context!:Parameters<WorldCreationCallbacks256['generate']>[1];const generate=vi.fn((_request:WorldCreationRequest256,received:Parameters<WorldCreationCallbacks256['generate']>[1])=>{context=received;return new Promise<WorldCreationPreview256>(r=>resolve=r);});
 const flow=createWorldCreationFlow256({generate,confirmSite:vi.fn(),start:vi.fn()}),progress=vi.fn(),pending=flow.generate(request(),progress);flow.cancel();expect(context.signal.aborted).toBe(true);context.onProgress({phase:'terrain',completed:1,total:2});resolve(undefined as never);
 await expect(pending).rejects.toHaveProperty('name','AbortError');expect(progress).not.toHaveBeenCalled();expect(flow.preview).toBeUndefined();expect(flow.ticket).toBeUndefined();expect(generate.mock.calls[0]![0].seed).toBe('  graine🪐  ');expect(generate.mock.calls[0]![0].player.playerName).toBe('Équipe du départ');
});
test('a replaced generation cannot clear the new operation or forward its stale callbacks',async()=>{
 const contexts:Parameters<WorldCreationCallbacks256['generate']>[1][]=[],resolves:((value:WorldCreationPreview256)=>void)[]=[];
 const flow=createWorldCreationFlow256({generate:(_request,context)=>{contexts.push(context);return new Promise(r=>resolves.push(r));},confirmSite:vi.fn(),start:vi.fn()}),firstProgress=vi.fn(),secondProgress=vi.fn();
 const first=flow.generate(request(),firstProgress),second=flow.generate({...request(),seed:'autre'},secondProgress);contexts[0]!.onProgress({phase:'rivers',completed:1,total:1});contexts[1]!.onProgress({phase:'mesh',completed:0,total:1});expect(contexts[0]!.signal.aborted).toBe(true);expect(firstProgress).not.toHaveBeenCalled();expect(secondProgress).toHaveBeenCalledOnce();resolves[0]!(undefined as never);await expect(first).rejects.toHaveProperty('name','AbortError');flow.cancel();resolves[1]!(undefined as never);await expect(second).rejects.toHaveProperty('name','AbortError');expect(flow.preview).toBeUndefined();
});
